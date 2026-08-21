import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const required = [
  'AGENTS.md', 'README.md', 'package.json', 'server.js', 'supabase-backend.js',
  'local-backend.js', 'code-appscript/index.html', 'docs/ARCHITECTURE.md',
  'docs/BUSINESS_RULES.md', 'docs/DATA_MODEL.md', 'docs/DEVELOPMENT.md'
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`Thiếu tệp bắt buộc: ${relative}`);
}

for (const relative of ['package.json', 'data/local-crm-data.json', 'data/portal-data.json']) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) continue;
  try { JSON.parse(fs.readFileSync(target, 'utf8')); }
  catch (error) { errors.push(`${relative} không phải JSON hợp lệ: ${error.message}`); }
}

const syntaxTargets = ['server.js', 'local-backend.js', 'supabase-backend.js', 'api/index.js'];
const scriptsDir = path.join(root, 'scripts');
if (fs.existsSync(scriptsDir)) {
  syntaxTargets.push(...fs.readdirSync(scriptsDir).filter(name => name.endsWith('.mjs')).map(name => `scripts/${name}`));
}
for (const relative of syntaxTargets) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, relative)], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`Lỗi cú pháp ${relative}: ${(result.stderr || result.stdout).trim()}`);
}

const migrationDir = path.join(root, 'supabase', 'migrations');
if (fs.existsSync(migrationDir)) {
  const migrations = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
  const prefixes = migrations.map(name => name.split('_')[0]);
  if (new Set(prefixes).size !== prefixes.length) errors.push('Migration có tiền tố thời gian trùng nhau');
  for (const name of migrations) {
    if (!/^\d{12}_[a-z0-9_]+\.sql$/.test(name)) warnings.push(`Tên migration chưa đúng quy ước: ${name}`);
  }
}

const trackedEnv = spawnSync('git', ['ls-files', '--error-unmatch', '.env.supabase.local'], { cwd: root, encoding: 'utf8' });
if (trackedEnv.status === 0) errors.push('.env.supabase.local đang bị Git theo dõi');
const ignoredEnv = spawnSync('git', ['check-ignore', '-q', '.env.supabase.local'], { cwd: root });
if (ignoredEnv.status !== 0) errors.push('.env.supabase.local chưa được .gitignore bảo vệ');

const htmlPath = path.join(root, 'code-appscript', 'index.html');
if (fs.existsSync(htmlPath)) {
  const size = fs.statSync(htmlPath).size;
  if (size > 500_000) warnings.push(`index.html đang là monolith ${(size / 1024).toFixed(0)} KB; chỉ tách dần theo ADR 0001`);
}

const serverSource = fs.existsSync(path.join(root, 'server.js')) ? fs.readFileSync(path.join(root, 'server.js'), 'utf8') : '';
if (!serverSource.includes('supabaseBackend.enabled')) errors.push('server.js không còn cơ chế chọn Supabase/fallback dự kiến');
const supabaseSource = fs.existsSync(path.join(root, 'supabase-backend.js')) ? fs.readFileSync(path.join(root, 'supabase-backend.js'), 'utf8') : '';
if (!/module\.exports\s*=\s*\{\s*enabled\s*,\s*run\s*\}/.test(supabaseSource)) errors.push('supabase-backend.js không xuất enabled/run đúng contract');

for (const warning of warnings) console.warn(`CẢNH BÁO: ${warning}`);
for (const error of errors) console.error(`LỖI: ${error}`);
console.log(`Kiểm tra hoàn tất: ${errors.length} lỗi, ${warnings.length} cảnh báo.`);
if (errors.length) process.exitCode = 1;
