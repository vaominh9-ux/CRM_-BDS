const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const IMAGE_BUCKET = 'property-images';
const enabled = Boolean(SUPABASE_URL && PUBLISHABLE_KEY && SERVICE_KEY);
const ok = (data = {}) => ({ success: true, ...data });
const fail = (message) => ({ success: false, message });
const DEFAULT_AGENCY_BRANDING = Object.freeze({
  name: '',
  logo: '',
  phone: '',
  address: '',
  slogan: ''
});

async function request(path, { method = 'GET', body, jwt, admin = false, headers: extraHeaders = {} } = {}) {
  const key = admin ? SERVICE_KEY : PUBLISHABLE_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json', ...extraHeaders };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  else if (admin) headers.Authorization = `Bearer ${SERVICE_KEY}`;
  const response = await fetch(`${SUPABASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload && (payload.message || payload.msg || payload.error_description || payload.error) || `Supabase HTTP ${response.status}`;
    const error = new Error(message); error.status = response.status; throw error;
  }
  return payload;
}

const enc = (value) => encodeURIComponent(String(value));
const select = (table, columns, jwt, extra = '') => request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, { jwt });
const adminSelect = (table, columns, extra = '') => request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, { admin:true });
async function selectAll(table, columns, jwt, extra = '') {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const page = await request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, {
      jwt,
      headers: { Range: `${start}-${start + pageSize - 1}` }
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
async function adminSelectAll(table, columns, extra = '') {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const page = await request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, {
      admin: true,
      headers: { Range: `${start}-${start + pageSize - 1}` }
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function jwtSubject(jwt) {
  try {
    const part = String(jwt || '').split('.')[1];
    return part ? JSON.parse(Buffer.from(part, 'base64url').toString('utf8')).sub || '' : '';
  } catch { return ''; }
}

async function currentProfile(jwt) {
  const subject = jwtSubject(jwt);
  if (!subject) throw new Error('Phiên đăng nhập Supabase không hợp lệ');
  const rows = await select('profiles','id,username,email,role_key,status,profile_image,theme_mode,custom_colors,monthly_target_vnd',jwt,`&id=eq.${enc(subject)}&limit=1`);
  if (!rows.length || rows[0].status !== 'Active') throw new Error('Tài khoản không hoạt động');
  return rows[0];
}

async function permissionsFor(roleKey,jwt) {
  const rows = await select('role_permissions','page_key,can_view,can_add,can_edit,can_delete',jwt,`&role_key=eq.${enc(roleKey)}`);
  return Object.fromEntries(rows.map((r) => [r.page_key,{v:r.can_view?1:0,a:r.can_add?1:0,e:r.can_edit?1:0,d:r.can_delete?1:0}]));
}

async function authenticateUser(args) {
  const [login,password] = args;
  let email = String(login || '').trim().toLowerCase();
  if (!email.includes('@')) {
    const rows = await adminSelect('profiles','email,status',`&username=eq.${enc(email)}&limit=1`);
    if (!rows.length) return fail('Không tìm thấy tên đăng nhập');
    if (rows[0].status !== 'Active') return fail('Tài khoản này đã bị ngừng hoạt động. Vui lòng liên hệ Quản trị viên.');
    email = rows[0].email;
  }
  let auth;
  try { auth = await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}); }
  catch (error) { return fail(error.status === 400 ? 'Tên đăng nhập hoặc mật khẩu không đúng' : error.message); }
  let p, perms;
  try {
    p = await currentProfile(auth.access_token);
    perms = await permissionsFor(p.role_key,auth.access_token);
  } catch (err) {
    return fail(err.message === 'Tài khoản không hoạt động' ? 'Tài khoản này đã bị ngừng hoạt động. Vui lòng liên hệ Quản trị viên.' : err.message);
  }
  return ok({username:p.username,email:p.email,role:p.role_key,profileImage:p.profile_image||'',themeMode:p.theme_mode||'light',
    customColors:JSON.stringify(p.custom_colors||{}),permissions:perms,canEditRbac:p.role_key==='Admin',
    authSession:{accessToken:auth.access_token,refreshToken:auth.refresh_token,expiresAt:Date.now()+Number(auth.expires_in||3600)*1000}});
}
async function refreshAuthSession(args) {
  const refreshToken = String(args[0] || '').trim();
  if (!refreshToken) return fail('Phiên đăng nhập đã hết hạn');
  let auth;
  try { auth = await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refreshToken}}); }
  catch (error) { return fail('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'); }
  return ok({authSession:{accessToken:auth.access_token,refreshToken:auth.refresh_token||refreshToken,expiresAt:Date.now()+Number(auth.expires_in||3600)*1000}});
}

const mapProperty = (r) => ({id:r.id,referenceCode:r.reference_code,title:r.title,slug:r.slug,description:r.description||'',propertyType:r.property_type,
  listingType:r.listing_type,status:r.status,price:Number(r.price_vnd||0),rentFrequency:r.rent_frequency||'',areaSize:Number(r.area_size||0),areaUnit:r.area_unit||'m²',
  bedrooms:r.bedrooms,bathrooms:r.bathrooms,locationId:r.location_id,address:r.address||'',latitude:r.latitude,longitude:r.longitude,
  ownerName:r.owner_name_snapshot||'',ownerPhone:r.owner_phone_snapshot||'',assignedAgent:r.profiles?.username||'',isFeatured:r.is_featured?1:0,
  viewsCount:Number(r.views_count||0),publishedAt:r.published_at,created:r.created_at,updated:r.updated_at});
const mapLead = (r) => ({id:r.id,fullName:r.full_name,phone:r.phone,email:r.email||'',source:r.source,interestType:r.interest_type,propertyId:r.property_id,
  preferredLocationId:r.preferred_location_id,budgetMin:r.budget_min_vnd===null?null:Number(r.budget_min_vnd),budgetMax:r.budget_max_vnd===null?null:Number(r.budget_max_vnd),
  message:r.message||'',status:r.status,lostReason:r.lost_reason||'',assignedAgent:r.profiles?.username||'',created:r.created_at,updated:r.updated_at});

async function getProperties(jwt){
  const [rows,images,links]=await Promise.all([
    select('properties','*,profiles!properties_assigned_agent_id_fkey(username)',jwt,'&deleted_at=is.null&order=created_at.desc'),
    select('property_images','id,property_id,storage_path,sort_order',jwt,'&order=sort_order.asc'),
    select('property_amenities','property_id,amenity_id',jwt)
  ]);
  const imagesBy=new Map(),amenitiesBy=new Map();
  images.forEach(image=>{const list=imagesBy.get(Number(image.property_id))||[];list.push({id:image.id,url:image.storage_path,isPrimary:list.length===0?1:0,sortOrder:Number(image.sort_order||0)});imagesBy.set(Number(image.property_id),list);});
  links.forEach(link=>{const list=amenitiesBy.get(Number(link.property_id))||[];list.push(Number(link.amenity_id));amenitiesBy.set(Number(link.property_id),list);});
  return ok({data:rows.map(row=>({...mapProperty(row),ownerId:row.owner_id,images:imagesBy.get(Number(row.id))||[],amenityIds:amenitiesBy.get(Number(row.id))||[]}))});
}
async function getLeads(jwt){const rows=await select('leads','*,profiles!leads_assigned_agent_id_fkey(username)',jwt,'&deleted_at=is.null&order=created_at.desc');return ok({data:rows.map(mapLead)});}
async function getLocations(jwt){
  await currentProfile(jwt);
  const [rows, properties] = await Promise.all([
    adminSelectAll('locations','*','&deleted_at=is.null&order=id.asc'),
    select('properties','id,location_id',jwt,'&deleted_at=is.null')
  ]);
  const propCountMap = new Map();
  (properties || []).forEach(p => {
    if (p.location_id) {
      propCountMap.set(Number(p.location_id), (propCountMap.get(Number(p.location_id)) || 0) + 1);
    }
  });
  const locMap = new Map(rows.map(r => [Number(r.id), r]));
  const getPath = (id) => {
    const out = [], seen = new Set();
    let cur = locMap.get(Number(id));
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (cur.name) out.unshift(cur.name);
      cur = locMap.get(Number(cur.parent_id));
    }
    return out.join(' › ');
  };
  return ok({data:rows.map(r=>({
    id:r.id,
    name:r.name,
    level:r.level,
    parentId:r.parent_id,
    path:getPath(r.id),
    fullPath:getPath(r.id),
    slug:r.slug,
    propertyCount:propCountMap.get(Number(r.id)) || 0,
    created:r.created_at,
    updated:r.updated_at
  }))});
}
async function getAmenities(jwt){
  const [rows, propertyAmenities] = await Promise.all([
    select('amenities','*',jwt,'&deleted_at=is.null&order=name.asc'),
    select('property_amenities','property_id,amenity_id',jwt)
  ]);
  const countMap = new Map();
  (propertyAmenities || []).forEach(pa => {
    if (pa.amenity_id) {
      countMap.set(Number(pa.amenity_id), (countMap.get(Number(pa.amenity_id)) || 0) + 1);
    }
  });
  return ok({data:rows.map(r=>({
    id:r.id,
    name:r.name,
    icon:r.icon||'',
    propertyCount:countMap.get(Number(r.id)) || 0,
    created:r.created_at,
    updated:r.updated_at
  }))});
}
async function getOwners(jwt){
  const [rows,properties,deals]=await Promise.all([
    select('owners','*',jwt,'&deleted_at=is.null&order=created_at.desc'),
    select('properties','id,owner_id,owner_phone_snapshot',jwt,'&deleted_at=is.null'),
    select('deals','id,property_id,deal_amount_vnd,status',jwt,'&deleted_at=is.null&status=eq.Completed')
  ]);
  const phoneToOwnerId=new Map();
  rows.forEach(o=>{if(o.phone)phoneToOwnerId.set(String(o.phone).trim(),Number(o.id));});
  const propsByOwner=new Map(),propOwner=new Map();
  (properties||[]).forEach(p=>{
    const oid=p.owner_id?Number(p.owner_id):(p.owner_phone_snapshot?phoneToOwnerId.get(String(p.owner_phone_snapshot).trim()):null);
    if(oid){
      const list=propsByOwner.get(oid)||[];
      list.push(p);
      propsByOwner.set(oid,list);
      propOwner.set(Number(p.id),oid);
    }
  });
  const dealVal=new Map();
  (deals||[]).forEach(d=>{
    const oid=propOwner.get(Number(d.property_id));
    if(oid)dealVal.set(oid,(dealVal.get(oid)||0)+Number(d.deal_amount_vnd||0));
  });
  return ok({data:rows.map(r=>({
    id:r.id,
    name:r.name,
    phone:r.phone,
    email:r.email||'',
    cnic:r.identity_number||'',
    address:r.address||'',
    notes:r.notes||'',
    created:r.created_at,
    updated:r.updated_at,
    propertyCount:(propsByOwner.get(Number(r.id))||[]).length,
    totalBusiness:dealVal.get(Number(r.id))||0
  }))});
}
async function getAllUsers(jwt){const rows=await select('profiles','*',jwt,'&order=created_at.desc');return ok({data:rows.map(r=>({Username:r.username,Email:r.email,Role:r.role_key,Status:r.status,ProfileImage:r.profile_image||'',ThemeMode:r.theme_mode||'light',CustomColors:JSON.stringify(r.custom_colors||{}),CreatedAt:r.created_at,MonthlyTarget:Number(r.monthly_target_vnd||0)}))});}
async function getFollowUps(jwt){const rows=await select('follow_ups','*,profiles!follow_ups_assigned_agent_id_fkey(username),leads(full_name,phone)',jwt,'&deleted_at=is.null&order=created_at.desc');return ok({data:rows.map(r=>({id:r.id,leadId:r.lead_id,assignedAgent:r.profiles?.username||'',type:r.type,notes:r.notes||'',dueAt:r.due_at,status:r.status,completedAt:r.completed_at,reminderSent:r.reminder_sent_at?1:0,leadName:r.leads?.full_name||'',leadPhone:r.leads?.phone||'',created:r.created_at,updated:r.updated_at}))});}
async function getAppointments(jwt){const rows=await select('appointments','*,profiles!appointments_agent_id_fkey(username),leads(full_name,phone),properties(title,reference_code)',jwt,'&deleted_at=is.null&order=scheduled_at.desc');return ok({data:rows.map(r=>({id:r.id,leadId:r.lead_id,propertyId:r.property_id,agent:r.profiles?.username||'',scheduledAt:r.scheduled_at,durationMinutes:r.duration_minutes,status:r.status,notes:r.notes||'',cancellationReason:r.cancellation_reason||'',reminderSent:r.reminder_sent_at?1:0,interestLevel:r.interest_level,feedback:r.feedback||'',leadName:r.leads?.full_name||'',leadPhone:r.leads?.phone||'',propertyTitle:r.properties?.title||'',propertyRef:r.properties?.reference_code||'',created:r.created_at,updated:r.updated_at}))});}
async function getDeals(jwt){const [rows,payments]=await Promise.all([select('deal_financials','*,profiles!deals_agent_id_fkey(username),properties(title,reference_code)',jwt,'&deleted_at=is.null&order=created_at.desc'),select('deal_payments','*,profiles!deal_payments_received_by_fkey(username)',jwt,'&order=paid_at.desc')]);const by=new Map();payments.forEach(x=>{const list=by.get(Number(x.deal_id))||[];list.push({id:x.id,date:x.paid_at,amount:Number(x.amount_vnd||0),method:x.method,reference:x.reference||'',notes:x.notes||'',receivedBy:x.profiles?.username||''});by.set(Number(x.deal_id),list);});return ok({data:rows.map(r=>({id:r.id,dealType:r.deal_type,propertyId:r.property_id,leadId:r.lead_id,buyerName:r.buyer_name,buyerPhone:r.buyer_phone,agent:r.profiles?.username||'',dealAmount:Number(r.deal_amount_vnd||0),commissionPct:Number(r.commission_pct||0),commissionAmt:Number(r.commission_amount_vnd||0),agentSharePct:Number(r.agent_share_pct||0),agentShareAmt:Number(r.agent_share_amount_vnd||0),agentPaidAt:r.agent_paid_at,tokenAmount:Number(r.token_amount_vnd||0),status:r.status,closedAt:r.closed_at,cancellationReason:r.cancellation_reason||'',notes:r.notes||'',payments:by.get(Number(r.id))||[],paid:Number(r.paid_vnd||0),balance:Number(r.balance_vnd||0),propertyTitle:r.properties?.title||'',propertyRef:r.properties?.reference_code||'',created:r.created_at,updated:r.updated_at}))});}
async function getTenancies(jwt){
  const [rows,payments,renewals,maintenance,refunds]=await Promise.all([
    select('tenancy_financials','*,properties(title,reference_code,profiles!properties_assigned_agent_id_fkey(username))',jwt,'&deleted_at=is.null&order=created_at.desc'),
    select('rent_payments','*,profiles!rent_payments_received_by_fkey(username)',jwt,'&order=paid_at.desc'),
    select('tenancy_renewals','*,profiles!tenancy_renewals_created_by_fkey(username)',jwt,'&order=renewed_at.desc'),
    select('maintenance_items','*,profiles!maintenance_items_created_by_fkey(username)',jwt,'&order=issue_date.desc'),
    select('deposit_refunds','*',jwt)
  ]);
  const by=(items,key)=>{const map=new Map();items.forEach(item=>{const list=map.get(Number(item[key]))||[];list.push(item);map.set(Number(item[key]),list);});return map;},payBy=by(payments,'tenancy_id'),renewBy=by(renewals,'tenancy_id'),maintBy=by(maintenance,'tenancy_id'),refundBy=new Map(refunds.map(item=>[Number(item.tenancy_id),item]));
  return ok({data:rows.map(r=>{const refund=refundBy.get(Number(r.id));return {id:r.id,propertyId:r.property_id,dealId:r.deal_id,tenantName:r.tenant_name,tenantPhone:r.tenant_phone,monthlyRent:Number(r.monthly_rent_vnd||0),securityDeposit:Number(r.security_deposit_vnd||0),startDate:r.start_date,endDate:r.end_date,rentDueDay:r.rent_due_day,status:r.status,notes:r.notes||'',propertyTitle:r.properties?.title||'',propertyRef:r.properties?.reference_code||'',agent:r.properties?.profiles?.username||'',collected:Number(r.collected_vnd||0),expected:Number(r.collected_vnd||0)+Number(r.arrears_vnd||0),arrears:Number(r.arrears_vnd||0),rentLog:(payBy.get(Number(r.id))||[]).map(x=>({month:String(x.rent_month||'').slice(0,7),amount:Number(x.amount_vnd||0),paidAt:x.paid_at,method:x.method,ref:x.reference||'',receivedBy:x.profiles?.username||''})),renewals:(renewBy.get(Number(r.id))||[]).map(x=>({date:x.renewed_at,oldRent:Number(x.old_rent_vnd||0),newRent:Number(x.new_rent_vnd||0),newEndDate:x.new_end_date,notes:x.notes||'',byUser:x.profiles?.username||''})),maintenance:(maintBy.get(Number(r.id))||[]).map(x=>({id:x.id,date:x.issue_date,issue:x.issue,status:x.status,cost:Number(x.cost_vnd||0),fixedAt:x.fixed_at,addedBy:x.profiles?.username||''})),depositRefund:refund?{amount:Number(refund.refund_vnd||0),deductions:Number(refund.deductions_vnd||0),notes:refund.notes||'',refundedAt:refund.refunded_at}:null,created:r.created_at,updated:r.updated_at};})});
}
async function getLogs(jwt){const rows=await select('activity_logs','*',jwt,'&order=created_at.desc&limit=500');return ok({data:rows.map(r=>({Timestamp:r.created_at,User:r.actor_username,Action:r.action,Details:r.details||'',Changes:r.changes||[]}))});}
async function getMyPermissions(jwt){const p=await currentProfile(jwt);return ok({perms:await permissionsFor(p.role_key,jwt),canEdit:p.role_key==='Admin'});}
async function getLookups(jwt){
  const [profile,u,l,a]=await Promise.all([currentProfile(jwt),getAllUsers(jwt),getLocations(jwt),getAmenities(jwt)]);
  const users=u.data.filter(x=>x.Status==='Active');
  const staff=users.map(x=>({username:x.Username,role:x.Role}));
  const agents=['Admin','Manager'].includes(profile.role_key)?staff:staff.filter(x=>x.username===profile.username);
  return ok({users,agents,locations:l.data,amenities:a.data});
}
async function getAppConfig(jwt){const rows=await select('app_settings','setting_value',jwt,'&setting_key=eq.crm&limit=1');return ok({cfg:rows[0]?.setting_value||{},config:rows[0]?.setting_value||{}});}
async function getUserSettings(jwt){const p=await currentProfile(jwt);return ok({settings:{profileImage:p.profile_image||'',themeMode:p.theme_mode||'light',customColors:JSON.stringify(p.custom_colors||{})}});}
async function updateUserSettings(args,jwt){
  const p=await currentProfile(jwt),settings=args[1]||args[0]||{};
  let colors = p.custom_colors || {};
  if(typeof colors==='string'){try{colors=JSON.parse(colors);}catch{colors={};}}
  if(has(settings,'customColors')){
    if(!settings.customColors)colors={};
    else if(typeof settings.customColors==='string'){try{colors=JSON.parse(settings.customColors);}catch{colors={};}}
    else colors=settings.customColors;
  }
  if(has(settings,'pinnedTabs')){
    colors = {...colors, pinnedTabs: settings.pinnedTabs};
  }
  const patchData = {updated_at:new Date().toISOString()};
  if(has(settings,'profileImage')) patchData.profile_image = settings.profileImage;
  if(has(settings,'themeMode')) patchData.theme_mode = settings.themeMode;
  if(has(settings,'customColors') || has(settings,'pinnedTabs')) patchData.custom_colors = colors;
  await patchRow('profiles',p.id,patchData,jwt);
  await audit(jwt,'Settings Updated','Cập nhật tùy chọn tài khoản');
  return ok({message:'Đã lưu cài đặt tài khoản'});
}

function normalizeAgencyBranding(value = {}) {
  const branding = { ...DEFAULT_AGENCY_BRANDING, ...(value || {}) };
  return {
    name: String(branding.name || '').trim().slice(0, 160),
    logo: String(branding.logo || '').trim().slice(0, 2_000_000),
    phone: String(branding.phone || '').trim().slice(0, 80),
    address: String(branding.address || '').trim().slice(0, 500),
    slogan: String(branding.slogan || '').trim().slice(0, 300)
  };
}

async function getAgencyBranding(jwt) {
  const rows = await select('app_settings','setting_value',jwt,'&setting_key=eq.crm&limit=1');
  return ok({ branding: normalizeAgencyBranding(rows[0]?.setting_value?.branding) });
}

async function saveAgencyBranding(args,jwt) {
  const profile = await currentProfile(jwt);
  if (profile.role_key !== 'Admin') return fail('Chỉ Quản trị viên mới có quyền đổi nhận diện công ty');
  const rows = await select('app_settings','setting_value',jwt,'&setting_key=eq.crm&limit=1');
  const config = rows[0]?.setting_value || {};
  const branding = normalizeAgencyBranding(args[0]);
  await request('/rest/v1/app_settings?setting_key=eq.crm',{
    method:'PATCH',
    jwt,
    body:{setting_value:{...config,branding},updated_at:new Date().toISOString(),updated_by:profile.id}
  });
  await audit(jwt,'Agency Branding Updated',`Đổi nhận diện: ${branding.name}`);
  return ok({message:'Đã lưu nhận diện thương hiệu công ty thành công!',branding});
}

const PAGE_META = [
  ['dashboard','Tổng quan','TỔNG QUAN'],['ai','Trợ lý AI','TỔNG QUAN'],
  ['properties','Bất động sản','CRM'],['leads','Tiềm năng','CRM'],['followups','Chăm sóc','CRM'],['appointments','Lịch hẹn','CRM'],
  ['deals','Giao dịch','TÀI CHÍNH'],['tenancies','Hợp đồng thuê','TÀI CHÍNH'],['agreements','Hợp đồng','TÀI CHÍNH'],['reports','Báo cáo','TÀI CHÍNH'],
  ['owners','Chủ sở hữu','DANH MỤC'],['locations','Khu vực','DANH MỤC'],['amenities','Tiện ích','DANH MỤC'],
  ['users','Người dùng','HỆ THỐNG'],['settings','Cài đặt','HỆ THỐNG'],['logs','Nhật ký hoạt động','HỆ THỐNG'],['trash','Thùng rác','HỆ THỐNG']
];
async function getRbacMatrix(jwt){const p=await currentProfile(jwt);if(p.role_key!=='Admin')return fail('Từ chối truy cập');const [roles,rows]=await Promise.all([select('roles','role_key,label,color,is_super,sort_order',jwt,'&order=sort_order.asc'),select('role_permissions','role_key,page_key,can_view,can_add,can_edit,can_delete',jwt)]);const perms={};rows.forEach(r=>{perms[r.role_key]??={};perms[r.role_key][r.page_key]={v:r.can_view?1:0,a:r.can_add?1:0,e:r.can_edit?1:0,d:r.can_delete?1:0};});return ok({roles:roles.map(r=>({key:r.role_key,label:r.label,color:r.color,is_super:r.is_super})),pages:PAGE_META.map(([key,label,group])=>({key,label,group})),perms});}
async function toggleRbac(args,jwt){const [roleKey,pageKey,perm,value]=args,p=await currentProfile(jwt);if(p.role_key!=='Admin')return fail('Từ chối truy cập');if(roleKey==='Admin')return fail('Quyền Admin được khóa');const column={v:'can_view',a:'can_add',e:'can_edit',d:'can_delete'}[perm];if(!column)return fail('Quyền không hợp lệ');const rows=await select('role_permissions','can_view,can_add,can_edit,can_delete',jwt,`&role_key=eq.${enc(roleKey)}&page_key=eq.${enc(pageKey)}&limit=1`);if(!rows.length)return fail('Không tìm thấy quyền');const body={[column]:Boolean(Number(value))};if(perm==='v'&&!Number(value))Object.assign(body,{can_add:false,can_edit:false,can_delete:false});if(perm!=='v'&&Number(value))body.can_view=true;await request(`/rest/v1/role_permissions?role_key=eq.${enc(roleKey)}&page_key=eq.${enc(pageKey)}`,{method:'PATCH',jwt,body});await audit(jwt,'RBAC Updated',`${roleKey}.${pageKey}.${perm}=${Number(value)?1:0}`);return ok({message:'Đã cập nhật phân quyền'});}
async function setAppConfig(args,jwt){const p=await currentProfile(jwt);if(p.role_key!=='Admin')return fail('Từ chối truy cập');const cfg=args[0]||{};await request('/rest/v1/app_settings?setting_key=eq.crm',{method:'PATCH',jwt,body:{setting_value:cfg,updated_at:new Date().toISOString(),updated_by:p.id}});await audit(jwt,'App Config Updated','Cập nhật cấu hình CRM');return ok({message:'Đã lưu cấu hình'});}


let portalCache = { data: null, expiresAt: 0, lastGoodData: null };
const PORTAL_CACHE_TTL_MS = 30 * 1000; // 30s cache TTL for live updates

function invalidatePortalCache() {
  portalCache.data = null;
  portalCache.expiresAt = 0;
}

function locationPath(locations, id) {
  const map = new Map((locations || []).map(item => [Number(item.id),item])), parts = [], seen = new Set();
  let current = map.get(Number(id));
  while (current && !seen.has(current.id)) { seen.add(current.id); parts.unshift(current.name); current = map.get(Number(current.parent_id)); }
  return parts.join(' › ');
}

async function getPublicPortal() {
  const now = Date.now();
  if (portalCache.data && portalCache.expiresAt > now) {
    return ok(portalCache.data);
  }
  try {
    const [properties,locations,amenities,links,images,settings] = await Promise.all([
      adminSelect('properties','id,reference_code,title,slug,description,property_type,listing_type,status,price_vnd,rent_frequency,area_size,area_unit,bedrooms,bathrooms,location_id,address,latitude,longitude,is_featured,views_count,published_at','&deleted_at=is.null&published_at=not.is.null&status=in.(Available,Reserved)&order=published_at.desc'),
      adminSelect('locations','id,name,level,parent_id','&deleted_at=is.null&order=id.asc'),
      adminSelect('amenities','id,name,icon','&deleted_at=is.null&order=name.asc'),
      adminSelect('property_amenities','property_id,amenity_id'),
      adminSelect('property_images','property_id,storage_path,sort_order','&order=sort_order.asc'),
      adminSelect('app_settings','setting_value','&setting_key=eq.crm&limit=1')
    ]);
    const amenityMap = new Map((amenities || []).map(item=>[Number(item.id),{name:item.name,icon:item.icon||''}]));
    const linksByProperty = new Map(), imagesByProperty = new Map();
    (links || []).forEach(link=>{const list=linksByProperty.get(Number(link.property_id))||[];const amenity=amenityMap.get(Number(link.amenity_id));if(amenity)list.push(amenity);linksByProperty.set(Number(link.property_id),list);});
    (images || []).forEach(image=>{const list=imagesByProperty.get(Number(image.property_id))||[];list.push({url:image.storage_path,isPrimary:list.length===0?1:0,sortOrder:image.sort_order});imagesByProperty.set(Number(image.property_id),list);});
    const data = {
      properties:(properties || []).map(item=>({id:item.id,referenceCode:item.reference_code,title:item.title,slug:item.slug,description:item.description||'',propertyType:item.property_type,listingType:item.listing_type,status:item.status,price:Number(item.price_vnd||0),rentFrequency:item.rent_frequency||'',areaSize:Number(item.area_size||0),areaUnit:item.area_unit||'m²',bedrooms:item.bedrooms,bathrooms:item.bathrooms,locationId:item.location_id,locationPath:locationPath(locations || [],item.location_id),address:item.address||'',latitude:item.latitude,longitude:item.longitude,isFeatured:item.is_featured?1:0,viewsCount:Number(item.views_count||0),images:imagesByProperty.get(Number(item.id))||[],amenities:linksByProperty.get(Number(item.id))||[],publishedAt:item.published_at})),
      locations:(locations || []).map(item=>({id:item.id,parentId:item.parent_id||null,name:item.name,level:item.level})),
      amenities:(amenities || []).map(item=>({id:item.id,name:item.name,icon:item.icon||''})),
      branding:normalizeAgencyBranding(settings && settings[0]?.setting_value?.branding)
    };
    portalCache = { data, expiresAt: now + PORTAL_CACHE_TTL_MS, lastGoodData: data };
    return ok(data);
  } catch (err) {
    console.error('getPublicPortal fetch error, fallback activated:', err.message);
    if (portalCache.lastGoodData) {
      return ok(portalCache.lastGoodData);
    }
    try {
      const fallbackFile = path.join(__dirname, 'data', 'portal-data.json');
      if (fs.existsSync(fallbackFile)) {
        const fallback = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
        if (fallback && fallback.properties) return ok(fallback);
      }
    } catch (_) {}
    throw err;
  }
}

async function publicViewProperty(args) {
  const id = Number(args[0]); if (!id) return fail('Bất động sản không hợp lệ');
  const rows = await adminSelect('properties','views_count',`&id=eq.${id}&deleted_at=is.null&limit=1`);
  if (!rows.length) return fail('Không tìm thấy bất động sản');
  await request(`/rest/v1/properties?id=eq.${id}`,{method:'PATCH',body:{views_count:Number(rows[0].views_count||0)+1},admin:true});
  return ok();
}

async function publicSubmitEnquiry(args) {
  const data = args[0] || {};
  if (String(data.website || '').trim()) return ok({message:'Yêu cầu đã được ghi nhận.'});
  if (!String(data.fullName||'').trim() || !String(data.phone||'').trim()) return fail('Vui lòng nhập họ tên và số điện thoại');
  
  let msg = String(data.message || '').trim();
  if (data.preferredTime) {
    const timeStr = String(data.preferredTime).trim().replace('T', ' ');
    msg = msg ? `[Lịch xem mong muốn: ${timeStr}]
${msg}` : `[Lịch xem mong muốn: ${timeStr}]`;
  }

  const leadData = clean({
    full_name: String(data.fullName).trim(),
    phone: String(data.phone).trim(),
    email: String(data.email || '').trim() || null,
    source: 'Website',
    interest_type: ['Buy','Rent','Sell','Rent Out'].includes(data.interestType) ? data.interestType : 'Buy',
    property_id: Number(data.propertyId) || null,
    message: msg || null,
    status: 'New'
  });
  await insertRow('leads', leadData, null, true);
  try {
    await audit(null, 'Web Enquiry', `Khách để lại thông tin: ${leadData.full_name} (${leadData.phone}) - Nhu cầu: ${leadData.interest_type}`);
  } catch (_) {}
  return ok({message:'Chúng tôi đã nhận được yêu cầu và sẽ liên hệ với bạn sớm.'});
}

const clean = (object) => Object.fromEntries(Object.entries(object).filter(([,value]) => value !== undefined));
const nullableNumber = (value) => value === undefined ? undefined : (value === '' || value === null ? null : Number(value));
const nullableText = (value) => value === undefined ? undefined : (value === '' || value === null ? null : String(value));
const has = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const slugify = (value) => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const vietnamDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date(value));

async function profileId(username,jwt,fallback) {
  if (!username) return fallback || null;
  const rows = await select('profiles','id',jwt,`&username=eq.${enc(username)}&status=eq.Active&limit=1`);
  return rows[0]?.id || fallback || null;
}
async function audit(jwt, action, details) {
  let actorId = null, actorUsername = 'Khách truy cập';
  if (jwt) {
    try {
      const p = await currentProfile(jwt);
      actorId = p.id;
      actorUsername = p.username;
    } catch (_) {}
  }
  const body = { actor_id: actorId, actor_username: actorUsername, action, details: details || '' };
  try {
    await request('/rest/v1/activity_logs', { method: 'POST', jwt, admin: !jwt, body });
  } catch (error) {
    // Dữ liệu nhập từ hệ thống cũ có ID tường minh nên sequence có thể chưa bắt kịp.
    if (!/activity_logs_pkey|duplicate key/i.test(String(error.message || ''))) throw error;
    const latest = await adminSelect('activity_logs', 'id', '&order=id.desc&limit=1');
    await request('/rest/v1/activity_logs', { method: 'POST', admin: true, body: { ...body, id: Number(latest[0]?.id || 0) + 1 } });
  }
}

function brochurePythonPath() {
  const candidates = [
    process.env.CRM_PYTHON,
    process.env.PYTHON,
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe'),
    process.platform === 'win32' ? 'python.exe' : 'python3'
  ].filter(Boolean);
  return candidates.find(candidate => candidate.indexOf(path.sep) === -1 || fs.existsSync(candidate)) || candidates[candidates.length - 1];
}

function renderBrochurePdf(payload) {
  const script = path.join(__dirname, 'scripts', 'generate-property-brochure.py');
  if (!fs.existsSync(script)) throw new Error('Thiếu bộ tạo tờ giới thiệu PDF');
  const result = spawnSync(brochurePythonPath(), [script], {
    input: Buffer.from(JSON.stringify(payload), 'utf8'),
    maxBuffer: 24 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error) throw new Error(`Không thể khởi động bộ tạo PDF: ${result.error.message}`);
  if (result.status !== 0 || !result.stdout?.length) {
    throw new Error(String(result.stderr || 'Không thể tạo tờ giới thiệu PDF').trim());
  }
  return result.stdout;
}

async function brochurePdf(args, jwt) {
  const propertyId = Number(args[0]);
  if (!propertyId) return fail('Bất động sản không hợp lệ');
  const [propertiesResult, locationsResult, amenitiesResult] = await Promise.all([
    getProperties(jwt), getLocations(jwt), getAmenities(jwt)
  ]);
  const property = (propertiesResult.data || []).find(item => Number(item.id) === propertyId);
  if (!property) return fail('Không tìm thấy bất động sản hoặc bạn không có quyền xem');
  const locations = locationsResult.data || [];
  const amenityMap = new Map((amenitiesResult.data || []).map(item => [Number(item.id), item.name]));
  const statusMap = { Draft:'Bản nháp', Available:'Còn trống', Reserved:'Đã giữ chỗ', Sold:'Đã bán', Rented:'Đã cho thuê', Withdrawn:'Đã rút' };
  const listingMap = { Sale:'Bán', Rent:'Thuê' };
  const rentMap = { Monthly:'tháng', Quarterly:'quý', Yearly:'năm' };
  const cover = (property.images || []).find(item => item.isPrimary) || (property.images || [])[0];
  const payload = {
    title: property.title,
    referenceCode: property.referenceCode,
    propertyType: property.propertyType,
    listingType: listingMap[property.listingType] || property.listingType,
    status: statusMap[property.status] || property.status,
    price: property.price,
    rentFrequency: rentMap[property.rentFrequency] || property.rentFrequency,
    areaSize: property.areaSize,
    areaUnit: property.areaUnit,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    assignedAgent: property.assignedAgent,
    location: [locationPath(locations.map(item => ({...item, parent_id:item.parentId})), property.locationId), property.address].filter(Boolean).join(' - '),
    description: property.description,
    amenities: (property.amenityIds || []).map(id => amenityMap.get(Number(id))).filter(Boolean),
    coverImage: cover?.url || '',
    portalUrl: `${String(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/?p=${encodeURIComponent(property.slug || property.id)}`
  };
  const pdf = renderBrochurePdf(payload);
  await audit(jwt, 'Brochure Generated', property.referenceCode || `#${property.id}`);
  return ok({base64:pdf.toString('base64'),filename:`${property.referenceCode || 'bat-dong-san'}.pdf`});
}
async function insertRow(table,body,jwt,admin=false) {
  const payload=clean(body);
  const useAdmin = Boolean(admin || !jwt);
  try {
    const rows=await request(`/rest/v1/${table}`,{method:'POST',jwt,admin:useAdmin,body:payload,headers:{Prefer:'return=representation'}});
    return Array.isArray(rows)?rows[0]:null;
  } catch (error) {
    // Các bảng được nhập từ hệ thống cũ có ID tường minh; identity sequence trên
    // Supabase có thể thấp hơn ID hiện có. Cấp ID an toàn từ dữ liệu thực tế để
    // mọi phân hệ tạo mới tiếp tục hoạt động cho đến khi sequence tự bắt kịp.
    if (!new RegExp(`${table}_pkey|duplicate key`, 'i').test(String(error.message||''))) throw error;
    for (let attempt=0;attempt<5;attempt++) {
      const latest=await adminSelect(table,'id','&order=id.desc&limit=1');
      const explicitId=Number(latest[0]?.id||0)+1+attempt;
      try {
        const rows=await request(`/rest/v1/${table}`,{method:'POST',jwt,admin:useAdmin,body:{...payload,id:explicitId},headers:{Prefer:'return=representation'}});
        return Array.isArray(rows)?rows[0]:null;
      } catch (retryError) {
        if (attempt===4 || !/duplicate key/i.test(String(retryError.message||''))) throw retryError;
      }
    }
  }
}

async function syncPropertyRelations(propertyId,data,jwt) {
  const p=await currentProfile(jwt),id=Number(propertyId);
  if(has(data,'amenityIds')){
    await request(`/rest/v1/property_amenities?property_id=eq.${id}`,{method:'DELETE',jwt});
    const ids=[...new Set((data.amenityIds||[]).map(Number).filter(Boolean))];
    if(ids.length)await request('/rest/v1/property_amenities',{method:'POST',jwt,body:ids.map(amenityId=>({property_id:id,amenity_id:amenityId}))});
  }
  if(has(data,'images')){
    await request(`/rest/v1/property_images?property_id=eq.${id}`,{method:'DELETE',jwt});
    const normalized=(data.images||[]).slice(0,15).sort((a,b)=>Number(Boolean(b.isPrimary))-Number(Boolean(a.isPrimary))||Number(a.sortOrder||0)-Number(b.sortOrder||0));
    if(normalized.length)await request('/rest/v1/property_images',{method:'POST',jwt,body:normalized.map((image,index)=>({property_id:id,storage_path:String(image.url||''),sort_order:index,created_by:p.id}))});
  }
}
async function patchRow(table,id,body,jwt,admin=false) {
  const queryId = table === 'profiles' || (typeof id === 'string' && id.includes('-')) ? enc(id) : Number(id);
  const rows = await request(`/rest/v1/${table}?id=eq.${queryId}`,{method:'PATCH',jwt:admin?undefined:jwt,admin:Boolean(admin||!jwt),body:clean(body),headers:{Prefer:'return=representation'}});
  return Array.isArray(rows)?rows[0]:null;
}
async function softDelete(table,id,jwt,label) {
  const p=await currentProfile(jwt), body={deleted_at:new Date().toISOString(),deleted_by:p.id,updated_at:new Date().toISOString()};
  if (!['locations','amenities'].includes(table)) body.updated_by=p.id;
  await patchRow(table,id,body,jwt);
  await audit(jwt,`${label} Deleted`,`#${id}`); return ok({message:'Đã chuyển dữ liệu vào thùng rác'});
}

async function propertyBody(data,jwt,isNew=false) {
  const p=await currentProfile(jwt), assigned=(isNew||has(data,'assignedAgent'))?await profileId(data.assignedAgent,jwt,p.id):undefined, stamp=Date.now();
  return clean({reference_code:data.referenceCode||(isNew?`RS-WEB-${stamp}`:undefined),title:data.title,slug:data.slug||(isNew?`${slugify(data.title)}-${stamp}`:undefined),description:data.description,property_type:data.propertyType,listing_type:data.listingType,status:data.status,price_vnd:data.price===undefined?undefined:Number(data.price),rent_frequency:nullableText(data.rentFrequency),area_size:nullableNumber(data.areaSize),area_unit:data.areaUnit,bedrooms:nullableNumber(data.bedrooms),bathrooms:nullableNumber(data.bathrooms),location_id:nullableNumber(data.locationId),address:data.address,latitude:nullableNumber(data.latitude),longitude:nullableNumber(data.longitude),owner_id:nullableNumber(data.ownerId),owner_name_snapshot:data.ownerName,owner_phone_snapshot:data.ownerPhone,assigned_agent_id:assigned,is_featured:data.isFeatured===undefined?undefined:Boolean(Number(data.isFeatured)||data.isFeatured===true),views_count:data.viewsCount===undefined?undefined:Number(data.viewsCount||0),published_at:data.status==='Draft'?null:(data.publishedAt||new Date().toISOString()),created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});
}
async function addProperty(args,jwt){invalidatePortalCache();const data=args[0]||{},row=await insertRow('properties',await propertyBody(data,jwt,true),jwt);await syncPropertyRelations(row.id,data,jwt);await audit(jwt,'Property Added',`#${row.id}`);return ok({id:row.id,message:'Đã thêm bất động sản'});}
async function updateProperty(args,jwt){invalidatePortalCache();const d=args[0]||{};await patchRow('properties',d.id,await propertyBody(d,jwt,false),jwt);await syncPropertyRelations(d.id,d,jwt);await audit(jwt,'Property Updated',`#${d.id}`);return ok({message:'Đã cập nhật bất động sản'});}
async function deleteProperty(args,jwt){invalidatePortalCache();return softDelete('properties',args[0],jwt,'Property');}

let imageBucketReady;
async function ensureImageBucket(){
  if(imageBucketReady)return imageBucketReady;
  imageBucketReady=(async()=>{const headers={apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`};const check=await fetch(`${SUPABASE_URL}/storage/v1/bucket/${IMAGE_BUCKET}`,{headers});if(check.ok)return true;const checkText=await check.text();let missing=check.status===404;try{const payload=JSON.parse(checkText);missing=missing||payload?.statusCode==='404'||payload?.code==='NoSuchBucket';}catch{}if(!missing)throw new Error(`Không thể kiểm tra kho ảnh (${check.status})`);const create=await fetch(`${SUPABASE_URL}/storage/v1/bucket`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:IMAGE_BUCKET,name:IMAGE_BUCKET,public:true,file_size_limit:5242880,allowed_mime_types:['image/jpeg','image/png','image/webp','image/gif']})});if(!create.ok){const body=await create.text();throw new Error(`Không thể tạo kho ảnh: ${body}`);}return true;})();
  return imageBucketReady;
}
async function uploadPropertyImage(args,jwt){
  const [dataUrl,filename]=args,p=await currentProfile(jwt),perms=await permissionsFor(p.role_key,jwt);
  if(!perms.properties?.a&&!perms.properties?.e)return fail('Bạn không có quyền tải ảnh bất động sản');
  const match=String(dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match)return fail('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF');
  const bytes=Buffer.from(match[2].replace(/\s/g,''),'base64');
  if(!bytes.length||bytes.length>5*1024*1024)return fail('Ảnh phải có dung lượng từ 1 byte đến 5 MB');
  await ensureImageBucket();
  const ext={jpeg:'jpg',png:'png',webp:'webp',gif:'gif'}[match[1].split('/')[1].toLowerCase()]||'jpg';
  const base=String(filename||'image').replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'image';
  const storagePath=`${p.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}-${base}.${ext}`;
  const encoded=storagePath.split('/').map(enc).join('/');
  const response=await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':match[1],'x-upsert':'false'},body:bytes});
  if(!response.ok)throw new Error(`Tải ảnh thất bại: ${await response.text()}`);
  return ok({url:`${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${encoded}`,path:storagePath});
}


async function uploadFile(args, jwt) {
  const [dataUrl, filename, folder = 'general'] = args;
  const p = await currentProfile(jwt);

  if (folder === 'profile' || folder === 'avatars') {
    return uploadProfileImage([dataUrl, filename], jwt);
  }

  const match = String(dataUrl || '').match(/^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return fail('Dữ liệu tệp không hợp lệ');
  const mime = match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) return fail('Tệp phải có dung lượng từ 1 byte đến 10 MB');

  await ensureImageBucket();
  const ext = String(filename || '').split('.').pop() || 'bin';
  const base = String(filename || 'file').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'file';
  const storagePath = `${folder}/${p.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${base}.${ext}`;
  const encoded = storagePath.split('/').map(enc).join('/');

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${encoded}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': mime,
      'x-upsert': 'false'
    },
    body: bytes
  });

  if (!response.ok) {
    throw new Error(`Tải tệp thất bại: ${await response.text()}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${encoded}`;
  await audit(jwt, 'File Uploaded', `${folder}: ${base}.${ext}`);
  return ok({
    fileId: storagePath,
    fileUrl: publicUrl,
    url: publicUrl,
    fileName: filename || `${base}.${ext}`,
    message: 'Đã tải tệp lên thành công'
  });
}

async function uploadProfileImage(args,jwt){
  const [dataUrl,filename]=args,p=await currentProfile(jwt);
  const match=String(dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match)return fail('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF');
  const bytes=Buffer.from(match[2].replace(/\s/g,''),'base64');
  if(!bytes.length||bytes.length>5*1024*1024)return fail('Ảnh phải có dung lượng từ 1 byte đến 5 MB');
  await ensureImageBucket();
  const ext={jpeg:'jpg',png:'png',webp:'webp',gif:'gif'}[match[1].split('/')[1].toLowerCase()]||'jpg';
  const base=String(filename||'avatar').replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'avatar';
  const storagePath=`avatars/${p.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}-${base}.${ext}`;
  const encoded=storagePath.split('/').map(enc).join('/');
  const response=await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':match[1],'x-upsert':'false'},body:bytes});
  if(!response.ok)throw new Error(`Tải ảnh đại diện thất bại: ${await response.text()}`);
  const publicUrl=`${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${encoded}`;
  await patchRow('profiles',p.id,{profile_image:publicUrl,updated_at:new Date().toISOString()},jwt);
  await audit(jwt,'Profile Image Uploaded',`Cập nhật ảnh đại diện: ${base}.${ext}`);
  return ok({fileId:storagePath,fileUrl:publicUrl,fileName:filename||`${base}.${ext}`,url:publicUrl,message:'Đã tải ảnh đại diện thành công'});
}

async function leadBody(data,jwt,isNew=false){const p=await currentProfile(jwt),assigned=(isNew||has(data,'assignedAgent'))?await profileId(data.assignedAgent,jwt,p.id):undefined;return clean({full_name:data.fullName,phone:data.phone,email:nullableText(data.email),source:data.source,interest_type:data.interestType,property_id:nullableNumber(data.propertyId),preferred_location_id:nullableNumber(data.preferredLocationId),budget_min_vnd:nullableNumber(data.budgetMin),budget_max_vnd:nullableNumber(data.budgetMax),message:data.message,status:data.status||(isNew?'New':undefined),lost_reason:nullableText(data.lostReason),assigned_agent_id:assigned,created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addLead(args,jwt){const row=await insertRow('leads',await leadBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Lead Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm khách hàng'});}
async function updateLead(args,jwt){const d=args[0]||{};await patchRow('leads',d.id,await leadBody(d,jwt,false),jwt);await audit(jwt,'Lead Updated',`#${d.id}`);return ok({message:'Đã cập nhật khách hàng'});}
async function deleteLead(args,jwt){return softDelete('leads',args[0],jwt,'Lead');}
async function assignLead(args,jwt){const [id,username]=args;const p=await currentProfile(jwt),assigned=await profileId(username,jwt,p.id);await patchRow('leads',id,{assigned_agent_id:assigned,updated_at:new Date().toISOString(),updated_by:p.id},jwt);await audit(jwt,'Lead Assigned',`#${id} → ${username}`);return ok({message:'Đã phân công khách hàng'});}

async function followUpBody(data,jwt,isNew=false){const p=await currentProfile(jwt),assigned=(isNew||has(data,'assignedAgent'))?await profileId(data.assignedAgent,jwt,p.id):undefined,status=data.status||(isNew?'Pending':undefined);return clean({lead_id:data.leadId===undefined?undefined:Number(data.leadId),assigned_agent_id:assigned,type:data.type||(isNew?'Call':undefined),notes:data.notes,due_at:nullableText(data.dueAt),status,completed_at:status==='Completed'?(data.completedAt||new Date().toISOString()):(has(data,'status')?null:undefined),created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addFollowUp(args,jwt){const row=await insertRow('follow_ups',await followUpBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Follow-up Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm lịch chăm sóc'});}
async function updateFollowUp(args,jwt){const d=args[0]||{};await patchRow('follow_ups',d.id,await followUpBody(d,jwt,false),jwt);await audit(jwt,'Follow-up Updated',`#${d.id}`);return ok({message:'Đã cập nhật lịch chăm sóc'});}
async function deleteFollowUp(args,jwt){return softDelete('follow_ups',args[0],jwt,'Follow-up');}

async function appointmentBody(data,jwt,isNew=false){const p=await currentProfile(jwt),agent=(isNew||has(data,'agent'))?await profileId(data.agent,jwt,p.id):undefined;return clean({lead_id:data.leadId===undefined?undefined:Number(data.leadId),property_id:data.propertyId===undefined?undefined:Number(data.propertyId),agent_id:agent,scheduled_at:data.scheduledAt,duration_minutes:data.durationMinutes===undefined?undefined:Number(data.durationMinutes),status:data.status||(isNew?'Scheduled':undefined),notes:data.notes,cancellation_reason:nullableText(data.cancellationReason),interest_level:nullableText(data.interestLevel),feedback:data.feedback,created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addAppointment(args,jwt){const row=await insertRow('appointments',await appointmentBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Appointment Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm lịch hẹn'});}
async function updateAppointment(args,jwt){const d=args[0]||{};await patchRow('appointments',d.id,await appointmentBody(d,jwt,false),jwt);await audit(jwt,'Appointment Updated',`#${d.id}`);return ok({message:'Đã cập nhật lịch hẹn'});}
async function deleteAppointment(args,jwt){return softDelete('appointments',args[0],jwt,'Appointment');}
async function completeAppointment(args,jwt){
  const [rawId,data={}] = args, id=Number(rawId), allowedInterest=new Set(['Hot','Warm','Cold']);
  if(!id)return fail('Lịch hẹn không hợp lệ');
  const rows=await select('appointments','id,lead_id,status',jwt,`&id=eq.${id}&deleted_at=is.null&limit=1`);
  const appointment=rows[0];
  if(!appointment)return fail('Không tìm thấy lịch hẹn hoặc bạn không có quyền cập nhật');
  if(['Cancelled','Completed'].includes(appointment.status))return fail(`Lịch hẹn đã ở trạng thái ${appointment.status}`);
  const interest=allowedInterest.has(data.interestLevel)?data.interestLevel:null;
  const profile=await currentProfile(jwt);
  await patchRow('appointments',id,{status:'Completed',feedback:String(data.feedback||'').slice(0,2000),interest_level:interest,
    updated_at:new Date().toISOString(),updated_by:profile.id},jwt);
  await audit(jwt,'Appointment Completed',`#${id}${interest?` [${interest}]`:''}`);
  let suggestNegotiating=false;
  if(interest==='Hot'&&appointment.lead_id){
    const leads=await select('leads','id,status',jwt,`&id=eq.${Number(appointment.lead_id)}&deleted_at=is.null&limit=1`);
    suggestNegotiating=Boolean(leads[0]&&!['Negotiating','Won','Lost'].includes(leads[0].status));
  }
  return ok({message:'Đã hoàn thành lịch xem',suggestNegotiating,leadId:appointment.lead_id||null});
}

async function dealBody(data,jwt,isNew=false){
  const p=await currentProfile(jwt),agent=(isNew||has(data,'agent'))?await profileId(data.agent,jwt,p.id):undefined,status=data.status||(isNew?'Token':undefined);
  let dealType = data.dealType || data.deal_type;
  if (!dealType && (data.propertyId !== undefined || isNew)) {
    const pid = Number(data.propertyId);
    if (pid) {
      const props = await select('properties', 'listing_type', jwt, `&id=eq.${pid}&limit=1`);
      if (props.length && props[0].listing_type) dealType = props[0].listing_type;
    }
  }
  if (!dealType && isNew) dealType = 'Sale';
  return clean({
    deal_type: dealType,
    property_id: data.propertyId===undefined?undefined:Number(data.propertyId),
    lead_id: nullableNumber(data.leadId),
    buyer_name: data.buyerName,
    buyer_phone: data.buyerPhone,
    agent_id: agent,
    deal_amount_vnd: data.dealAmount===undefined?undefined:Number(data.dealAmount),
    commission_pct: data.commissionPct===undefined?undefined:Number(data.commissionPct),
    agent_share_pct: data.agentSharePct===undefined?undefined:Number(data.agentSharePct),
    agent_paid_at: nullableText(data.agentPaidAt),
    token_amount_vnd: data.tokenAmount===undefined?undefined:Number(data.tokenAmount||0),
    status,
    closed_at: status==='Completed'?(data.closedAt||new Date().toISOString()):nullableText(data.closedAt),
    cancellation_reason: nullableText(data.cancellationReason),
    notes: data.notes,
    created_by: isNew?p.id:undefined,
    updated_at: new Date().toISOString(),
    updated_by: p.id
  });
}
async function syncTenancyOnRentDeal(dealIdOrRow, jwt) {
  const dealId = typeof dealIdOrRow === 'object' ? dealIdOrRow?.id : Number(dealIdOrRow);
  if (!dealId) return;
  const deals = await select('deals', 'id,deal_type,property_id,status,buyer_name,buyer_phone,deal_amount_vnd,token_amount_vnd,closed_at,notes', jwt, `&id=eq.${dealId}&limit=1`);
  if (!deals.length) return;
  const deal = deals[0];
  if (deal.deal_type !== 'Rent' || deal.status !== 'Completed' || !deal.property_id) return;
  const p = await currentProfile(jwt);
  const existing = await select('tenancies', 'id', jwt, `&deal_id=eq.${deal.id}&deleted_at=is.null&limit=1`);
  if (!existing.length) {
    const today = new Date().toISOString().slice(0, 10);
    await insertRow('tenancies', {
      property_id: Number(deal.property_id),
      deal_id: Number(deal.id),
      tenant_name: deal.buyer_name || 'Khách thuê',
      tenant_phone: deal.buyer_phone || '',
      monthly_rent_vnd: Number(deal.deal_amount_vnd || 0),
      security_deposit_vnd: Number(deal.token_amount_vnd || 0),
      start_date: deal.closed_at ? String(deal.closed_at).slice(0, 10) : today,
      rent_due_day: 5,
      status: 'Active',
      notes: deal.notes || '',
      created_by: p.id,
      updated_by: p.id
    }, jwt);
    await patchRow('properties', deal.property_id, { status: 'Rented', updated_at: new Date().toISOString(), updated_by: p.id }, jwt);
  }
}
async function addDeal(args,jwt){
  const data = args[0] || {};
  const body = await dealBody(data, jwt, true);
  const row = await insertRow('deals', body, jwt);
  if (row) {
    if (Number(data.tokenAmount) > 0) {
      await request('/rest/v1/rpc/record_deal_payment', {
        method: 'POST',
        jwt,
        body: {
          target_deal_id: Number(row.id),
          payment_amount_vnd: Number(data.tokenAmount),
          payment_method: data.tokenMethod || 'Cash',
          payment_reference: 'Tiền đặt cọc ban đầu',
          payment_notes: 'Thanh toán đợt 1 (Đặt cọc giữ chỗ)',
          payment_time: new Date().toISOString()
        }
      }).catch(() => {});
    }
    await syncTenancyOnRentDeal(row.id, jwt);
  }
  await audit(jwt, 'Deal Added', row ? `#${row.id}` : '');
  return ok({ id: row?.id, message: 'Đã thêm giao dịch' });
}
async function updateDeal(args,jwt){const d=args[0]||{};const row=await patchRow('deals',d.id,await dealBody(d,jwt,false),jwt);await syncTenancyOnRentDeal(d.id,jwt);await audit(jwt,'Deal Updated',`#${d.id}`);return ok({message:'Đã cập nhật giao dịch'});}
async function deleteDeal(args,jwt){return softDelete('deals',args[0],jwt,'Deal');}
async function addDealPayment(args,jwt){const [dealId,data]=args;await request('/rest/v1/rpc/record_deal_payment',{method:'POST',jwt,body:{target_deal_id:Number(dealId),payment_amount_vnd:Number(data.amount),payment_method:data.method||'Cash',payment_reference:data.reference||'',payment_notes:data.notes||'',payment_time:data.date||data.paidAt||new Date().toISOString()}});await audit(jwt,'Deal Payment Added',`#${dealId}`);return ok({message:'Đã ghi nhận thanh toán'});}
async function markAgentPaid(args,jwt){const id=args[0],p=await currentProfile(jwt);await patchRow('deals',id,{agent_paid_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:p.id},jwt);await audit(jwt,'Agent Commission Paid',`#${id}`);return ok({message:'Đã ghi nhận thanh toán hoa hồng'});}

async function tenancyContext(rawId,jwt){
  const id=Number(rawId);
  if(!id)return null;
  const rows=await select('tenancies','id,property_id,monthly_rent_vnd,security_deposit_vnd,start_date,end_date,status,properties(id,status)',jwt,`&id=eq.${id}&deleted_at=is.null&limit=1`);
  return rows[0]||null;
}
async function collectRent(args,jwt){
  const [rawId,data={}] = args, tenancy=await tenancyContext(rawId,jwt);
  if(!tenancy)return fail('Không tìm thấy hợp đồng thuê hoặc bạn không có quyền cập nhật');
  if(tenancy.status!=='Active')return fail('Hợp đồng thuê đã kết thúc');
  const month=String(data.month||'').slice(0,7), amount=Number(data.amount), methods=new Set(['Cash','Bank Transfer','Cheque','Online']);
  if(!/^\d{4}-\d{2}$/.test(month))return fail('Tháng thu tiền phải có định dạng YYYY-MM');
  if(!Number.isFinite(amount)||amount<=0)return fail('Số tiền thu phải lớn hơn 0');
  const profile=await currentProfile(jwt);
  try{
    await insertRow('rent_payments',{tenancy_id:tenancy.id,rent_month:`${month}-01`,amount_vnd:Math.round(amount),paid_at:data.paidAt||new Date().toISOString(),
      method:methods.has(data.method)?data.method:'Cash',reference:nullableText(data.ref||data.reference),received_by:profile.id},jwt);
  }catch(error){
    if(/rent_payments_tenancy_id_rent_month_key|duplicate key/i.test(String(error.message||'')))return fail(`Tiền thuê tháng ${month} đã được ghi nhận`);
    throw error;
  }
  await audit(jwt,'Rent Collected',`#${tenancy.id} ${month} ${Math.round(amount)} VND`);
  return ok({message:`Đã thu tiền thuê tháng ${month}`});
}
async function renewTenancy(args,jwt){
  const [rawId,data={}] = args, tenancy=await tenancyContext(rawId,jwt), profile=await currentProfile(jwt);
  if(!tenancy)return fail('Không tìm thấy hợp đồng thuê hoặc bạn không có quyền cập nhật');
  if(!['Admin','Manager'].includes(profile.role_key))return fail('Chỉ Quản trị viên hoặc Quản lý được gia hạn hợp đồng');
  if(tenancy.status!=='Active')return fail('Hợp đồng thuê đã kết thúc');
  const newRent=Math.round(Number(data.newRent));
  if(!Number.isFinite(newRent)||newRent<=0)return fail('Tiền thuê mới phải lớn hơn 0');
  const newEndDate=data.newEndDate||tenancy.end_date||null;
  let renewal;
  try{
    renewal=await insertRow('tenancy_renewals',{tenancy_id:tenancy.id,old_rent_vnd:Number(tenancy.monthly_rent_vnd),new_rent_vnd:newRent,
      new_end_date:newEndDate,notes:nullableText(data.notes),created_by:profile.id},jwt);
    await patchRow('tenancies',tenancy.id,{monthly_rent_vnd:newRent,end_date:newEndDate,updated_at:new Date().toISOString(),updated_by:profile.id},jwt);
  }catch(error){
    if(renewal?.id)await request(`/rest/v1/tenancy_renewals?id=eq.${Number(renewal.id)}`,{method:'DELETE',jwt}).catch(()=>{});
    throw error;
  }
  await audit(jwt,'Tenancy Renewed',`#${tenancy.id} rent ${tenancy.monthly_rent_vnd} → ${newRent}`);
  return ok({message:'Đã gia hạn hợp đồng thuê'});
}
async function endTenancy(args,jwt){
  const [rawId,data={}] = args, tenancy=await tenancyContext(rawId,jwt), profile=await currentProfile(jwt);
  if(!tenancy)return fail('Không tìm thấy hợp đồng thuê hoặc bạn không có quyền cập nhật');
  if(!['Admin','Manager'].includes(profile.role_key))return fail('Chỉ Quản trị viên hoặc Quản lý được kết thúc hợp đồng');
  if(tenancy.status!=='Active')return fail('Hợp đồng thuê đã kết thúc');
  const deposit=Number(tenancy.security_deposit_vnd||0), deductions=Math.round(Number(data.deductions||0));
  if(!Number.isFinite(deductions)||deductions<0)return fail('Khoản khấu trừ không hợp lệ');
  if(deductions>deposit)return fail(`Khoản khấu trừ vượt tiền cọc ${deposit} VNĐ`);
  let refundCreated=false, tenancyEnded=false;
  try{
    await request('/rest/v1/deposit_refunds',{method:'POST',jwt,body:{tenancy_id:tenancy.id,deposit_vnd:deposit,deductions_vnd:deductions,
      notes:nullableText(data.notes),refunded_at:new Date().toISOString(),refunded_by:profile.id}});
    refundCreated=true;
    await patchRow('tenancies',tenancy.id,{status:'Ended',end_date:data.endDate||vietnamDate(),updated_at:new Date().toISOString(),updated_by:profile.id},jwt);
    tenancyEnded=true;
    if(tenancy.properties?.status==='Rented')await patchRow('properties',tenancy.property_id,{status:'Available',published_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:profile.id},jwt);
  }catch(error){
    if(tenancyEnded)await patchRow('tenancies',tenancy.id,{status:'Active',end_date:tenancy.end_date,updated_at:new Date().toISOString(),updated_by:profile.id},jwt).catch(()=>{});
    if(refundCreated)await request(`/rest/v1/deposit_refunds?tenancy_id=eq.${tenancy.id}`,{method:'DELETE',jwt}).catch(()=>{});
    if(/deposit_refunds_pkey|duplicate key/i.test(String(error.message||'')))return fail('Hợp đồng này đã có quyết toán tiền cọc');
    throw error;
  }
  await audit(jwt,'Tenancy Ended',`#${tenancy.id} refund ${deposit-deductions}`);
  return ok({message:'Đã kết thúc hợp đồng và đưa bất động sản về trạng thái còn trống'});
}
async function deleteTenancy(args,jwt){
  const [rawId] = args, tenancy = await tenancyContext(rawId, jwt), profile = await currentProfile(jwt);
  if (!tenancy) return fail('Không tìm thấy hợp đồng thuê hoặc bạn không có quyền thao tác');
  if (!['Admin', 'Manager'].includes(profile.role_key)) return fail('Chỉ Quản trị viên hoặc Quản lý mới có quyền xóa hợp đồng thuê');
  return softDelete('tenancies', tenancy.id, jwt, 'Tenancy');
}
async function addMaintenance(args,jwt){
  const [rawId,data={}] = args, tenancy=await tenancyContext(rawId,jwt), profile=await currentProfile(jwt), issue=String(data.issue||'').trim();
  if(!tenancy)return fail('Không tìm thấy hợp đồng thuê hoặc bạn không có quyền cập nhật');
  if(!issue)return fail('Vui lòng nhập nội dung bảo trì');
  const row=await insertRow('maintenance_items',{tenancy_id:tenancy.id,issue_date:data.date||vietnamDate(),issue:issue.slice(0,500),status:'Open',cost_vnd:0,created_by:profile.id},jwt);
  await audit(jwt,'Maintenance Logged',`#${tenancy.id} item #${row?.id||''}`);
  return ok({id:row?.id,message:'Đã ghi nhận yêu cầu bảo trì'});
}
async function updateMaintenance(args,jwt){
  const [rawTenancyId,rawItemId,data={}] = args, tenancy=await tenancyContext(rawTenancyId,jwt), itemId=Number(rawItemId), profile=await currentProfile(jwt);
  if(!tenancy)return fail('Không tìm thấy hợp đồng thuê hoặc bạn không có quyền cập nhật');
  const items=await select('maintenance_items','id,status,issue,cost_vnd,fixed_at',jwt,`&id=eq.${itemId}&tenancy_id=eq.${tenancy.id}&limit=1`), item=items[0];
  if(!item)return fail('Không tìm thấy hạng mục bảo trì');
  const status=data.status==='Fixed'?'Fixed':(data.status==='Open'?'Open':item.status), cost=data.cost===undefined?Number(item.cost_vnd||0):Math.round(Number(data.cost||0));
  if(!Number.isFinite(cost)||cost<0)return fail('Chi phí bảo trì không hợp lệ');
  const firstCompletion=item.status!=='Fixed'&&status==='Fixed';
  let expense;
  try{
    await request(`/rest/v1/maintenance_items?id=eq.${itemId}&tenancy_id=eq.${tenancy.id}`,{method:'PATCH',jwt,body:{status,cost_vnd:cost,
      issue:data.issue===undefined?item.issue:String(data.issue).trim().slice(0,500),fixed_at:firstCompletion?new Date().toISOString():(status==='Open'?null:undefined)}});
    if(firstCompletion&&cost>0){
      expense=await insertRow('property_expenses',{property_id:tenancy.property_id,expense_date:vietnamDate(),category:'Maintenance',amount_vnd:cost,
        notes:String(data.issue||item.issue||'Chi phí bảo trì').slice(0,500),created_by:profile.id},jwt);
    }
  }catch(error){
    await request(`/rest/v1/maintenance_items?id=eq.${itemId}`,{method:'PATCH',jwt,body:{status:item.status,cost_vnd:Number(item.cost_vnd||0),issue:item.issue,fixed_at:item.fixed_at}}).catch(()=>{});
    if(expense?.id)await request(`/rest/v1/property_expenses?id=eq.${Number(expense.id)}`,{method:'DELETE',jwt}).catch(()=>{});
    throw error;
  }
  await audit(jwt,'Maintenance Updated',`#${tenancy.id} item #${itemId} → ${status}`);
  return ok({message:'Đã cập nhật bảo trì'});
}

const simpleBody={owners:d=>({name:d.name,phone:d.phone,email:nullableText(d.email),identity_number:nullableText(d.cnic||d.identityNumber),address:d.address,notes:d.notes}),locations:d=>({name:d.name,level:d.level,parent_id:nullableNumber(d.parentId),slug:d.slug||slugify(d.name)}),amenities:d=>({name:d.name,icon:d.icon})};
async function simpleAdd(table,label,args,jwt){const p=await currentProfile(jwt),row=await insertRow(table,{...simpleBody[table](args[0]||{}),created_by:table==='owners'?p.id:undefined},jwt);await audit(jwt,`${label} Added`,row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm dữ liệu'});}
async function simpleUpdate(table,label,args,jwt){const p=await currentProfile(jwt),d=args[0]||{};await patchRow(table,d.id,{...simpleBody[table](d),updated_at:new Date().toISOString(),updated_by:table==='owners'?p.id:undefined},jwt);await audit(jwt,`${label} Updated`,`#${d.id}`);return ok({message:'Đã cập nhật dữ liệu'});}
const addOwner=(a,j)=>simpleAdd('owners','Owner',a,j),updateOwner=(a,j)=>simpleUpdate('owners','Owner',a,j),deleteOwner=(a,j)=>softDelete('owners',a[0],j,'Owner');
const addLocation=(a,j)=>simpleAdd('locations','Location',a,j),updateLocation=(a,j)=>simpleUpdate('locations','Location',a,j),deleteLocation=(a,j)=>softDelete('locations',a[0],j,'Location');
const addAmenity=(a,j)=>simpleAdd('amenities','Amenity',a,j),updateAmenity=(a,j)=>simpleUpdate('amenities','Amenity',a,j),deleteAmenity=(a,j)=>softDelete('amenities',a[0],j,'Amenity');

async function addUser(args,jwt){
  const profile=await currentProfile(jwt);
  if(profile.role_key!=='Admin')return fail('Chỉ Quản trị viên mới có quyền thêm người dùng');
  const data=args[0]||{};
  const username=String(data.Username||'').trim();
  const email=String(data.Email||'').trim().toLowerCase();
  const password=String(data.Password||'').trim();
  if(!username||!email||!password)return fail('Vui lòng điền đầy đủ Tên đăng nhập, Email và Mật khẩu');
  if(password.length<6)return fail('Mật khẩu phải có ít nhất 6 ký tự');
  const existing=await adminSelect('profiles','id',`&username=eq.${enc(username)}&limit=1`);
  if(existing.length)return fail('Tên đăng nhập đã tồn tại');
  const existingEmail=await adminSelect('profiles','id',`&email=eq.${enc(email)}&limit=1`);
  if(existingEmail.length)return fail('Email đã được sử dụng');
  const authUser=await request('/auth/v1/admin/users',{
    method:'POST',admin:true,
    body:{email,password,email_confirm:true,user_metadata:{username}}
  });
  if(!authUser||!authUser.id)return fail('Không thể tạo tài khoản xác thực Supabase');
  const monthlyTarget=Math.max(0,Math.round(Number(data.MonthlyTarget||0)));
  const roleKey=['Admin','Manager','Agent'].includes(data.Role)?data.Role:'Agent';
  const status=['Active','Inactive'].includes(data.Status)?data.Status:'Active';
  await request('/rest/v1/profiles',{
    method:'POST',admin:true,
    body:{id:authUser.id,username,email,role_key:roleKey,status,monthly_target_vnd:monthlyTarget,created_by:profile.id,updated_by:profile.id}
  });
  await audit(jwt,'User Created',`Tạo người dùng: ${username} (${roleKey})`);
  return ok({message:'Đã thêm người dùng thành công'});
}

async function updateUser(args,jwt){
  const profile=await currentProfile(jwt);
  if(profile.role_key!=='Admin')return fail('Chỉ Quản trị viên mới có quyền cập nhật người dùng');
  const targetUsername=args[0];
  const data=args[1]||{};
  if(!targetUsername)return fail('Không xác định được người dùng cần sửa');
  const rows=await adminSelect('profiles','id,username,email,role_key,status',`&username=eq.${enc(targetUsername)}&limit=1`);
  if(!rows.length)return fail('Không tìm thấy người dùng');
  const targetUser=rows[0];
  const updateAuthBody={};
  const newEmail=data.Email?String(data.Email).trim().toLowerCase():(data.email?String(data.email).trim().toLowerCase():'');
  if(newEmail&&newEmail!==targetUser.email){
    const emailCheck=await adminSelect('profiles','id',`&email=eq.${enc(newEmail)}&id=neq.${targetUser.id}&limit=1`);
    if(emailCheck.length)return fail('Email đã được sử dụng bởi tài khoản khác');
    updateAuthBody.email=newEmail;
    updateAuthBody.email_confirm=true;
  }
  const password = data.Password || data.password;
  if(password&&String(password).trim().length>=6){
    updateAuthBody.password=String(password).trim();
  }
  if(Object.keys(updateAuthBody).length>0){
    await request(`/auth/v1/admin/users/${targetUser.id}`,{
      method:'PUT',admin:true,body:updateAuthBody
    });
  }
  const profilePatch={updated_at:new Date().toISOString(),updated_by:profile.id};
  if(newEmail)profilePatch.email=newEmail;
  const role = data.Role || data.role;
  if(role&&['Admin','Manager','Agent'].includes(role))profilePatch.role_key=role;
  const status = data.Status || data.status;
  if(status&&['Active','Inactive'].includes(status))profilePatch.status=status;
  const target = data.MonthlyTarget !== undefined ? data.MonthlyTarget : data.monthlyTarget;
  if(target!==undefined)profilePatch.monthly_target_vnd=Math.max(0,Math.round(Number(target||0)));
  await patchRow('profiles',targetUser.id,profilePatch,null,true);
  await audit(jwt,'User Updated',`Cập nhật người dùng: ${targetUsername}`);
  return ok({message:'Đã cập nhật thông tin người dùng thành công'});
}

async function deleteUser(args,jwt){
  const profile=await currentProfile(jwt);
  if(profile.role_key!=='Admin')return fail('Chỉ Quản trị viên mới có quyền thay đổi trạng thái người dùng');
  const targetUsername=args[0];
  if(!targetUsername)return fail('Không xác định được người dùng cần sửa');
  if(targetUsername===profile.username)return fail('Không thể tự vô hiệu hóa tài khoản của chính mình');
  const rows=await adminSelect('profiles','id,username,status',`&username=eq.${enc(targetUsername)}&limit=1`);
  if(!rows.length)return fail('Không tìm thấy người dùng');
  const targetId=rows[0].id;
  const isCurrentlyActive = rows[0].status === 'Active';
  const newStatus = isCurrentlyActive ? 'Inactive' : 'Active';
  await patchRow('profiles',targetId,{status:newStatus,updated_at:new Date().toISOString(),updated_by:profile.id},null,true);
  const openLeads = isCurrentlyActive ? await select('leads','id',jwt,`&assigned_agent_id=eq.${targetId}&status=not.in.(Won,Lost)&deleted_at=is.null`) : [];
  await audit(jwt, isCurrentlyActive ? 'User Deactivated' : 'User Activated', `${isCurrentlyActive ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản: ${targetUsername}`);
  return ok({
    message: isCurrentlyActive ? 'Đã vô hiệu hóa tài khoản thành công' : 'Đã kích hoạt lại tài khoản thành công',
    openLeads: openLeads.length
  });
}

async function updateMyAccount(args,jwt){
  const profile=await currentProfile(jwt);
  const data=args[1]||args[0]||{};
  const updateAuthBody={};
  if(data.Email&&String(data.Email).trim().toLowerCase()!==profile.email){
    const newEmail=String(data.Email).trim().toLowerCase();
    const emailCheck=await adminSelect('profiles','id',`&email=eq.${enc(newEmail)}&id=neq.${profile.id}&limit=1`);
    if(emailCheck.length)return fail('Email đã được sử dụng bởi tài khoản khác');
    updateAuthBody.email=newEmail;
    updateAuthBody.email_confirm=true;
  }
  if(data.NewPassword){
    const newPass=String(data.NewPassword).trim();
    if(newPass.length<6)return fail('Mật khẩu mới phải có ít nhất 6 ký tự');
    updateAuthBody.password=newPass;
  }
  if(Object.keys(updateAuthBody).length>0){
    await request(`/auth/v1/admin/users/${profile.id}`,{
      method:'PUT',admin:true,body:updateAuthBody
    });
  }
  const patchBody={updated_at:new Date().toISOString(),updated_by:profile.id};
  if(updateAuthBody.email)patchBody.email=updateAuthBody.email;
  await patchRow('profiles',profile.id,patchBody,jwt);
  await audit(jwt,'Account Updated',`Cập nhật tài khoản: ${profile.username}`);
  return ok({message:'Đã cập nhật thông tin tài khoản thành công'});
}

async function reassignAgentWork(args,jwt){
  const profile=await currentProfile(jwt);
  if(!['Admin','Manager'].includes(profile.role_key))return fail('Từ chối truy cập');
  const [fromUsername,toUsername]=args;
  if(!fromUsername||!toUsername)return fail('Vui lòng chọn đầy đủ người chuyển và người nhận');
  if(fromUsername===toUsername)return fail('Người nhận phải khác người chuyển');
  const [fromRows,toRows]=await Promise.all([
    adminSelect('profiles','id',`&username=eq.${enc(fromUsername)}&limit=1`),
    adminSelect('profiles','id',`&username=eq.${enc(toUsername)}&status=eq.Active&limit=1`)
  ]);
  if(!fromRows.length)return fail(`Không tìm thấy người dùng ${fromUsername}`);
  if(!toRows.length)return fail(`Không tìm thấy người dùng ${toUsername} hoặc tài khoản không hoạt động`);
  const fromId=fromRows[0].id,toId=toRows[0].id;
  const now=new Date().toISOString();
  await Promise.all([
    request(`/rest/v1/properties?assigned_agent_id=eq.${fromId}&deleted_at=is.null`,{method:'PATCH',admin:true,body:{assigned_agent_id:toId,updated_at:now,updated_by:profile.id}}),
    request(`/rest/v1/leads?assigned_agent_id=eq.${fromId}&status=not.in.(Won,Lost)&deleted_at=is.null`,{method:'PATCH',admin:true,body:{assigned_agent_id:toId,updated_at:now,updated_by:profile.id}}),
    request(`/rest/v1/follow_ups?assigned_agent_id=eq.${fromId}&status=eq.Pending&deleted_at=is.null`,{method:'PATCH',admin:true,body:{assigned_agent_id:toId,updated_at:now,updated_by:profile.id}}),
    request(`/rest/v1/appointments?agent_id=eq.${fromId}&status=in.(Scheduled,Confirmed)&deleted_at=is.null`,{method:'PATCH',admin:true,body:{agent_id:toId,updated_at:now,updated_by:profile.id}}),
    request(`/rest/v1/deals?agent_id=eq.${fromId}&status=in.(Token,Agreement)&deleted_at=is.null`,{method:'PATCH',admin:true,body:{agent_id:toId,updated_at:now,updated_by:profile.id}})
  ]);
  await audit(jwt,'Work Reassigned',`${fromUsername} → ${toUsername}`);
  return ok({message:`Đã chuyển toàn bộ công việc từ ${fromUsername} sang ${toUsername}`});
}

async function bulkImportUsers(args,jwt){
  const profile=await currentProfile(jwt);
  if(profile.role_key!=='Admin')return fail('Chỉ Quản trị viên mới có quyền nhập người dùng');
  const records=args[0]||[];
  if(!Array.isArray(records)||!records.length)return fail('Không có dữ liệu để nhập');
  let count=0;const errors=[];
  for(const row of records){
    const username=String(row.Username||'').trim();
    const email=String(row.Email||'').trim().toLowerCase();
    const password=String(row.Password||'123456').trim();
    if(!username||!email){errors.push(`Dòng thiếu tên đăng nhập hoặc email`);continue;}
    const res=await addUser([{Username:username,Email:email,Password:password,Role:row.Role||'Agent',Status:row.Status||'Active',MonthlyTarget:Number(row.MonthlyTarget||0)}],jwt);
    if(res.success)count++;else errors.push(`${username}: ${res.message}`);
  }
  return ok({count,errors,message:`Đã nhập ${count}/${records.length} người dùng`});
}

async function getDashboardStats(jwt) {
  const profile = await currentProfile(jwt);
  const [propertiesResult, leadsResult, followUpsResult, appointmentsResult, dealsResult, tenanciesResult, usersResult, activeAgentRows] = await Promise.all([
    getProperties(jwt), getLeads(jwt), getFollowUps(jwt), getAppointments(jwt), getDeals(jwt), getTenancies(jwt), getAllUsers(jwt),
    adminSelect('profiles','id','&status=eq.Active&role_key=eq.Agent')
  ]);
  const properties = propertiesResult.data, leads = leadsResult.data, followUps = followUpsResult.data;
  const appointments = appointmentsResult.data, deals = dealsResult.data, tenancies = tenanciesResult.data;
  const users = usersResult.data || [], now = new Date();
  const vnDateKey = (value) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const today = vnDateKey(now), month = today.slice(0,7);
  const countBy = (items, keys) => Object.fromEntries(keys.map(key => [key,items.filter(item => item.status === key).length]));
  const completed = deals.filter(item => item.status === 'Completed' && String(item.closedAt || '').slice(0,7) === month);
  const seriesIndex = new Map(), leadsSeries = [];
  const todayDate = new Date(`${today}T00:00:00`);
  for (let offset = 89; offset >= 0; offset--) {
    const date = new Date(todayDate); date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0,10); seriesIndex.set(key,leadsSeries.length); leadsSeries.push({d:key,n:0});
  }
  leads.forEach(lead => { const index = seriesIndex.get(String(lead.created || '').slice(0,10)); if (index !== undefined) leadsSeries[index].n++; });
  const funnelOrder = ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won'];
  const activeUsers = users.filter(user => user.Status === 'Active');
  const agency = profile.role_key === 'Admin' || profile.role_key === 'Manager';
  return ok({data:{
    scope:agency?'agency':'own', inventory:countBy(properties,['Draft','Available','Reserved','Sold','Rented','Withdrawn']),
    funnel:countBy(leads,['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won','Lost']),
    activeListings:properties.filter(item=>['Available','Reserved'].includes(item.status)).length,
    featured:properties.filter(item=>item.isFeatured&&item.status==='Available').length,
    totalViews:properties.reduce((sum,item)=>sum+Number(item.viewsCount||0),0),
    openLeads:leads.filter(item=>!['Won','Lost'].includes(item.status)).length,
    wonLeads:leads.filter(item=>item.status==='Won').length,totalLeads:leads.length,
    leadsMonth:leads.filter(item=>String(item.created||'').slice(0,7)===month).length,
    conversionRate:leads.length?Math.round(leads.filter(item=>item.status==='Won').length/leads.length*1000)/10:0,
    overdueFollowUps:followUps.filter(item=>item.status==='Pending'&&item.dueAt&&new Date(item.dueAt)<now).length,
    todayAppointments:appointments.filter(item=>['Scheduled','Confirmed'].includes(item.status)&&item.scheduledAt&&vnDateKey(item.scheduledAt)===today).length,
    recentLeads:leads.slice(0,6),recentProperties:properties.slice(0,6).map(p => ({ ...p, image: (p.images && p.images.length ? (p.images.find(x=>x.isPrimary)||p.images[0]).url : '') || p.image || '' })),
    upcomingViewings:appointments.filter(item=>['Scheduled','Confirmed'].includes(item.status)&&item.scheduledAt&&new Date(item.scheduledAt)>=now)
      .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)).slice(0,6).map(item=>{
        const property=properties.find(p=>String(p.id)===String(item.propertyId));
        const image=property&&property.images&&property.images.length?(property.images.find(x=>x.isPrimary)||property.images[0]).url:'';
        return {id:item.id,when:item.scheduledAt,status:item.status,title:property?.title||item.propertyTitle||`Bất động sản #${item.propertyId}`,
          address:property?.address||property?.locationPath||'',image,lead:item.leadName||'',agent:item.agent||''};
      }),
    leadsSeries,funnelSteps:funnelOrder.map((stage,index)=>({stage,count:index===0?leads.length:leads.filter(lead=>funnelOrder.indexOf(lead.status)>=index).length})),
    dealsMonth:completed.length,dealsMonthValue:completed.reduce((sum,item)=>sum+Number(item.dealAmount||0),0),
    commissionMonth:completed.reduce((sum,item)=>sum+Number(item.commissionAmt||0),0),
    collectedMonth:deals.reduce((sum,item)=>sum+(item.payments||[]).filter(payment=>String(payment.date||'').slice(0,7)===month).reduce((part,payment)=>part+Number(payment.amount||0),0),0),
    payable:deals.filter(item=>item.status==='Completed'&&!item.agentPaidAt).reduce((sum,item)=>sum+Number(item.agentShareAmt||0),0),
    activeAgents:activeAgentRows.length,myTarget:Number(profile.monthly_target_vnd||0),prev:{},
    unassignedLeads:agency?leads.filter(item=>!item.assignedAgent&&!['Won','Lost'].includes(item.status)).length:0,
    activeTenancies:tenancies.filter(item=>item.status==='Active').length,
    rentArrears:tenancies.filter(item=>item.status==='Active').reduce((sum,item)=>sum+Math.max(0,Number(item.arrears||0)),0),
    balanceDue:deals.filter(item=>['Token','Agreement'].includes(item.status)).reduce((sum,item)=>sum+Math.max(0,Number(item.balance||0)),0),
    leaderboard:agency?activeUsers.map(user=>({agent:user.Username,listings:properties.filter(item=>item.assignedAgent===user.Username&&['Available','Reserved'].includes(item.status)).length,openLeads:leads.filter(item=>item.assignedAgent===user.Username&&!['Won','Lost'].includes(item.status)).length,won:leads.filter(item=>item.assignedAgent===user.Username&&item.status==='Won').length,overdue:followUps.filter(item=>item.assignedAgent===user.Username&&item.status==='Pending'&&item.dueAt&&new Date(item.dueAt)<now).length,closed:completed.filter(item=>item.agent===user.Username).length,target:Number(user.MonthlyTarget||0)})):[]
  }});
}

async function getNotifications(jwt) {
  const profile = await currentProfile(jwt);
  const agency = profile.role_key === 'Admin' || profile.role_key === 'Manager';
  const [leadsResult,followUpsResult,appointmentsResult,dealsResult,tenanciesResult] = await Promise.all([
    getLeads(jwt),getFollowUps(jwt),getAppointments(jwt),getDeals(jwt),getTenancies(jwt)
  ]);
  const leads=leadsResult.data||[],followUps=followUpsResult.data||[],appointments=appointmentsResult.data||[];
  const deals=dealsResult.data||[],tenancies=tenanciesResult.data||[],now=new Date();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const todayStart=new Date(`${today}T00:00:00+07:00`),items=[];
  const add=(count,icon,text,page)=>{if(count>0)items.push({icon,text:`${count} ${text}`,page,count});};

  // 0. Khẩn cấp nhất: Lịch hẹn sắp diễn ra trong vòng 60 phút tới
  const upcomingSoon = appointments.filter(x => {
    if (!['Scheduled', 'Confirmed'].includes(x.status) || !x.scheduledAt) return false;
    const apptTime = new Date(x.scheduledAt);
    const diffMin = (apptTime - now) / 60000;
    return diffMin >= 0 && diffMin <= 60;
  });
  if (upcomingSoon.length > 0) {
    items.push({
      icon: 'fa-stopwatch-20',
      text: `⏰ Có ${upcomingSoon.length} lịch xem sắp diễn ra trong 60 phút tới!`,
      page: 'appointments',
      count: upcomingSoon.length,
      urgent: true
    });
  }

  // 1. Nổi bật hàng đầu: Khách hàng mới để lại thông tin từ Website / Cổng thông tin
  const webLeads = leads.filter(x => x.source === 'Website' && x.status === 'New');
  if (webLeads.length > 0) {
    items.push({
      icon: 'fa-globe',
      text: `${webLeads.length} yêu cầu tư vấn mới từ Cổng thông tin`,
      page: 'leads',
      count: webLeads.length
    });
  }

  // 2. Khách hàng chưa được phân công khác (ngoài Website)
  const otherUnassigned = leads.filter(x => !x.assignedAgent && !['Won','Lost'].includes(x.status) && x.source !== 'Website');
  if (agency && otherUnassigned.length > 0) {
    add(otherUnassigned.length, 'fa-user-plus', 'khách hàng chưa được phân công', 'leads');
  }

  add(followUps.filter(x=>x.status==='Pending'&&x.dueAt&&new Date(x.dueAt)<now).length,'fa-triangle-exclamation','lịch chăm sóc đã quá hạn','followups');
  add(appointments.filter(x=>['Scheduled','Confirmed'].includes(x.status)&&String(x.scheduledAt||'').slice(0,10)===today).length,'fa-calendar-check','lịch xem trong hôm nay','appointments');
  add(deals.filter(x=>['Token','Agreement'].includes(x.status)).length,'fa-handshake','giao dịch đang xử lý','deals');
  if(agency)add(deals.filter(x=>x.status==='Completed'&&!x.agentPaidAt).length,'fa-money-bill-wave','khoản hoa hồng chưa thanh toán','deals');
  const activeTenancies=tenancies.filter(x=>x.status==='Active');
  add(activeTenancies.filter(x=>Number(x.arrears||0)>0).length,'fa-house-circle-exclamation','hợp đồng thuê đang có công nợ','tenancies');
  add(activeTenancies.filter(x=>{if(!x.endDate)return false;const end=new Date(`${String(x.endDate).slice(0,10)}T00:00:00+07:00`),days=(end-todayStart)/864e5;return days>=0&&days<=30;}).length,'fa-file-signature','hợp đồng thuê sẽ hết hạn trong 30 ngày','tenancies');
  return ok({items});
}

function numberToVietnameseWords(num) {
  num = Math.round(Number(num || 0));
  if (!num || isNaN(num)) return 'Không đồng';
  if (num < 0) return 'Âm ' + numberToVietnameseWords(Math.abs(num));

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readGroup(group, isFirst) {
    let a = Math.floor(group / 100);
    let b = Math.floor((group % 100) / 10);
    let c = group % 10;
    let res = '';

    if (a > 0 || !isFirst) {
      res += digits[a] + ' trăm ';
    }

    if (b > 1) {
      res += digits[b] + ' mươi ';
      if (c === 1) res += 'mốt ';
      else if (c === 5) res += 'lăm ';
      else if (c > 0) res += digits[c] + ' ';
    } else if (b === 1) {
      res += 'mười ';
      if (c === 5) res += 'lăm ';
      else if (c > 0) res += digits[c] + ' ';
    } else if (b === 0 && c > 0) {
      if (a > 0 || !isFirst) res += 'lẻ ';
      res += digits[c] + ' ';
    }

    return res.trim();
  }

  let groups = [];
  let temp = num;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    let grp = groups[i];
    if (grp > 0) {
      let grpText = readGroup(grp, i === groups.length - 1);
      result += grpText + ' ' + units[i] + ' ';
    }
  }

  result = result.trim() + ' đồng chẵn';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

const docMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const docMoneyWithWords = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫ (${numberToVietnameseWords(n)})`;
const docDate = (v) => v ? new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '____________';
const padNo = (n) => String(n).padStart(4, '0');
const docNo = (prefix, id) => `${prefix}-${new Date().getFullYear()}-${padNo(id)}`;
const docEsc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]);

// Memory store for custom templates fallback
let customContractTemplates = {};

function getDefaultContractTemplates() {
  return [
    {
      key: 'rental',
      label: 'HĐ Thuê Bất Động Sản',
      shortLabel: 'HĐ Thuê',
      icon: 'fa-file-signature',
      src: 'ten',
      hint: 'Hợp đồng chủ nhà – người thuê gồm điều khoản thương mại, tiền cọc, số tiền bằng chữ và 6 điều khoản chuẩn',
      isCustom: false
    },
    {
      key: 'sale',
      label: 'HĐ Cọc Mua Bán',
      shortLabel: 'Cọc Mua Bán',
      icon: 'fa-file-contract',
      src: 'deal',
      hint: 'Hợp đồng đặt cọc chuyển nhượng — các bên, giá trị, tiến độ thanh toán, cam kết và phạt cọc',
      isCustom: false
    },
    {
      key: 'handover',
      label: 'Biên Bản Bàn Giao Hiện Trạng',
      shortLabel: 'Bàn Giao',
      icon: 'fa-clipboard-check',
      src: 'ten',
      hint: 'Biên bản bàn giao chìa khóa, chỉ số đồng hồ điện nước và hiện trạng trang thiết bị',
      isCustom: false
    },
    {
      key: 'exclusive',
      label: 'HĐ Dịch Vụ Môi Giới Độc Quyền',
      shortLabel: 'MG Độc Quyền',
      icon: 'fa-handshake-angle',
      src: 'deal',
      hint: 'Hợp đồng cam kết dịch vụ môi giới độc quyền, biểu phí hoa hồng và trách nhiệm truyền thông',
      isCustom: false
    },
    {
      key: 'receipt',
      label: 'Phiếu Thu Giao Dịch',
      shortLabel: 'Phiếu Thu',
      icon: 'fa-receipt',
      src: 'deal',
      hint: 'Xác nhận toàn bộ các đợt thanh toán đã thu của giao dịch, số tiền bằng chữ và số dư còn lại',
      isCustom: false
    },
    {
      key: 'rentreceipt',
      label: 'Bảng Kê Tiền Thuê',
      shortLabel: 'Kê Tiền Thuê',
      icon: 'fa-file-invoice',
      src: 'ten',
      hint: 'Bảng kê các kỳ tiền thuê đã thu, số phải thu đến hiện tại và tổng công nợ còn thiếu',
      isCustom: false
    },
    {
      key: 'dues',
      label: 'Thông Báo Công Nợ',
      shortLabel: 'Báo Công Nợ',
      icon: 'fa-triangle-exclamation',
      src: 'deal',
      hint: 'Bảng tổng hợp công nợ giao dịch với số tiền còn phải thanh toán nổi bật',
      isCustom: false
    },
    {
      key: 'invoice',
      label: 'Hóa Đơn Hoa Hồng',
      shortLabel: 'HĐ Hoa Hồng',
      icon: 'fa-file-invoice-dollar',
      src: 'deal',
      hint: 'Hóa đơn phí môi giới dịch vụ (mã HDHH) cho giao dịch hoàn tất',
      isCustom: false
    }
  ];
}

async function getContractTemplates(jwt) {
  const defaults = getDefaultContractTemplates();
  try {
    const res = await getAppSettings(jwt);
    const saved = res.data && res.data.contract_templates;
    if (saved && typeof saved === 'object') {
      return ok({ templates: Object.values({ ...defaults.reduce((acc, x) => ({ ...acc, [x.key]: x }), {}), ...saved }) });
    }
  } catch (e) {}
  return ok({ templates: defaults });
}

async function saveContractTemplate(args, jwt) {
  const [templateKey, templateData] = args;
  if (!templateKey || !templateData) return fail('Thông tin mẫu hợp đồng không hợp lệ');
  customContractTemplates[templateKey] = { ...templateData, key: templateKey, isCustom: true, updatedAt: new Date().toISOString() };
  await audit(jwt, 'Contract Template Saved', `Template: ${templateKey}`);
  return ok({ message: 'Đã lưu mẫu hợp đồng thành công!', template: customContractTemplates[templateKey] });
}

async function resetContractTemplates(jwt) {
  customContractTemplates = {};
  await audit(jwt, 'Contract Templates Reset', 'All templates reset to defaults');
  return ok({ message: 'Đã đặt lại tất cả mẫu hợp đồng về mặc định!' });
}

function docShell(title, refNo, body, branding) {
  const brandName = branding?.agencyName || 'BĐS MASTER CRM';
  const hotline = branding?.phone || '0900 000 000';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
body { font-family: "PT Serif", Georgia, "Times New Roman", serif; margin: 0; color: #1a1a1a; background: #fff; -webkit-font-smoothing: antialiased; }
.sheet { width: 210mm; min-height: 297mm; padding: 15mm 18mm 15mm; margin: 0 auto; box-sizing: border-box; }
.hd { width: 100%; border-bottom: 3px solid #001f3f; padding-bottom: 12px; margin-bottom: 15px; }
.hd td { vertical-align: middle; }
.agency { font-family: "PT Sans", "Segoe UI", Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #001f3f; letter-spacing: 1px; }
.agency small { display: block; font-size: 11px; color: #555; font-weight: 400; letter-spacing: .2px; margin-top: 3px; }
.doc-meta { font-family: "PT Sans", Helvetica, Arial, sans-serif; text-align: right; font-size: 11.5px; color: #444; line-height: 1.6; }
.doc-meta b { color: #001f3f; }
h1 { font-family: "PT Sans", Helvetica, Arial, sans-serif; text-align: center; font-size: 19px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #001f3f; margin: 18px 0 4px; }
h1 + .rule { width: 80px; height: 3px; background: #001f3f; margin: 0 auto 12px; }
h2 { font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #001f3f; border-bottom: 1px solid #c9d4e0; padding-bottom: 4px; margin: 18px 0 8px; }
p, li { font-size: 12.5px; line-height: 1.65; text-align: justify; }
table.tb { width: 100%; border-collapse: collapse; margin: 8px 0; page-break-inside: avoid; }
table.tb th { background: #eef2f7; color: #001f3f; font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
table.tb th, table.tb td { border: 1px solid #b9c4d1; padding: 7px 10px; font-size: 12px; text-align: left; vertical-align: top; }
table.tb td.r, table.tb th.r { text-align: right; }
ol.cl { margin: 6px 0 0 18px; padding: 0; } ol.cl li { margin: 6px 0; padding-left: 4px; }
.total-box { border: 2px solid #001f3f; background: #f4f7fb; padding: 10px 16px; margin-top: 12px; font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #001f3f; text-align: right; letter-spacing: .5px; }
table.sig { width: 100%; margin-top: 40px; page-break-inside: avoid; } table.sig td { width: 33%; text-align: center; font-size: 11.5px; padding: 0 10px; vertical-align: top; }
.sigline { border-top: 1.5px solid #333; padding-top: 6px; margin-top: 40px; }
.ft { margin-top: 30px; border-top: 1px solid #c9d4e0; padding-top: 10px; font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 10px; color: #777; text-align: center; line-height: 1.5; }
</style></head><body><div class="sheet">
<table class="hd"><tr>
<td><div class="agency">${docEsc(brandName)}<small>Bất động sản · Mua bán &amp; Cho thuê · Quản lý tài sản — Hotline/Zalo: ${docEsc(hotline)}</small></div></td>
<td class="doc-meta">Mã văn bản: <b>${docEsc(refNo)}</b><br/>Ngày lập: <b>${docDate(new Date())}</b></td>
</tr></table>
<h1>${docEsc(title)}</h1><div class="rule"></div>
${body}
<div class="ft">Hệ thống ${docEsc(brandName)} khởi tạo ngày ${docDate(new Date())} · Mã số ${docEsc(refNo)}<br/>
Phụ lục thông tin bất động sản là một phần không thể tách rời của văn bản này.</div>
</div></body></html>`;
}

function docParties(aLbl, aName, aPhone, bLbl, bName, bPhone) {
  return `<h2>Các Bên Tham Gia</h2><table class="tb">
<tr><th style="width:24%">${docEsc(aLbl)}</th><td><b>${docEsc(aName || '—')}</b>${aPhone ? ' &nbsp;·&nbsp; Điện thoại/Zalo: ' + docEsc(aPhone) : ''}</td></tr>
<tr><th>${docEsc(bLbl)}</th><td><b>${docEsc(bName || '—')}</b>${bPhone ? ' &nbsp;·&nbsp; Điện thoại/Zalo: ' + docEsc(bPhone) : ''}</td></tr></table>`;
}

function docProperty(p, locPath, amens) {
  p = p || {};
  const v = (x) => (x === null || x === undefined || x === '') ? '—' : docEsc(x);
  const feats = (p.amenityIds || []).map(i => amens[i]).filter(Boolean).map(docEsc);
  const demand = p.price ? docMoney(p.price) + (p.listingType === 'Rent' ? ' / ' + (p.rentFrequency === 'Yearly' ? 'năm' : 'tháng') : '') : '—';
  return `<h2>Thông Tin Bất Động Sản</h2><table class="tb">
<tr><th style="width:22%">Mã tin đăng</th><td style="width:28%"><b>${v(p.referenceCode)}</b></td><th style="width:22%">Loại hình</th><td>${v(p.propertyType)}</td></tr>
<tr><th>Mục đích</th><td>${p.listingType === 'Rent' ? 'Cho thuê' : 'Bán'}</td><th>Trạng thái</th><td>${v(p.status)}</td></tr>
<tr><th>Tiêu đề</th><td colspan="3"><b>${v(p.title)}</b></td></tr>
<tr><th>Khu vực</th><td colspan="3">${v(locPath || p.locationPath)}</td></tr>
<tr><th>Địa chỉ chi tiết</th><td colspan="3">${v(p.address)}</td></tr>
<tr><th>Diện tích</th><td>${p.areaSize ? `${p.areaSize} ${p.areaUnit || 'm²'}` : '—'}</td><th>Phòng ngủ / Tắm</th><td>${v(p.bedrooms)} phòng ngủ / ${v(p.bathrooms)} WC</td></tr>
<tr><th>Mức giá niêm yết</th><td colspan="3"><b>${demand}</b></td></tr>
${feats.length ? `<tr><th>Tiện ích &amp; Đặc điểm</th><td colspan="3">${feats.join(' &nbsp;·&nbsp; ')}</td></tr>` : ''}
${p.description ? `<tr><th>Mô tả chi tiết</th><td colspan="3">${docEsc(p.description)}</td></tr>` : ''}
</table>`;
}

function docSig(aLbl, aName, bLbl, bName) {
  return `<table class="sig"><tr>
<td><div class="sigline"><b>${docEsc(aLbl)}</b><br/>${docEsc(aName || '')}</div></td>
<td><div class="sigline"><b>Người làm chứng 1</b><br/>(Ký, ghi rõ họ tên)</div></td>
<td><div class="sigline"><b>${docEsc(bLbl)}</b><br/>${docEsc(bName || '')}</div></td>
</tr><tr><td colspan="3" style="padding-top:20px"><div class="sigline" style="width:34%;margin:20px auto 0"><b>Người làm chứng 2 / Đại diện môi giới</b><br/>(Ký, đóng dấu)</div></td></tr></table>`;
}

function docPayRows(pays) {
  return (pays || []).map((q, i) =>
    `<tr><td>${i + 1}</td><td>${docDate(q.date)}</td><td>${docEsc(q.method || 'Chuyển khoản')}</td><td>${docEsc(q.ref || '—')}</td><td class="r"><b>${docMoney(q.amount)}</b></td></tr>`
  ).join('');
}

async function buildAgreement(args, jwt) {
  const [docType, recordId] = args;
  const id = Number(recordId);
  if (!docType || !id) return fail('Vui lòng chọn loại tài liệu và hồ sơ hợp lệ');

  const [brandingRes, locationsRes, amenitiesRes] = await Promise.all([
    getAgencyBranding(jwt), getLocations(jwt), getAmenities(jwt)
  ]);
  const branding = brandingRes.data || {};
  const locations = locationsRes.data || [];
  const amens = {};
  (amenitiesRes.data || []).forEach(a => { amens[a.id] = a.name; });

  let html = '', title = '', refNo = '';

  if (['rental', 'rentreceipt', 'handover'].includes(docType)) {
    const tensRes = await getTenancies(jwt);
    const t = (tensRes.data || []).find(x => Number(x.id) === id);
    if (!t) return fail('Không tìm thấy hợp đồng thuê');
    const propsRes = await getProperties(jwt);
    const tp = (propsRes.data || []).find(p => Number(p.id) === Number(t.propertyId)) || {};
    const locPath = locationPath(locations.map(item => ({...item, parent_id:item.parentId})), tp.locationId);

    if (docType === 'rental') {
      title = 'HỢP ĐỒNG THUÊ BẤT ĐỘNG SẢN';
      refNo = docNo('HDT', t.id);
      html = docParties('BÊN CHO THUÊ (BÊN A)', tp.ownerName || 'Chủ sở hữu', tp.ownerPhone || '', 'BÊN THUÊ (BÊN B)', t.tenantName, t.tenantPhone) +
        docProperty(tp, locPath, amens) +
        `<h2>Điều Khoản Thương Mại &amp; Thanh Toán</h2><table class="tb">
<tr><th style="width:30%">Giá thuê hàng tháng</th><td class="r"><b>${docMoney(t.monthlyRent)}</b><br/><small style="color:#555">Bằng chữ: <em>${numberToVietnameseWords(t.monthlyRent)}</em></small></td></tr>
<tr><th>Tiền đặt cọc (hoàn lại)</th><td class="r"><b>${docMoney(t.securityDeposit)}</b><br/><small style="color:#555">Bằng chữ: <em>${numberToVietnameseWords(t.securityDeposit)}</em></small></td></tr>
<tr><th>Ngày đến hạn thanh toán</th><td class="r">Ngày <b>${t.rentDueDay || 1}</b> hàng tháng</td></tr>
<tr><th>Ngày bắt đầu thuê</th><td class="r">${docDate(t.startDate)}</td></tr>
<tr><th>Ngày kết thúc thuê</th><td class="r">${t.endDate ? docDate(t.endDate) : 'Gia hạn theo thỏa thuận'}</td></tr>
</table>
<h2>Điều Khoản Hợp Đồng Thuê Nhà</h2><ol class="cl">
<li>Bên thuê sử dụng bất động sản đúng mục đích để ở hoặc kinh doanh hợp pháp, không sử dụng vào các mục đích trái pháp luật.</li>
<li>Bên thuê có trách nhiệm thanh toán tiền thuê đúng ngày quy định hàng tháng. Quá hạn 7 ngày sẽ bị tính phí chậm trả hoặc chấm dứt hợp đồng.</li>
<li>Tiền đặt cọc sẽ được hoàn trả cho Bên thuê sau khi bàn giao lại nhà và khấu trừ các chi phí điện, nước, dịch vụ còn nợ hoặc hư hỏng tài sản.</li>
<li>Các chi phí điện, nước, internet, phí quản lý tòa nhà trong thời gian thuê do Bên thuê chi trả theo thực tế sử dụng.</li>
<li>Bên thuê không được tự ý sửa chữa kết cấu, cho thuê lại hoặc chuyển nhượng quyền thuê khi chưa có sự đồng ý bằng văn bản của Bên cho thuê.</li>
<li>Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận. Tranh chấp sẽ được ưu tiên giải quyết qua thương lượng.</li>
</ol>
<p style="margin-top:14px">Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.</p>` +
        docSig('ĐẠI DIỆN BÊN CHO THUÊ', tp.ownerName || '', 'ĐẠI DIỆN BÊN THUÊ', t.tenantName);
    } else if (docType === 'handover') {
      title = 'BIÊN BẢN BÀN GIAO NHÀ &amp; HIỆN TRẠNG TÀI SẢN';
      refNo = docNo('BBBG', t.id);
      html = docParties('BÊN BÀN GIAO (BÊN A)', tp.ownerName || 'Chủ sở hữu', tp.ownerPhone || '', 'BÊN TIẾP NHẬN (BÊN B)', t.tenantName, t.tenantPhone) +
        docProperty(tp, locPath, amens) +
        `<h2>Chỉ Số Đồng Hồ Điện - Nước &amp; Chìa Khóa</h2><table class="tb">
<tr><th style="width:30%">Chỉ số đồng hồ điện</th><td>......................... kWh</td><th style="width:25%">Số lượng chìa khóa</th><td>02 bộ hoàn chỉnh</td></tr>
<tr><th>Chỉ số đồng hồ nước</th><td>......................... m³</td><th>Thẻ cư dân / Thang máy</th><td>02 thẻ hoạt động tốt</td></tr>
</table>
<h2>Hiện Trạng Trang Thiết Bị Bàn Giao</h2><table class="tb">
<tr><th style="width:6%">STT</th><th>Hạng mục</th><th>Số lượng</th><th>Tình trạng hiện tại</th><th>Ghi chú</th></tr>
<tr><td>1</td><td>Hệ thống đèn chiếu sáng</td><td>Đầy đủ</td><td>Hoạt động bình thường</td><td>Không nứt vỡ</td></tr>
<tr><td>2</td><td>Máy điều hòa không khí</td><td>${tp.bedrooms || 1} cái</td><td>Làm lạnh tốt, có remote</td><td>Đã vệ sinh</td></tr>
<tr><td>3</td><td>Thiết bị vệ sinh &amp; bình nóng lạnh</td><td>${tp.bathrooms || 1} bộ</td><td>Không rò rỉ, áp lực nước tốt</td><td>Đạt chuẩn</td></tr>
<tr><td>4</td><td>Khóa cửa chính &amp; cửa phòng</td><td>Đầy đủ</td><td>Đóng mở trơn tru</td><td>Có chìa khóa phụ</td></tr>
</table>
<p style="margin-top:14px">Bên B xác nhận đã kiểm tra thực tế và tiếp nhận đầy đủ tài sản nêu trên. Hai bên cùng ký xác nhận.</p>` +
        docSig('ĐẠI DIỆN BÊN BÀN GIAO', tp.ownerName || '', 'ĐẠI DIỆN BÊN TIẾP NHẬN', t.tenantName);
    } else {
      title = 'PHIẾU THU &amp; BẢNG KÊ TIỀN THUÊ NHÀ';
      refNo = docNo('PTT', t.id);
      const rentLog = t.rentLog || [];
      const collected = Number(t.collected || 0);
      const arrears = Number(t.arrears || 0);
      html = docParties('BÊN CHO THUÊ', tp.ownerName || 'Chủ sở hữu', tp.ownerPhone || '', 'BÊN THUÊ', t.tenantName, t.tenantPhone) +
        docProperty(tp, locPath, amens) +
        `<h2>Lịch Sử Thanh Toán Tiền Thuê</h2><table class="tb">
<tr><th style="width:6%">STT</th><th>Kỳ tiền thuê</th><th>Ngày đóng</th><th>Hình thức</th><th>Người thu</th><th class="r">Số tiền</th></tr>
${rentLog.length ? rentLog.map((q, i) => `<tr><td>${i+1}</td><td>${docEsc(q.month)}</td><td>${docDate(q.paidAt)}</td><td>${docEsc(q.method || 'Chuyển khoản')}</td><td>${docEsc(q.receivedBy || '')}</td><td class="r"><b>${docMoney(q.amount)}</b></td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#888">Chưa có lịch sử thu tiền</td></tr>'}
<tr><th colspan="5" class="r">TỔNG ĐÃ THU</th><th class="r"><b>${docMoney(collected)}</b></th></tr></table>
<table class="tb">
<tr><th style="width:34%">Số dư công nợ còn thiếu</th><td class="r" style="${arrears > 0 ? 'color:#c0392b;font-weight:bold' : 'color:#2e7d32;font-weight:bold'}">${docMoney(arrears)}</td></tr></table>
<div class="total-box" style="${arrears > 0 ? 'border-color:#c0392b;color:#c0392b' : 'border-color:#2e7d32;color:#2e7d32'}">
${arrears > 0 ? `CÔNG NỢ CẦN THU: ${docMoney(arrears)} (${numberToVietnameseWords(arrears)})` : 'ĐÃ HOÀN TẤT — KHÔNG CÒN NỢ'}
</div>` +
        docSig('ĐẠI DIỆN THU TIỀN', '', 'NGƯỜI NỘP TIỀN', t.tenantName);
    }
  } else {
    const dealsRes = await getDeals(jwt);
    const d = (dealsRes.data || []).find(x => Number(x.id) === id);
    if (!d) return fail('Không tìm thấy giao dịch');
    const propsRes = await getProperties(jwt);
    const dp = (propsRes.data || []).find(p => Number(p.id) === Number(d.propertyId)) || {};
    const locPath = locationPath(locations.map(item => ({...item, parent_id:item.parentId})), dp.locationId);
    const paid = Number(d.paid || 0);
    const balance = Number(d.balance || 0);

    if (docType === 'sale') {
      title = 'HỢP ĐỒNG ĐẶT CỌC CHUYỂN NHƯỢNG BẤT ĐỘNG SẢN';
      refNo = docNo('HDC', d.id);
      html = docParties('BÊN BÁN / BÊN CHUYỂN NHƯỢNG', dp.ownerName || 'Chủ sở hữu', dp.ownerPhone || '', 'BÊN MUA / BÊN NHẬN CHUYỂN NHƯỢNG', d.buyerName, d.buyerPhone) +
        docProperty(dp, locPath, amens) +
        `<h2>Giá Trị Giao Dịch &amp; Tiến Độ Thanh Toán</h2><table class="tb">
<tr><th style="width:34%">Tổng giá trị chuyển nhượng</th><td class="r"><b>${docMoney(d.dealAmount)}</b><br/><small style="color:#555">Bằng chữ: <em>${numberToVietnameseWords(d.dealAmount)}</em></small></td></tr>
<tr><th>Tổng tiền đã thanh toán / đặt cọc</th><td class="r"><b>${docMoney(paid)}</b><br/><small style="color:#555">Bằng chữ: <em>${numberToVietnameseWords(paid)}</em></small></td></tr>
<tr><th>Số tiền còn lại phải thanh toán</th><td class="r"><b style="color:#c0392b">${docMoney(balance)}</b><br/><small style="color:#555">Bằng chữ: <em>${numberToVietnameseWords(balance)}</em></small></td></tr></table>
${(d.payments || []).length ? `<h2>Lịch Sử Đặt Cọc &amp; Thanh Toán</h2><table class="tb"><tr><th style="width:6%">#</th><th>Ngày nộp</th><th>Hình thức</th><th>Mã tham chiếu</th><th class="r">Số tiền</th></tr>${docPayRows(d.payments)}</table>` : ''}
<h2>Các Điều Khoản Cam Kết</h2><ol class="cl">
<li>Bên bán cam kết bất động sản có quyền sở hữu hợp pháp, không bị tranh chấp, kê biên, thế chấp trái quy định.</li>
<li>Số tiền đặt cọc được trừ vào tổng giá chuyển nhượng khi ký kết hợp đồng công chứng chuyển nhượng quyền sử dụng đất và tài sản.</li>
<li>Nếu Bên mua từ chối mua mà không do lỗi Bên bán thì mất số tiền đặt cọc; nếu Bên bán từ chối bán thì phải hoàn trả số tiền đặt cọc và bồi thường số tiền tương đương.</li>
<li>Hai bên có trách nhiệm phối hợp thực hiện thủ tục công chứng sang tên theo đúng tiến độ đã thỏa thuận.</li>
</ol>
<p style="margin-top:14px">Hợp đồng được lập thành 02 bản có giá trị như nhau, có hiệu lực kể từ ngày ký.</p>` +
        docSig('BÊN BÁN', dp.ownerName || '', 'BÊN MUA', d.buyerName);
    } else if (docType === 'exclusive') {
      title = 'HỢP ĐỒNG DỊCH VỤ MÔI GIỚI BẤT ĐỘNG SẢN ĐỘC QUYỀN';
      refNo = docNo('HDMG', d.id);
      html = docParties('BÊN ỦY QUYỀN (CHỦ SỞ HỮU)', dp.ownerName || 'Chủ sở hữu', dp.ownerPhone || '', 'BÊN NHẬN ỦY QUYỀN (SÀN BĐS)', branding.agencyName || 'BĐS MASTER CRM', branding.phone || '') +
        docProperty(dp, locPath, amens) +
        `<h2>Thời Hạn Ủy Quyền &amp; Phí Dịch Vụ Môi Giới</h2><table class="tb">
<tr><th style="width:34%">Mức giá bán / cho thuê cam kết</th><td class="r"><b>${docMoney(dp.price || d.dealAmount)}</b><br/><small style="color:#555">Bằng chữ: <em>${numberToVietnameseWords(dp.price || d.dealAmount)}</em></small></td></tr>
<tr><th>Phí dịch vụ hoa hồng</th><td class="r"><b>${d.commissionPct || 1.5}%</b> trên tổng giá trị giao dịch thành công</td></tr>
<tr><th>Thời hạn độc quyền</th><td class="r">90 ngày kể từ ngày ký hợp đồng</td></tr>
</table>
<h2>Cam Kết Trách Nhiệm Của Sàn Giao Dịch</h2><ol class="cl">
<li>Sàn cam kết triển khai toàn diện các kênh truyền thông, quảng cáo, tiếp thị bất động sản đến mạng lưới khách hàng tiềm năng.</li>
<li>Tư vấn chính xác thủ tục pháp lý, hỗ trợ hai bên thương lượng giá cả và tiến độ thanh toán an toàn, minh bạch.</li>
<li>Bảo mật tuyệt đối thông tin cá nhân của Chủ sở hữu theo quy định pháp luật.</li>
</ol>` +
        docSig('ĐẠI DIỆN SÀN GIAO DỊCH', branding.agencyName || '', 'CHỦ SỞ HỮU BẤT ĐỘNG SẢN', dp.ownerName || '');
    } else if (docType === 'receipt') {
      title = 'PHIẾU THU TIỀN GIAO DỊCH';
      refNo = docNo('PTG', d.id);
      html = `<p>Xác nhận đã nhận từ Ông/Bà <b>${docEsc(d.buyerName)}</b> (SĐT/Zalo: <b>${docEsc(d.buyerPhone)}</b>) các khoản thanh toán cho giao dịch bất động sản <b>${docEsc(dp.referenceCode || '')}</b> — ${docEsc(dp.title || '')}:</p>` +
        docProperty(dp, locPath, amens) +
        `<h2>Chi Tiết Các Khoản Đã Thu</h2><table class="tb"><tr><th style="width:6%">#</th><th>Ngày nộp</th><th>Hình thức</th><th>Mã tham chiếu</th><th class="r">Số tiền</th></tr>${docPayRows(d.payments)}
<tr><th colspan="4" class="r">TỔNG TIỀN ĐÃ THU</th><th class="r"><b>${docMoney(paid)}</b></th></tr></table>
<table class="tb"><tr><th style="width:34%">Tổng giá trị giao dịch</th><td class="r"><b>${docMoney(d.dealAmount)}</b></td></tr>
<tr><th>Số tiền còn lại</th><td class="r"><b>${docMoney(balance)}</b></td></tr></table>
<div class="total-box">TỔNG ĐÃ THU: ${docMoney(paid)} (${numberToVietnameseWords(paid)})</div>` +
        docSig('ĐẠI DIỆN THU TIỀN', `Nhân viên: ${d.agent || ''}`, 'NGƯỜI NỘP TIỀN', d.buyerName);
    } else if (docType === 'dues') {
      title = 'THÔNG BÁO SỐ DƯ &amp; CÔNG NỢ THANH TOÁN';
      refNo = docNo('TBCN', d.id);
      html = docParties('BÊN MUA / KHÁCH HÀNG', d.buyerName, d.buyerPhone, 'ĐƠN VỊ PHỤ TRÁCH', `${branding.agencyName || 'BĐS MASTER CRM'} — ${d.agent || 'Bộ phận giao dịch'}`, '') +
        docProperty(dp, locPath, amens) +
        `<h2>Bảng Tổng Hợp Công Nợ Giao Dịch</h2><table class="tb">
<tr><th style="width:34%">Tổng giá trị giao dịch</th><td class="r"><b>${docMoney(d.dealAmount)}</b></td></tr>
<tr><th>Tổng số tiền đã nộp</th><td class="r"><b>${docMoney(paid)}</b></td></tr>
<tr><th>Trạng thái giao dịch</th><td class="r">${docEsc(d.status)}</td></tr></table>
${(d.payments || []).length ? `<h2>Lịch Sử Đã Thanh Toán</h2><table class="tb"><tr><th style="width:6%">#</th><th>Ngày nộp</th><th>Hình thức</th><th>Mã tham chiếu</th><th class="r">Số tiền</th></tr>${docPayRows(d.payments)}</table>` : ''}
<div class="total-box" style="border-color:#c0392b;color:#c0392b">SỐ TIỀN CÒN PHẢI THANH TOÁN: ${docMoney(balance)} (${numberToVietnameseWords(balance)})</div>
<p style="font-size:11.5px;color:#555;margin-top:10px">Kính đề nghị Quý khách hoàn tất thanh toán số tiền còn lại đúng hạn. Chi tiết xin liên hệ chuyên viên phụ trách (${docEsc(d.agent || '')}).</p>` +
        docSig('ĐẠI DIỆN CÔNG TY', '', 'NGƯỜI NHẬN THÔNG BÁO', d.buyerName);
    } else if (docType === 'invoice') {
      title = 'HÓA ĐƠN HOA HỒNG MÔI GIỚI';
      refNo = docNo('HDHH', d.id);
      html = `<h2>Thông Tin Hóa Đơn</h2><table class="tb">
<tr><th style="width:24%">Khách hàng / Đối tác</th><td><b>${docEsc(dp.ownerName || d.buyerName)}</b></td></tr>
<tr><th>Bất động sản</th><td>${docEsc(dp.referenceCode || '')} — ${docEsc(dp.title || '')}</td></tr>
<tr><th>Giao dịch</th><td>${d.dealType === 'Rent' ? 'Cho thuê' : 'Bán'} · Hoàn tất ngày ${docDate(d.closedAt || d.updated)} · Chuyên viên: ${docEsc(d.agent || '')}</td></tr></table>` +
        docProperty(dp, locPath, amens) +
        `<h2>Chi Phí Dịch Vụ Môi Giới</h2><table class="tb">
<tr><th style="width:6%">#</th><th>Khoản mục</th><th class="r" style="width:26%">Số tiền</th></tr>
<tr><td>1</td><td>Phí dịch vụ môi giới giao dịch (${d.commissionPct}% trên tổng giá trị ${docMoney(d.dealAmount)})</td><td class="r"><b>${docMoney(d.commissionAmt)}</b></td></tr>
<tr><th colspan="2" class="r">TỔNG CỘNG THANH TOÁN</th><th class="r"><b>${docMoney(d.commissionAmt)}</b></th></tr></table>
<div class="total-box">TỔNG TIỀN PHẢI TRẢ: ${docMoney(d.commissionAmt)} (${numberToVietnameseWords(d.commissionAmt)})</div>` +
        docSig('ĐẠI DIỆN CÔNG TY', '', 'KHÁCH HÀNG / ĐỐI TÁC', dp.ownerName || d.buyerName);
    } else {
      return fail('Loại tài liệu không hợp lệ');
    }
  }

  const fullHtml = docShell(title, refNo, html, branding);
  await audit(jwt, 'Document Generated', `${title} ${refNo}`);
  return ok({ html: fullHtml, title: `${title} · ${refNo}`, filename: `${refNo}.html` });
}

async function agreementPdf(args, jwt) {
  return buildAgreement(args, jwt);
}

async function getTrash(jwt) {
  const p = await currentProfile(jwt);
  if (p.role_key !== 'Admin') return fail('Chỉ Quản trị viên mới có quyền xem Thùng rác');

  const [properties, leads, followUps, appointments, deals, tenancies, owners, locations, amenities] = await Promise.all([
    adminSelect('properties', 'id, reference_code, title, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('leads', 'id, full_name, phone, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('follow_ups', 'id, type, notes, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('appointments', 'id, scheduled_at, lead_id, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('deals', 'id, buyer_name, deal_amount_vnd, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('tenancies', 'id, tenant_name, monthly_rent_vnd, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('owners', 'id, name, phone, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('locations', 'id, name, level, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc'),
    adminSelect('amenities', 'id, name, deleted_at, updated_at', '&deleted_at=not.is.null&order=deleted_at.desc')
  ]);

  const out = [];
  (properties || []).forEach(x => out.push({ sheet: 'PROPERTIES', type: 'Property', id: x.id, updated: x.deleted_at || x.updated_at, title: x.title ? `${x.reference_code ? x.reference_code + ' - ' : ''}${x.title}` : `#${x.id}` }));
  (leads || []).forEach(x => out.push({ sheet: 'LEADS', type: 'Lead', id: x.id, updated: x.deleted_at || x.updated_at, title: `${x.full_name || 'Khách hàng'} (${x.phone || 'Không có SĐT'})` }));
  (followUps || []).forEach(x => out.push({ sheet: 'FOLLOWUPS', type: 'FollowUp', id: x.id, updated: x.deleted_at || x.updated_at, title: `Lịch chăm sóc: ${x.type || 'Chăm sóc'} - ${x.notes || ''}` }));
  (appointments || []).forEach(x => out.push({ sheet: 'APPOINTMENTS', type: 'Appointment', id: x.id, updated: x.deleted_at || x.updated_at, title: `Lịch xem: ${x.scheduled_at || `#${x.id}`}` }));
  (deals || []).forEach(x => out.push({ sheet: 'DEALS', type: 'Deal', id: x.id, updated: x.deleted_at || x.updated_at, title: `Giao dịch: ${x.buyer_name || `#${x.id}`}` }));
  (tenancies || []).forEach(x => out.push({ sheet: 'TENANCIES', type: 'Tenancy', id: x.id, updated: x.deleted_at || x.updated_at, title: `HĐ Thuê: ${x.tenant_name || `#${x.id}`}` }));
  (owners || []).forEach(x => out.push({ sheet: 'OWNERS', type: 'Owner', id: x.id, updated: x.deleted_at || x.updated_at, title: `Chủ sở hữu: ${x.name || `#${x.id}`} (${x.phone || ''})` }));
  (locations || []).forEach(x => out.push({ sheet: 'LOCATIONS', type: 'Location', id: x.id, updated: x.deleted_at || x.updated_at, title: `Khu vực: ${x.name || `#${x.id}`} (${x.level || ''})` }));
  (amenities || []).forEach(x => out.push({ sheet: 'AMENITIES', type: 'Amenity', id: x.id, updated: x.deleted_at || x.updated_at, title: `Tiện ích: ${x.name || `#${x.id}`}` }));

  out.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  return ok({ data: out });
}

async function restoreRecord(args, jwt) {
  const [sheetKey, rawId] = args;
  const id = Number(rawId);
  const p = await currentProfile(jwt);
  if (p.role_key !== 'Admin') return fail('Chỉ Quản trị viên mới có quyền khôi phục bản ghi');

  const SHEET_TO_TABLE = {
    PROPERTIES: 'properties', Property: 'properties', properties: 'properties',
    LEADS: 'leads', Lead: 'leads', leads: 'leads',
    FOLLOWUPS: 'follow_ups', FollowUp: 'follow_ups', follow_ups: 'follow_ups',
    APPOINTMENTS: 'appointments', Appointment: 'appointments', appointments: 'appointments',
    DEALS: 'deals', Deal: 'deals', deals: 'deals',
    TENANCIES: 'tenancies', Tenancy: 'tenancies', tenancies: 'tenancies',
    OWNERS: 'owners', Owner: 'owners', owners: 'owners',
    LOCATIONS: 'locations', Location: 'locations', locations: 'locations',
    AMENITIES: 'amenities', Amenity: 'amenities', amenities: 'amenities'
  };

  const table = SHEET_TO_TABLE[sheetKey];
  if (!table) return fail('Phân hệ không hợp lệ');

  const rows = await adminSelect(table, 'id, deleted_at', `&id=eq.${id}&limit=1`);
  if (!rows.length || !rows[0].deleted_at) return fail('Bản ghi không tồn tại trong thùng rác');

  const body = {
    deleted_at: null,
    deleted_by: null,
    updated_at: new Date().toISOString()
  };
  if (!['locations', 'amenities'].includes(table)) {
    body.updated_by = p.id;
  }

  await patchRow(table, id, body, jwt);
  if (table === 'properties') invalidatePortalCache();
  await audit(jwt, 'Record Restored', `${table} #${id}`);
  return ok({ message: 'Đã khôi phục bản ghi thành công!' });
}

async function run(method,args=[],authorization=''){
  if(!enabled) throw new Error('Supabase chưa được cấu hình trên máy chủ');
  if(method==='authenticateUser') return authenticateUser(args);
  if(method==='refreshAuthSession') return refreshAuthSession(args);
  if(method==='getPublicPortal') return getPublicPortal();
  if(method==='publicViewProperty') return publicViewProperty(args);
  if(method==='publicSubmitEnquiry') return publicSubmitEnquiry(args);
  const jwt=String(authorization||'').replace(/^Bearer\s+/i,'');
  if(!jwt) return fail('Phiên đăng nhập Supabase không hợp lệ');
  if(method==='brochurePdf') return brochurePdf(args,jwt);
  if(method==='buildAgreement') return buildAgreement(args,jwt);
  if(method==='agreementPdf') return agreementPdf(args,jwt);
  const readHandlers={
    getDashboardStats,getNotifications,getProperties,getLeads,getFollowUps,getAppointments,getDeals,getTenancies,getOwners,getLocations,getAmenities,getAllUsers,getLogs,getMyPermissions,getLookups,getAppConfig,getUserSettings,getAgencyBranding,getRbacMatrix,getTrash,getContractTemplates,resetContractTemplates
  };
  const mutationHandlers={
    updateUserSettings,uploadProfileImage,uploadFile,saveAgencyBranding,toggleRbac,setAppConfig,
    addUser,updateUser,deleteUser,updateMyAccount,reassignAgentWork,bulkImportUsers,
    addProperty,updateProperty,deleteProperty,uploadPropertyImage,addLead,updateLead,deleteLead,assignLead,
    addFollowUp,updateFollowUp,deleteFollowUp,addAppointment,updateAppointment,deleteAppointment,completeAppointment,
    addDeal,updateDeal,deleteDeal,addDealPayment,markAgentPaid,
    collectRent,renewTenancy,endTenancy,deleteTenancy,addMaintenance,updateMaintenance,
    addOwner,updateOwner,deleteOwner,addLocation,updateLocation,deleteLocation,addAmenity,updateAmenity,deleteAmenity,
    restoreRecord,saveContractTemplate
  };
  if(readHandlers[method]) return readHandlers[method](jwt);
  if(mutationHandlers[method]) return mutationHandlers[method](args,jwt);
  if(method==='getDefaultTheme') return ok({id:'',vars:''});
  if(method==='getAiConfig') return ok({configured:false});
  return fail(`Phân hệ ${method} đang được chuyển sang Supabase`);
}

module.exports={enabled,run};
