import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourcePath = path.resolve(root, process.env.CRM_SOURCE_FILE || './data/local-crm-data.json');
if (!url || !serviceKey) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const sheets = source.sheets || {};
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const failures = [];
const round = (v) => Math.round(Number(v) || 0);
const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);

async function get(table, select = '*') {
  const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`, { headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`${table}: ${response.status} ${text}`);
  return JSON.parse(text);
}

const tableMap = {
  locations: 'Locations', amenities: 'Amenities', properties: 'Properties', leads: 'Leads',
  follow_ups: 'FollowUps', appointments: 'Appointments', owners: 'Owners', deals: 'Deals',
  tenancies: 'Tenancies', activity_logs: 'Logs'
};
const counts = {};
for (const [target, origin] of Object.entries(tableMap)) {
  const rows = await get(target, 'id');
  counts[target] = rows.length;
  if (rows.length !== (sheets[origin] || []).length) failures.push(`${target}: Supabase=${rows.length}, nguồn=${(sheets[origin] || []).length}`);
}

const actualDeals = await get('deal_financials', 'id,deal_amount_vnd,paid_vnd,balance_vnd,commission_amount_vnd,agent_share_amount_vnd');
const expectedDeals = (sheets.Deals || []).map((deal) => {
  const paid = round((deal.payments || []).reduce((total, payment) => total + Number(payment.amount || 0), 0));
  const commission = round(Number(deal.dealAmount) * Number(deal.commissionPct || 0) / 100);
  return {
    id: Number(deal.id), deal_amount_vnd: round(deal.dealAmount), paid_vnd: paid,
    balance_vnd: Math.max(0, round(Number(deal.dealAmount) - paid)), commission_amount_vnd: commission,
    agent_share_amount_vnd: round(commission * Number(deal.agentSharePct || 0) / 100)
  };
});
const actualByDeal = new Map(actualDeals.map((row) => [Number(row.id), row]));
for (const expected of expectedDeals) {
  const actual = actualByDeal.get(expected.id);
  if (!actual) { failures.push(`deal_financials: thiếu giao dịch #${expected.id}`); continue; }
  for (const field of ['deal_amount_vnd','paid_vnd','balance_vnd','commission_amount_vnd','agent_share_amount_vnd']) {
    if (round(actual[field]) !== expected[field]) failures.push(`Giao dịch #${expected.id}.${field}: Supabase=${actual[field]}, nguồn=${expected[field]}`);
  }
}

const actualDealPayments = await get('deal_payments','id,deal_id,amount_vnd,paid_at,method');
counts.deal_payments = actualDealPayments.length;
const expectedDealPayments = (sheets.Deals || []).flatMap(deal => (deal.payments || []).map((payment,index) => ({
  id:Number(deal.id)*100000+index+1,deal_id:Number(deal.id),amount_vnd:round(payment.amount),method:payment.method||'Cash'
})));
const actualPaymentById = new Map(actualDealPayments.map(row=>[Number(row.id),row]));
if(actualDealPayments.length!==expectedDealPayments.length)failures.push(`deal_payments: Supabase=${actualDealPayments.length}, nguồn=${expectedDealPayments.length}`);
for(const expected of expectedDealPayments){const actual=actualPaymentById.get(expected.id);if(!actual){failures.push(`deal_payments: thiếu thanh toán #${expected.id}`);continue;}for(const field of ['deal_id','amount_vnd'])if(round(actual[field])!==expected[field])failures.push(`Thanh toán #${expected.id}.${field}: Supabase=${actual[field]}, nguồn=${expected[field]}`);if(actual.method!==expected.method)failures.push(`Thanh toán #${expected.id}.method: Supabase=${actual.method}, nguồn=${expected.method}`);}

const actualTenancies = await get('tenancy_financials', 'id,collected_vnd,arrears_vnd');
const actualByTenancy = new Map(actualTenancies.map((row) => [Number(row.id), row]));
const now = new Date();
for (const tenancy of sheets.Tenancies || []) {
  const actual = actualByTenancy.get(Number(tenancy.id));
  if (!actual) { failures.push(`tenancy_financials: thiếu hợp đồng #${tenancy.id}`); continue; }
  const collected = round((tenancy.rentLog || []).reduce((total, payment) => total + Number(payment.amount || 0), 0));
  const start = new Date(`${tenancy.startDate}T00:00:00`);
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() >= Number(tenancy.rentDueDay || 5)) months += 1;
  const expectedArrears = tenancy.status === 'Active' ? Math.max(0, round(Math.max(0, months) * Number(tenancy.monthlyRent) - collected)) : 0;
  if (round(actual.collected_vnd) !== collected) failures.push(`Hợp đồng #${tenancy.id}.collected_vnd: Supabase=${actual.collected_vnd}, nguồn=${collected}`);
  if (round(actual.arrears_vnd) !== expectedArrears) failures.push(`Hợp đồng #${tenancy.id}.arrears_vnd: Supabase=${actual.arrears_vnd}, nguồn=${expectedArrears}`);
}

const actualRentPayments=await get('rent_payments','id,tenancy_id,rent_month,amount_vnd,method');
counts.rent_payments=actualRentPayments.length;
const expectedRentPayments=(sheets.Tenancies||[]).flatMap(tenancy=>(tenancy.rentLog||[]).map((payment,index)=>({id:Number(tenancy.id)*100000+index+1,tenancy_id:Number(tenancy.id),rent_month:`${payment.month}-01`,amount_vnd:round(payment.amount),method:payment.method||'Cash'})));
const actualRentById=new Map(actualRentPayments.map(row=>[Number(row.id),row]));
if(actualRentPayments.length!==expectedRentPayments.length)failures.push(`rent_payments: Supabase=${actualRentPayments.length}, nguồn=${expectedRentPayments.length}`);
for(const expected of expectedRentPayments){const actual=actualRentById.get(expected.id);if(!actual){failures.push(`rent_payments: thiếu khoản thu #${expected.id}`);continue;}for(const field of ['tenancy_id','amount_vnd'])if(round(actual[field])!==expected[field])failures.push(`Tiền thuê #${expected.id}.${field}: Supabase=${actual[field]}, nguồn=${expected[field]}`);if(String(actual.rent_month).slice(0,10)!==expected.rent_month)failures.push(`Tiền thuê #${expected.id}.rent_month: Supabase=${actual.rent_month}, nguồn=${expected.rent_month}`);if(actual.method!==expected.method)failures.push(`Tiền thuê #${expected.id}.method: Supabase=${actual.method}, nguồn=${expected.method}`);}

const factor=Number(source.meta?.pkrToVnd||1);
const actualRenewals=await get('tenancy_renewals','id,tenancy_id,old_rent_vnd,new_rent_vnd,new_end_date');
counts.tenancy_renewals=actualRenewals.length;
const expectedRenewals=(sheets.Tenancies||[]).flatMap(tenancy=>(tenancy.renewals||[]).map((renewal,index)=>{let oldRent=Number(renewal.oldRent||0),newRent=Number(renewal.newRent||0);if(factor>1&&newRent>0&&Number(tenancy.monthlyRent)/newRent>10){oldRent*=factor;newRent*=factor;}return{id:Number(tenancy.id)*100000+index+1,tenancy_id:Number(tenancy.id),old_rent_vnd:round(oldRent),new_rent_vnd:round(newRent),new_end_date:renewal.newEndDate||null};}));
const actualRenewalById=new Map(actualRenewals.map(row=>[Number(row.id),row]));
if(actualRenewals.length!==expectedRenewals.length)failures.push(`tenancy_renewals: Supabase=${actualRenewals.length}, nguồn=${expectedRenewals.length}`);
for(const expected of expectedRenewals){const actual=actualRenewalById.get(expected.id);if(!actual){failures.push(`tenancy_renewals: thiếu lần gia hạn #${expected.id}`);continue;}for(const field of ['tenancy_id','old_rent_vnd','new_rent_vnd'])if(round(actual[field])!==expected[field])failures.push(`Gia hạn #${expected.id}.${field}: Supabase=${actual[field]}, nguồn quy đổi=${expected[field]}`);if((actual.new_end_date||null)!==expected.new_end_date)failures.push(`Gia hạn #${expected.id}.new_end_date không khớp`);}

const actualRefunds=await get('deposit_refunds','tenancy_id,deposit_vnd,deductions_vnd,refund_vnd');
counts.deposit_refunds=actualRefunds.length;
const expectedRefunds=(sheets.Tenancies||[]).filter(tenancy=>tenancy.depositRefund).map(tenancy=>({tenancy_id:Number(tenancy.id),deposit_vnd:round(tenancy.securityDeposit),deductions_vnd:round(tenancy.depositRefund.deductions),refund_vnd:Math.max(0,round(Number(tenancy.securityDeposit)-Number(tenancy.depositRefund.deductions)))}));
const actualRefundByTenancy=new Map(actualRefunds.map(row=>[Number(row.tenancy_id),row]));
if(actualRefunds.length!==expectedRefunds.length)failures.push(`deposit_refunds: Supabase=${actualRefunds.length}, nguồn=${expectedRefunds.length}`);
for(const expected of expectedRefunds){const actual=actualRefundByTenancy.get(expected.tenancy_id);if(!actual){failures.push(`deposit_refunds: thiếu hoàn cọc hợp đồng #${expected.tenancy_id}`);continue;}for(const field of ['deposit_vnd','deductions_vnd','refund_vnd'])if(round(actual[field])!==expected[field])failures.push(`Hoàn cọc hợp đồng #${expected.tenancy_id}.${field}: Supabase=${actual[field]}, nguồn=${expected[field]}`);}

const report = {
  verifiedAt: new Date().toISOString(), counts,
  financialTotals: {
    dealTotalVnd: sum(actualDeals, 'deal_amount_vnd'), dealPaidVnd: sum(actualDeals, 'paid_vnd'),
    dealBalanceVnd: sum(actualDeals, 'balance_vnd'), commissionVnd: sum(actualDeals, 'commission_amount_vnd'),
    agentShareVnd: sum(actualDeals, 'agent_share_amount_vnd'), rentCollectedVnd: sum(actualTenancies, 'collected_vnd'),
    rentArrearsVnd: sum(actualTenancies, 'arrears_vnd')
  },
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
