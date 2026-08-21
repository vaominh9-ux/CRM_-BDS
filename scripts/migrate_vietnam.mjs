import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const outputDir = path.join(root, 'outputs', 'vietnam-localization');
const jsonPath = path.join(dataDir, 'local-crm-data.json');
const workbookPath = path.join(dataDir, 'F21_REAL_ESTATE_CRM.xlsx');
const backupJson = path.join(dataDir, 'local-crm-data.before-vi-migration.json');
const backupWorkbook = path.join(dataDir, 'F21_REAL_ESTATE_CRM.before-vi-migration.xlsx');
const outputWorkbook = path.join(outputDir, 'F21_REAL_ESTATE_CRM_VI.xlsx');
const rate = 94;

await fs.mkdir(outputDir, { recursive: true });
for (const [source, backup] of [[jsonPath, backupJson], [workbookPath, backupWorkbook]]) {
  try { await fs.access(backup); } catch { await fs.copyFile(source, backup); }
}

const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
const alreadyMigrated = data.meta?.currency === 'VND';
const moneyKeys = new Set([
  'MonthlyTarget', 'price', 'oldPrice', 'newPrice', 'amount', 'budgetMin', 'budgetMax',
  'dealAmount', 'commissionAmt', 'agentShareAmt', 'tokenAmount', 'monthlyRent',
  'securityDeposit', 'cost', 'deductions'
]);
const areaFactors = {
  'Sq Ft': 0.09290304,
  'Sq Yd': 0.83612736,
  'Marla': 25.29285264,
  'Kanal': 505.8570528,
  'Sq M': 1,
};

const areaTextFactors = [
  [/([0-9]+(?:\.[0-9]+)?)\s*Marla\b/gi, 25.29285264],
  [/([0-9]+(?:\.[0-9]+)?)\s*Kanal\b/gi, 505.8570528],
  [/([0-9]+(?:\.[0-9]+)?)\s*Sq\.?\s*Yd\b/gi, 0.83612736],
  [/([0-9]+(?:\.[0-9]+)?)\s*Sq\.?\s*Ft\b/gi, 0.09290304],
];

function localizeAreaText(value) {
  let output = String(value || '');
  for (const [pattern, factor] of areaTextFactors) {
    output = output.replace(pattern, (_, size) => {
      const sqm = Math.round(Number(size) * factor * 100) / 100;
      return sqm.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' m²';
    });
  }
  return output;
}

const convertMoney = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return Math.round(value * rate / 1000) * 1000;
};

function migrateNode(node) {
  if (Array.isArray(node)) return node.forEach(migrateNode);
  if (!node || typeof node !== 'object') return;
  if (typeof node.areaSize === 'number' && areaFactors[node.areaUnit]) {
    node.areaSize = Math.round(node.areaSize * areaFactors[node.areaUnit] * 100) / 100;
    node.areaUnit = 'Sq M';
  }
  for (const [key, value] of Object.entries(node)) {
    if (moneyKeys.has(key)) node[key] = convertMoney(value);
    else migrateNode(value);
  }
}

if (!alreadyMigrated) {
  migrateNode(data.users);
  migrateNode(data.sheets);
  data.meta = {
    ...(data.meta || {}),
    locale: 'vi-VN',
    currency: 'VND',
    sourceCurrency: 'PKR',
    pkrToVnd: rate,
    areaUnit: 'm²',
    migratedAt: new Date().toISOString(),
  };
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

if (!data.meta?.unitTextLocalized) {
  for (const property of data.sheets.Properties || []) {
    property.title = localizeAreaText(property.title);
    property.description = localizeAreaText(property.description);
  }
  for (const log of data.sheets.Logs || []) log.details = localizeAreaText(log.details);
  data.meta = { ...(data.meta || {}), unitTextLocalized: true };
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const previewsDir = path.join(outputDir, 'previews-before');
await fs.mkdir(previewsDir, { recursive: true });
for (const sheet of workbook.worksheets.items) {
  try {
    const preview = await workbook.render({ sheetName: sheet.name, autoCrop: 'all', scale: 0.7, format: 'png' });
    await fs.writeFile(path.join(previewsDir, `${sheet.name.replace(/[^a-z0-9_-]/gi, '_')}.png`), new Uint8Array(await preview.arrayBuffer()));
  } catch (error) {
    console.warn(`Không thể render sheet ${sheet.name}: ${error.message}`);
  }
}

const userHeaders = ['Username','Email','Password','Role','Status','ProfileImage','ThemeMode','CustomColors','CreatedAt','CreatedBy','UpdatedAt','UpdatedBy','MonthlyTarget'];
const roleHeaders = ['role_key','label','color','sort_order','is_super','hidden_signup','permissions'];
const jsonSheets = ['Locations','Amenities','Properties','Leads','FollowUps','Appointments','Owners','Deals','Tenancies','Logs'];

function replaceSheet(name, matrix) {
  const sheet = workbook.worksheets.getItem(name);
  const used = sheet.getUsedRange();
  if (used) used.clear({ applyTo: 'contents' });
  sheet.getRangeByIndexes(0, 0, matrix.length, matrix[0].length).values = matrix;
}

replaceSheet('Users', [userHeaders, ...data.users.map((row) => userHeaders.map((key) => row[key] ?? null))]);
replaceSheet('Roles', [roleHeaders, ...data.roles.map((row) => roleHeaders.map((key) => key === 'permissions' ? JSON.stringify(row[key] || {}) : (row[key] ?? null)))]);

const asDate = (record) => String(record.created || record.updated || '').slice(0, 10) || '1970-01-01';
for (const name of jsonSheets) {
  const groups = new Map();
  for (const row of data.sheets[name] || []) {
    const date = asDate(row);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(row);
  }
  const rows = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, records]) => [date, JSON.stringify(records)]);
  replaceSheet(name, [['Date', 'Data'], ...rows]);
}

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputWorkbook);
await fs.copyFile(outputWorkbook, workbookPath);

const finalPreviewsDir = path.join(outputDir, 'previews-final');
await fs.mkdir(finalPreviewsDir, { recursive: true });
for (const sheet of workbook.worksheets.items) {
  try {
    const preview = await workbook.render({ sheetName: sheet.name, autoCrop: 'all', scale: 0.7, format: 'png' });
    await fs.writeFile(path.join(finalPreviewsDir, `${sheet.name.replace(/[^a-z0-9_-]/gi, '_')}.png`), new Uint8Array(await preview.arrayBuffer()));
  } catch (error) {
    console.warn(`Không thể render sheet ${sheet.name} sau chuyển đổi: ${error.message}`);
  }
}

const check = await workbook.inspect({ kind: 'table', sheetId: 'Properties', range: 'A1:B8', include: 'values,formulas', tableMaxRows: 8, tableMaxCols: 2, maxChars: 5000 });
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 100 }, summary: 'final formula error scan', maxChars: 5000 });
console.log(JSON.stringify({ alreadyMigrated, rate, outputWorkbook, check: check.ndjson, errors: errors.ndjson }, null, 2));
