import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(projectRoot, 'code-appscript', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error(`Không tìm thấy giao diện: ${htmlPath}`);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const errors = [];

const requiredMarkers = [
  ['HTML tiếng Việt', /<html\s+lang=["']vi["']/],
  ['viewport mobile', /<meta\s+name=["']viewport["']/],
  ['token giao diện Apps Script', /window\.__APP_THEME_RAW__/],
  ['deep link Apps Script', /window\.__DEEP_LINK__/],
  ['URL ứng dụng Apps Script', /window\.__APP_URL__/],
  ['React 18', /react@18\/umd\/react\.production\.min\.js/],
  ['React DOM 18', /react-dom@18\/umd\/react-dom\.production\.min\.js/],
  ['Babel Standalone', /@babel\/standalone/],
  ['jQuery DataTables', /jquery\.dataTables\.min\.js/],
  ['Chart.js', /chart\.umd\.min\.js/],
  ['SweetAlert2', /sweetalert2@11/],
  ['root React', /<div\s+id=["']root["']><\/div>/],
  ['script JSX', /<script\s+type=["']text\/babel["']>/],
  ['API wrapper gsRun', /const\s+gsRun\s*=\s*\(/],
  ['Node API bridge', /fetch\(['"]\/api\/run\//],
  ['Apps Script bridge', /google\.script\.run/],
  ['React mount', /ReactDOM\.createRoot\(document\.getElementById\(['"]root['"]\)\)\.render\(<App\s*\/>\)/]
];

for (const [label, pattern] of requiredMarkers) {
  if (!pattern.test(html)) errors.push(`Thiếu mốc runtime: ${label}`);
}

const requiredComponents = [
  'ProcessingOverlay',
  'Pipeline',
  'SearchableDropdown',
  'SearchableMultiSelect',
  'BrandLogo',
  'LoginPage',
  'Sidebar',
  'BottomNavigation',
  'DashboardView',
  'PropertiesView',
  'LeadsView',
  'FollowUpsView',
  'AppointmentsView',
  'DealsView',
  'TenanciesView',
  'UsersView',
  'SettingsView',
  'ReportsView',
  'PublicPortal',
  'MainContent',
  'Dashboard',
  'App'
];

for (const component of requiredComponents) {
  const pattern = new RegExp(`function\\s+${component}\\s*\\(`, 'g');
  const count = (html.match(pattern) || []).length;
  if (count !== 1) {
    errors.push(`Component ${component} phải có đúng 1 định nghĩa, hiện có ${count}`);
  }
}

const uniqueMarkers = [
  ['#root', /<div\s+id=["']root["']><\/div>/g],
  ['React mount', /ReactDOM\.createRoot\(/g],
  ['App component', /function\s+App\s*\(/g]
];

for (const [label, pattern] of uniqueMarkers) {
  const count = (html.match(pattern) || []).length;
  if (count !== 1) errors.push(`${label} phải xuất hiện đúng 1 lần, hiện có ${count}`);
}

const metrics = {
  file: path.relative(projectRoot, htmlPath),
  bytes: Buffer.byteLength(html, 'utf8'),
  lines: html.split(/\r?\n/).length,
  styleBlocks: (html.match(/<style(?:\s[^>]*)?>/g) || []).length,
  babelBlocks: (html.match(/<script\s+type=["']text\/babel["']>/g) || []).length,
  mediaQueries: (html.match(/@media\s*\(/g) || []).length,
  functionComponents: (html.match(/function\s+[A-Z][A-Za-z0-9_]*\s*\(/g) || []).length,
  requiredComponents: requiredComponents.length
};

if (errors.length) {
  console.error('Baseline UI không đạt:');
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(JSON.stringify(metrics, null, 2));
  process.exit(1);
}

console.log('Baseline UI đạt. Chưa phát hiện mất mốc runtime hoặc component chính.');
console.log(JSON.stringify(metrics, null, 2));

