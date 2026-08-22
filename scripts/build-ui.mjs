import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputPath = path.join(projectRoot, 'code-appscript', 'index.html');
const sourceRoot = path.join(projectRoot, 'ui-src');
const templatePath = path.join(sourceRoot, 'index.template.html');
const stylesDir = path.join(sourceRoot, 'styles');
const scriptsDir = path.join(sourceRoot, 'scripts');

const CSS_MARKER = '<!-- CRM_APP_CSS -->';
const JSX_MARKER = '<!-- CRM_APP_JSX -->';

const args = new Set(process.argv.slice(2));
const extractMode = args.has('--extract');
const checkMode = args.has('--check');
const force = args.has('--force');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function firstDifference(left, right) {
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return -1;
}

function composeSource() {
  for (const sourcePath of [templatePath, scriptsDir, stylesDir]) {
    if (!fs.existsSync(sourcePath)) fail(`Thiếu nguồn UI: ${sourcePath}`);
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css')).sort();
  if (!cssFiles.length) fail(`Không tìm thấy file CSS nào trong: ${stylesDir}`);
  const css = cssFiles.map(f => fs.readFileSync(path.join(stylesDir, f), 'utf8')).join('');

  const jsxFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js')).sort();
  if (!jsxFiles.length) fail(`Không tìm thấy file JSX nào trong: ${scriptsDir}`);
  const jsx = jsxFiles.map(f => fs.readFileSync(path.join(scriptsDir, f), 'utf8')).join('');

  if ((template.match(new RegExp(CSS_MARKER, 'g')) || []).length !== 1) {
    fail(`Template phải chứa đúng một marker ${CSS_MARKER}`);
  }
  if ((template.match(new RegExp(JSX_MARKER, 'g')) || []).length !== 1) {
    fail(`Template phải chứa đúng một marker ${JSX_MARKER}`);
  }

  return template.replace(CSS_MARKER, css).replace(JSX_MARKER, jsx);
}

function checkOutput(output) {
  if (!fs.existsSync(outputPath)) fail(`Không tìm thấy output UI: ${outputPath}`);
  const current = fs.readFileSync(outputPath, 'utf8');
  if (current !== output) {
    const difference = firstDifference(current, output);
    fail(`UI build lệch output đã commit tại vị trí ký tự ${difference}. Hãy chạy npm run build:ui rồi review diff.`);
  }
  console.log(`UI build khớp từng byte: ${sha256(output)}`);
}

if (extractMode) {
  extractSource();
} else {
  const output = composeSource();
  if (checkMode) {
    checkOutput(output);
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    fs.writeFileSync(temporaryPath, output, 'utf8');
    fs.renameSync(temporaryPath, outputPath);
    console.log(`Đã tạo ${path.relative(projectRoot, outputPath)} (${Buffer.byteLength(output, 'utf8')} byte).`);
  }
}
