import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = fs.readFileSync(path.join(root, 'code-appscript', 'index.html'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'supabase-backend.js'), 'utf8');

const uiMethods = new Set([...frontend.matchAll(/gsRun\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]));
const supported = new Set([
  ...backend.matchAll(/if\s*\(method\s*===\s*['"]([^'"]+)['"]\)/g),
].map(match => match[1]));

for (const blockName of ['readHandlers', 'mutationHandlers']) {
  const block = backend.match(new RegExp(`const\\s+${blockName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!block) continue;
  for (const token of block[1].split(',').map(value => value.trim()).filter(Boolean)) {
    const key = token.split(':')[0].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(key)) supported.add(key);
  }
}

const implemented = [...uiMethods].filter(method => supported.has(method)).sort();
const missing = [...uiMethods].filter(method => !supported.has(method)).sort();
console.log(JSON.stringify({
  frontendLiteralMethods: uiMethods.size,
  implementedInSupabase: implemented.length,
  missingInSupabase: missing.length,
  missing,
  note: 'Không bao gồm lời gọi gsRun có tên method động.'
}, null, 2));

if (process.env.STRICT_API_CONTRACT === '1' && missing.length) process.exitCode = 1;
