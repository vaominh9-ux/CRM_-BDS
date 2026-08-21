import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import localBackend from '../local-backend.js';
import supabaseBackend from '../supabase-backend.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'local-crm-data.json'), 'utf8'));
const password = process.env.MIGRATION_DEFAULT_PASSWORD;
if (!password) throw new Error('Thiếu MIGRATION_DEFAULT_PASSWORD');

const scalarFields = [
  'activeListings','featured','totalViews','openLeads','wonLeads','totalLeads','leadsMonth','conversionRate',
  'overdueFollowUps','todayAppointments','dealsMonth','dealsMonthValue','commissionMonth','collectedMonth','payable',
  'activeAgents','myTarget','unassignedLeads','activeTenancies','rentArrears','balanceDue'
];
const objectFields = ['inventory','funnel'];
const activeUsers = (source.users || []).filter(user => user.Status === 'Active').map(user => user.Username);
const failures = [];
const users = {};

for (const username of activeUsers) {
  const local = (await localBackend.run('getDashboardStats',[username])).data;
  const login = await supabaseBackend.run('authenticateUser',[username,password]);
  if (!login.success || !login.authSession?.accessToken) {
    failures.push(`${username}: đăng nhập Supabase thất bại`);
    continue;
  }
  const remote = (await supabaseBackend.run('getDashboardStats',[],`Bearer ${login.authSession.accessToken}`)).data;
  const differences = {};
  for (const field of scalarFields) {
    if (Number(local[field] ?? 0) !== Number(remote[field] ?? 0)) differences[field] = { source:local[field], supabase:remote[field] };
  }
  for (const field of objectFields) {
    for (const key of new Set([...Object.keys(local[field] || {}),...Object.keys(remote[field] || {})])) {
      if (Number(local[field]?.[key] || 0) !== Number(remote[field]?.[key] || 0)) {
        (differences[field] ||= {})[key] = { source:local[field]?.[key] || 0, supabase:remote[field]?.[key] || 0 };
      }
    }
  }
  if (Object.keys(differences).length) failures.push(`${username}: KPI không khớp`);
  users[username] = { matched:Object.keys(differences).length === 0, differences };
}

console.log(JSON.stringify({ verifiedAt:new Date().toISOString(), users, failures },null,2));
if (failures.length) process.exitCode = 1;
