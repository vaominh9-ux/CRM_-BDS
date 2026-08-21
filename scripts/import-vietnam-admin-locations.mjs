import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datasetPath = resolve(root, 'data', 'vietnam-admin-units-2026-07-25.json');
// Danh mục hành chính Việt Nam 2 cấp, bản v4.2.0 tạo ngày 25/07/2026.
// Nguồn dữ liệu: https://github.com/thanglequoc/vietnamese-provinces-database
// Đối chiếu pháp lý: Quyết định 19/2025/QĐ-TTg và Nghị quyết 30/2026/QH16.
const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.supabase.local');
}

const source = JSON.parse(await readFile(datasetPath, 'utf8'));
const provinceCount = source.length;
const wardCount = source.reduce((sum, province) => sum + province.Wards.length, 0);
if (provinceCount !== 34 || wardCount !== 3321) {
  throw new Error(`Bộ dữ liệu không hợp lệ: ${provinceCount} tỉnh/thành, ${wardCount} xã/phường`);
}

async function rest(path, { method = 'GET', body, range, prefer } = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(range ? { Range: range } : {}),
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload && (payload.message || payload.error_description || payload.error) || `Supabase HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

const batches = (items, size = 250) => {
  const output = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
};

const provinces = source.map((province) => ({
  id: 100000 + Number(province.Code),
  name: province.FullName,
  level: 'City',
  parent_id: null,
  slug: `vn-province-${province.Code}`,
  deleted_at: null,
  deleted_by: null
}));

await rest('locations?on_conflict=slug', {
  method: 'POST', body: provinces, prefer: 'resolution=merge-duplicates,return=minimal'
});
const wards = source.flatMap((province) => province.Wards.map((ward) => ({
  id: 200000 + Number(ward.Code),
  name: ward.FullName,
  level: 'Area',
  parent_id: 100000 + Number(province.Code),
  slug: `vn-ward-${ward.Code}`,
  deleted_at: null,
  deleted_by: null
})));

for (const batch of batches(wards)) {
  await rest('locations?on_conflict=slug', {
    method: 'POST', body: batch, prefer: 'resolution=merge-duplicates,return=minimal'
  });
}

const expectedSlugs = new Set([...provinces, ...wards].map((row) => row.slug));
const existing = [];
for (let from = 0; ; from += 1000) {
  const data = await rest('locations?select=id,slug&slug=like.vn-%25&order=id.asc', { range: `${from}-${from + 999}` });
  existing.push(...data);
  if (data.length < 1000) break;
}
const staleIds = existing.filter((row) => !expectedSlugs.has(row.slug)).map((row) => row.id);
for (const batch of batches(staleIds)) {
  await rest(`locations?id=in.(${batch.join(',')})`, {
    method: 'PATCH', body: { deleted_at: new Date().toISOString() }, prefer: 'return=minimal'
  });
}

console.log(`Đã đồng bộ ${provinceCount} tỉnh/thành và ${wardCount} xã/phường/đặc khu (nguồn 25/07/2026, v4.2.0).`);
if (staleIds.length) console.log(`Đã ngừng sử dụng ${staleIds.length} đơn vị cũ không còn trong danh mục mới.`);
