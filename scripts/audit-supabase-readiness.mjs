import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.env.CRM_SOURCE_FILE || path.join(root, 'data', 'local-crm-data.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const sheets = source.sheets || {};
const errors = [];
const warnings = [];
const asOf = new Date(process.env.CRM_AUDIT_DATE || Date.now());

const byId = (name) => new Map((sheets[name] || []).map((row) => [Number(row.id), row]));
const users = new Set((source.users || []).map((u) => u.Username));
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const requireRef = (owner, field, targetName, targetMap) => {
  const value = owner[field];
  if (value !== null && value !== undefined && value !== '' && !targetMap.has(Number(value))) {
    errors.push(`${targetName}: không tìm thấy ${field}=${value} cho bản ghi #${owner.id}`);
  }
};
const requireUser = (owner, field, label) => {
  const value = owner[field];
  if (value && !users.has(value)) errors.push(`${label} #${owner.id}: không tìm thấy người dùng ${field}=${value}`);
};

const locations = byId('Locations');
const amenities = byId('Amenities');
const properties = byId('Properties');
const leads = byId('Leads');
const deals = byId('Deals');

for (const row of sheets.Locations || []) requireRef(row, 'parentId', 'Locations', locations);
for (const row of sheets.Properties || []) {
  requireRef(row, 'locationId', 'Properties', locations);
  requireUser(row, 'assignedAgent', 'Properties');
  for (const amenityId of row.amenityIds || []) {
    if (!amenities.has(Number(amenityId))) errors.push(`Properties #${row.id}: tiện ích #${amenityId} không tồn tại`);
  }
}
for (const row of sheets.Leads || []) {
  requireRef(row, 'propertyId', 'Leads', properties);
  requireRef(row, 'preferredLocationId', 'Leads', locations);
  requireUser(row, 'assignedAgent', 'Leads');
}
for (const row of sheets.FollowUps || []) {
  requireRef(row, 'leadId', 'FollowUps', leads);
  requireUser(row, 'assignedAgent', 'FollowUps');
}
for (const row of sheets.Appointments || []) {
  requireRef(row, 'leadId', 'Appointments', leads);
  requireRef(row, 'propertyId', 'Appointments', properties);
  requireUser(row, 'agent', 'Appointments');
}

let dealTotalVnd = 0;
let dealPaidVnd = 0;
let dealBalanceVnd = 0;
let commissionVnd = 0;
let agentShareVnd = 0;
for (const row of sheets.Deals || []) {
  requireRef(row, 'propertyId', 'Deals', properties);
  requireRef(row, 'leadId', 'Deals', leads);
  requireUser(row, 'agent', 'Deals');
  const paid = round2((row.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0));
  const expectedCommission = round2(Number(row.dealAmount) * Number(row.commissionPct || 0) / 100);
  const expectedAgentShare = round2(expectedCommission * Number(row.agentSharePct || 0) / 100);
  if (paid > Number(row.dealAmount) + 0.01) errors.push(`Deals #${row.id}: đã thu ${paid} vượt giá trị ${row.dealAmount}`);
  if (Math.abs(expectedCommission - Number(row.commissionAmt)) > 0.01) errors.push(`Deals #${row.id}: hoa hồng lưu ${row.commissionAmt}, công thức ${expectedCommission}`);
  if (Math.abs(expectedAgentShare - Number(row.agentShareAmt)) > 0.01) errors.push(`Deals #${row.id}: phần nhân viên lưu ${row.agentShareAmt}, công thức ${expectedAgentShare}`);
  dealTotalVnd += Number(row.dealAmount || 0);
  dealPaidVnd += paid;
  dealBalanceVnd += Math.max(0, round2(Number(row.dealAmount) - paid));
  commissionVnd += expectedCommission;
  agentShareVnd += expectedAgentShare;
}

const expectedMonths = (tenancy) => {
  const start = new Date(`${tenancy.startDate}T00:00:00`);
  let months = (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth());
  if (asOf.getDate() >= Number(tenancy.rentDueDay || 5)) months += 1;
  return Math.max(0, months);
};
let rentCollectedVnd = 0;
let rentArrearsVnd = 0;
for (const row of sheets.Tenancies || []) {
  requireRef(row, 'propertyId', 'Tenancies', properties);
  requireRef(row, 'dealId', 'Tenancies', deals);
  const collected = round2((row.rentLog || []).reduce((sum, p) => sum + Number(p.amount || 0), 0));
  const expected = row.status === 'Active' ? round2(expectedMonths(row) * Number(row.monthlyRent || 0)) : collected;
  rentCollectedVnd += collected;
  rentArrearsVnd += Math.max(0, round2(expected - collected));
  for (const renewal of row.renewals || []) {
    if (Number(renewal.newRent) > 0 && Number(row.monthlyRent) / Number(renewal.newRent) > 10) {
      warnings.push(`Tenancies #${row.id}: renewal.newRent=${renewal.newRent} có vẻ còn đơn vị ${source.meta?.sourceCurrency || 'cũ'}; mức hiện tại=${row.monthlyRent}`);
    }
  }
  if (row.depositRefund) {
    const calculated = round2(Number(row.securityDeposit || 0) - Number(row.depositRefund.deductions || 0));
    if (Math.abs(calculated - Number(row.depositRefund.amount || 0)) > 0.01) {
      errors.push(`Tenancies #${row.id}: hoàn cọc lưu ${row.depositRefund.amount}, công thức ${calculated}`);
    }
  }
}

const duplicateIds = {};
for (const [name, rows] of Object.entries(sheets)) {
  const seen = new Set();
  duplicateIds[name] = [];
  for (const row of rows || []) {
    if (seen.has(row.id)) duplicateIds[name].push(row.id);
    seen.add(row.id);
  }
  if (duplicateIds[name].length) errors.push(`${name}: trùng ID ${duplicateIds[name].join(', ')}`);
}

const result = {
  source: path.relative(root, sourcePath),
  asOf: asOf.toISOString(),
  locale: source.meta?.locale,
  currency: source.meta?.currency,
  counts: Object.fromEntries(Object.entries(sheets).map(([name, rows]) => [name, rows.length])),
  financialBaseline: {
    dealTotalVnd: round2(dealTotalVnd),
    dealPaidVnd: round2(dealPaidVnd),
    dealBalanceVnd: round2(dealBalanceVnd),
    commissionVnd: round2(commissionVnd),
    agentShareVnd: round2(agentShareVnd),
    rentCollectedVnd: round2(rentCollectedVnd),
    rentArrearsVnd: round2(rentArrearsVnd)
  },
  warnings,
  errors
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;

