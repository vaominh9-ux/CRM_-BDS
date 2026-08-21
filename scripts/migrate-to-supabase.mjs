import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourcePath = path.resolve(root, process.env.CRM_SOURCE_FILE || './data/local-crm-data.json');
const defaultPassword = process.env.MIGRATION_DEFAULT_PASSWORD;
if (!url || !serviceKey) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.supabase.local');
if (!fs.existsSync(sourcePath)) throw new Error(`Không tìm thấy dữ liệu nguồn: ${sourcePath}`);

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const sheets = source.sheets || {};
const corrections = [];
const counts = {};
const userIds = new Map();
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
const num = (v) => v === null || v === undefined || v === '' ? null : Number(v);
const vnd = (v) => v === null || v === undefined || v === '' ? null : Math.round(Number(v));
const bool = (v) => v === true || v === 1 || v === '1';
const json = (v, fallback = {}) => {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || ''); } catch { return fallback; }
};
const userId = (username) => username ? userIds.get(String(username)) || null : null;

async function request(endpoint, options = {}) {
  const response = await fetch(`${url}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: ${response.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

async function upsert(table, rows, onConflict = 'id') {
  if (!rows?.length) return [];
  const query = new URLSearchParams({ on_conflict: onConflict });
  const result = await request(`/rest/v1/${table}?${query}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows)
  });
  counts[table] = (counts[table] || 0) + rows.length;
  return result;
}

async function listAuthUsers() {
  const result = [];
  for (let page = 1; ; page += 1) {
    const body = await request(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    const users = body?.users || [];
    result.push(...users);
    if (users.length < 1000) return result;
  }
}

async function migrateUsers() {
  const existing = await listAuthUsers();
  const byEmail = new Map(existing.map((u) => [String(u.email).toLowerCase(), u]));
  for (const old of source.users || []) {
    const email = String(old.Email || '').trim().toLowerCase();
    let authUser = byEmail.get(email);
    if (!authUser) {
      if (!defaultPassword || defaultPassword.length < 12) {
        throw new Error('Cần MIGRATION_DEFAULT_PASSWORD tối thiểu 12 ký tự để tạo tài khoản staging; không tự động sao chép mật khẩu cũ.');
      }
      authUser = await request('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password: defaultPassword, email_confirm: true, user_metadata: { username: old.Username, requires_password_change: true } })
      });
      byEmail.set(email, authUser);
    }
    userIds.set(String(old.Username), authUser.id);
  }

  await upsert('profiles', (source.users || []).map((old) => ({
    id: userId(old.Username), username: old.Username, email: String(old.Email).toLowerCase(),
    role_key: old.Role, status: old.Status, profile_image: old.ProfileImage || null,
    theme_mode: String(old.ThemeMode || 'light').toLowerCase() === 'dark' ? 'dark' : 'light',
    custom_colors: json(old.CustomColors, {}), monthly_target_vnd: vnd(old.MonthlyTarget) || 0,
    created_at: old.CreatedAt || new Date().toISOString(), created_by: userId(old.CreatedBy),
    updated_at: old.UpdatedAt || old.CreatedAt || new Date().toISOString(), updated_by: userId(old.UpdatedBy)
  })));
}

async function migrateRoles() {
  const rows = source.roles || [];
  await upsert('roles', rows.map((r) => ({ role_key: r.role_key, label: r.label, color: r.color, sort_order: Number(r.sort_order || 0), is_super: bool(r.is_super), hidden_signup: bool(r.hidden_signup) })), 'role_key');
  const permissions = [];
  for (const role of rows) for (const [page, p] of Object.entries(json(role.permissions, {}))) permissions.push({
    role_key: role.role_key, page_key: page, can_view: bool(p.v), can_add: bool(p.a), can_edit: bool(p.e), can_delete: bool(p.d)
  });
  await upsert('role_permissions', permissions, 'role_key,page_key');
}

async function migrateCatalogs() {
  const locationRank = { City: 1, Area: 2, Society: 3 };
  const locationRows = [...(sheets.Locations || [])].sort((a, b) => locationRank[a.level] - locationRank[b.level]);
  for (const level of ['City', 'Area', 'Society']) await upsert('locations', locationRows.filter((r) => r.level === level).map((r) => ({
    id: r.id, name: r.name, level: r.level, parent_id: num(r.parentId), slug: r.slug,
    created_at: r.created, updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
  await upsert('amenities', (sheets.Amenities || []).map((r) => ({ id: r.id, name: r.name, icon: r.icon || null, created_at: r.created, updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null })));
  await upsert('owners', (sheets.Owners || []).map((r) => ({
    id: r.id, name: r.name, phone: r.phone, email: r.email || null, identity_number: r.cnic || null, address: r.address || null, notes: r.notes || null,
    created_at: r.created, created_by: userId(r.createdBy), updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
}

async function migrateProperties() {
  const ownerByPhone = new Map((sheets.Owners || []).map((r) => [String(r.phone), r.id]));
  await upsert('properties', (sheets.Properties || []).map((r) => ({
    id: r.id, reference_code: r.referenceCode, title: r.title, slug: r.slug, description: r.description || null,
    property_type: r.propertyType, listing_type: r.listingType, status: r.status, price_vnd: vnd(r.price) || 0,
    rent_frequency: r.listingType === 'Rent' ? r.rentFrequency || 'Monthly' : null,
    area_size: num(r.areaSize), area_unit: 'm²', bedrooms: num(r.bedrooms), bathrooms: num(r.bathrooms), location_id: num(r.locationId),
    address: r.address || null, latitude: num(r.latitude), longitude: num(r.longitude), owner_id: ownerByPhone.get(String(r.ownerPhone)) || null,
    owner_name_snapshot: r.ownerName || null, owner_phone_snapshot: r.ownerPhone || null, assigned_agent_id: userId(r.assignedAgent),
    is_featured: bool(r.isFeatured), views_count: Number(r.viewsCount || 0), published_at: r.publishedAt || null,
    created_at: r.created, created_by: userId(r.createdBy), updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
  await upsert('property_amenities', (sheets.Properties || []).flatMap((r) => (r.amenityIds || []).map((amenityId) => ({ property_id: r.id, amenity_id: amenityId }))), 'property_id,amenity_id');
  await upsert('property_images', (sheets.Properties || []).flatMap((r) => (r.images || []).map((img, index) => ({ id: r.id * 100000 + index + 1, property_id: r.id, storage_path: img.url || img.storagePath, sort_order: Number(img.sortOrder ?? index), created_by: userId(r.createdBy) }))));
  await upsert('property_documents', (sheets.Properties || []).flatMap((r) => (r.documents || []).map((doc, index) => ({ id: r.id * 100000 + index + 1, property_id: r.id, file_name: doc.name || doc.fileName || 'Tài liệu', storage_path: doc.url || doc.storagePath, created_at: doc.created || r.created, created_by: userId(doc.addedBy || r.createdBy) }))));
  await upsert('property_expenses', (sheets.Properties || []).flatMap((r) => (r.expenses || []).map((e, index) => ({ id: r.id * 100000 + index + 1, property_id: r.id, expense_date: e.date, category: e.category, amount_vnd: vnd(e.amount), notes: e.notes || null, created_by: userId(e.addedBy || r.createdBy) }))));
}

async function migrateCrm() {
  await upsert('leads', (sheets.Leads || []).map((r) => ({
    id: r.id, full_name: r.fullName, phone: r.phone, email: r.email || null, source: r.source, interest_type: r.interestType,
    property_id: num(r.propertyId), preferred_location_id: num(r.preferredLocationId), budget_min_vnd: vnd(r.budgetMin), budget_max_vnd: vnd(r.budgetMax),
    message: r.message || null, status: r.status, lost_reason: r.lostReason || null, assigned_agent_id: userId(r.assignedAgent),
    created_at: r.created, created_by: userId(r.createdBy), updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
  await upsert('follow_ups', (sheets.FollowUps || []).map((r) => ({
    id: r.id, lead_id: r.leadId, assigned_agent_id: userId(r.assignedAgent), type: r.type, notes: r.notes || null, due_at: r.dueAt || null,
    status: r.status, completed_at: r.completedAt || null, reminder_sent_at: r.reminderSent ? r.updated || r.created : null,
    created_at: r.created, created_by: userId(r.createdBy), updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
  await upsert('appointments', (sheets.Appointments || []).map((r) => ({
    id: r.id, lead_id: r.leadId, property_id: r.propertyId, agent_id: userId(r.agent), scheduled_at: r.scheduledAt,
    duration_minutes: Number(r.durationMinutes || 30), status: r.status, notes: r.notes || null, cancellation_reason: r.cancellationReason || null,
    reminder_sent_at: r.reminderSent ? r.updated || r.created : null, interest_level: r.interestLevel || null, feedback: r.feedback || null,
    created_at: r.created, created_by: userId(r.createdBy), updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
}

async function migrateMoney() {
  await upsert('deals', (sheets.Deals || []).map((r) => ({
    id: r.id, deal_type: r.dealType, property_id: r.propertyId, lead_id: num(r.leadId), buyer_name: r.buyerName, buyer_phone: r.buyerPhone,
    agent_id: userId(r.agent), deal_amount_vnd: vnd(r.dealAmount), commission_pct: Number(r.commissionPct || 0), agent_share_pct: Number(r.agentSharePct || 0),
    agent_paid_at: r.agentPaidAt || null, token_amount_vnd: vnd(r.tokenAmount) || 0, status: r.status, closed_at: r.closedAt || null,
    cancellation_reason: r.cancellationReason || null, notes: r.notes || null, created_at: r.created, created_by: userId(r.createdBy),
    updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
  await upsert('deal_payments', (sheets.Deals || []).flatMap((r) => (r.payments || []).map((p, index) => ({
    id: r.id * 100000 + index + 1, deal_id: r.id, paid_at: p.date || r.created, amount_vnd: vnd(p.amount), method: p.method || 'Cash', reference: p.ref || null,
    notes: p.notes || null, received_by: userId(p.receivedBy || r.createdBy), created_at: p.date || r.created
  }))));

  await upsert('tenancies', (sheets.Tenancies || []).map((r) => ({
    id: r.id, property_id: r.propertyId, deal_id: num(r.dealId), tenant_name: r.tenantName, tenant_phone: r.tenantPhone,
    monthly_rent_vnd: vnd(r.monthlyRent), security_deposit_vnd: vnd(r.securityDeposit) || 0, start_date: r.startDate, end_date: r.endDate || null,
    rent_due_day: Number(r.rentDueDay || 5), status: r.status, notes: r.notes || null, created_at: r.created,
    created_by: userId(r.createdBy), updated_at: r.updated || r.created, deleted_at: r.deleted ? r.updated || r.created : null
  })));
  await upsert('rent_payments', (sheets.Tenancies || []).flatMap((r) => (r.rentLog || []).map((p, index) => ({
    id: r.id * 100000 + index + 1, tenancy_id: r.id, rent_month: `${p.month}-01`, amount_vnd: vnd(p.amount), paid_at: p.paidAt || r.created,
    method: p.method || 'Cash', reference: p.ref || null, received_by: userId(p.receivedBy || r.createdBy)
  }))));

  const factor = Number(source.meta?.pkrToVnd || 1);
  const renewalRows = [];
  for (const r of sheets.Tenancies || []) for (const [index, renewal] of (r.renewals || []).entries()) {
    let oldRent = Number(renewal.oldRent || 0), newRent = Number(renewal.newRent || 0);
    if (factor > 1 && newRent > 0 && Number(r.monthlyRent) / newRent > 10) {
      corrections.push({ tenancyId: r.id, field: 'renewals', reason: `Đổi ${source.meta?.sourceCurrency || 'đơn vị cũ'} sang VND`, oldRent, newRent, factor });
      oldRent *= factor; newRent *= factor;
    }
    renewalRows.push({ id: r.id * 100000 + index + 1, tenancy_id: r.id, renewed_at: renewal.date || r.created, old_rent_vnd: vnd(oldRent), new_rent_vnd: vnd(newRent), new_end_date: renewal.newEndDate || null, notes: renewal.notes || null, created_by: userId(renewal.byUser || r.createdBy) });
  }
  await upsert('tenancy_renewals', renewalRows);
  await upsert('maintenance_items', (sheets.Tenancies || []).flatMap((r) => (r.maintenance || []).map((m, index) => ({
    id: r.id * 100000 + index + 1, tenancy_id: r.id, issue_date: m.date, issue: m.issue, status: m.status, cost_vnd: vnd(m.cost) || 0,
    fixed_at: m.fixedAt || null, created_by: userId(m.addedBy || r.createdBy), created_at: `${m.date}T00:00:00Z`
  }))));
  await upsert('deposit_refunds', (sheets.Tenancies || []).filter((r) => r.depositRefund).map((r) => ({
    tenancy_id: r.id, deposit_vnd: vnd(r.securityDeposit) || 0, deductions_vnd: vnd(r.depositRefund.deductions) || 0,
    notes: r.depositRefund.notes || null, refunded_at: r.depositRefund.refundedAt || r.updated || r.created, refunded_by: userId(r.createdBy)
  })), 'tenancy_id');
  await upsert('activity_logs', (sheets.Logs || []).map((r) => ({
    id: r.id, actor_id: userId(r.user), actor_username: r.user || 'system', action: r.action, details: r.details || null,
    changes: r.changes || [], created_at: r.created
  })));
}

await migrateRoles();
await migrateUsers();
await migrateCatalogs();
await migrateProperties();
await migrateCrm();
await migrateMoney();

const report = { migratedAt: new Date().toISOString(), source: path.relative(root, sourcePath), counts, corrections };
const reportPath = path.join(root, 'outputs', 'supabase-migration-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
