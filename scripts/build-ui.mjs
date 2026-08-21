import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputPath = path.join(projectRoot, 'code-appscript', 'index.html');
const sourceRoot = path.join(projectRoot, 'ui-src');
const templatePath = path.join(sourceRoot, 'index.template.html');
const foundationCssPath = path.join(sourceRoot, 'styles', '00-foundation.css');
const cssPath = path.join(sourceRoot, 'styles', 'app.css');
const jsxPath = path.join(sourceRoot, 'scripts', 'app.jsx');

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

function extractSource() {
  if (!fs.existsSync(outputPath)) fail(`Không tìm thấy ${outputPath}`);

  const targets = [templatePath, foundationCssPath, cssPath, jsxPath];
  const existing = targets.filter((target) => fs.existsSync(target));
  if (existing.length && !force) {
    fail(`Đã có nguồn UI, không tự ghi đè:\n${existing.join('\n')}\nDùng --force chỉ khi đã xác minh rõ.`);
  }

  const html = fs.readFileSync(outputPath, 'utf8');
  if (html.includes(CSS_MARKER) || html.includes(JSX_MARKER)) {
    fail('index.html đã chứa marker dành cho template; dừng để tránh tách sai.');
  }

  const styleOpen = html.match(/<style(?:\s[^>]*)?>/);
  const jsxOpen = html.match(/<script\s+type=["']text\/babel["']>/);
  if (!styleOpen || styleOpen.index === undefined) fail('Không tìm thấy khối <style> chính.');
  if (!jsxOpen || jsxOpen.index === undefined) fail('Không tìm thấy khối <script type="text/babel"> chính.');

  const styleContentStart = styleOpen.index + styleOpen[0].length;
  const styleContentEnd = html.indexOf('</style>', styleContentStart);
  const jsxContentStart = jsxOpen.index + jsxOpen[0].length;
  const jsxContentEnd = html.indexOf('</script>', jsxContentStart);

  if (styleContentEnd < 0 || jsxContentEnd < 0) fail('Khối CSS hoặc JSX không có thẻ đóng hợp lệ.');
  if (styleContentEnd >= jsxOpen.index) fail('Thứ tự CSS/JSX không đúng với cấu trúc baseline.');

  const css = html.slice(styleContentStart, styleContentEnd);
  const cssSplitMarker = '    /* Login Page */';
  const cssSplitAt = css.indexOf(cssSplitMarker);
  if (cssSplitAt < 0) fail(`Không tìm thấy mốc tách CSS: ${cssSplitMarker}`);
  const foundationCss = css.slice(0, cssSplitAt);
  const applicationCss = css.slice(cssSplitAt);
  const jsx = html.slice(jsxContentStart, jsxContentEnd);
  const template = html.slice(0, styleContentStart)
    + CSS_MARKER
    + html.slice(styleContentEnd, jsxContentStart)
    + JSX_MARKER
    + html.slice(jsxContentEnd);

  const rebuilt = template.replace(CSS_MARKER, css).replace(JSX_MARKER, jsx);
  if (rebuilt !== html) fail('Tách thử không thể ghép lại index.html giống nguyên bản.');

  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.mkdirSync(path.dirname(jsxPath), { recursive: true });
  fs.writeFileSync(templatePath, template, 'utf8');
  fs.writeFileSync(foundationCssPath, foundationCss, 'utf8');
  fs.writeFileSync(cssPath, applicationCss, 'utf8');
  fs.writeFileSync(jsxPath, jsx, 'utf8');

  console.log('Đã tách nguồn UI cơ học, không thay đổi index.html.');
  console.log(JSON.stringify({
    template: path.relative(projectRoot, templatePath),
    foundationCss: path.relative(projectRoot, foundationCssPath),
    css: path.relative(projectRoot, cssPath),
    jsx: path.relative(projectRoot, jsxPath),
    outputSha256: sha256(html)
  }, null, 2));
}

function composeSource() {
  for (const sourcePath of [templatePath, foundationCssPath, cssPath, jsxPath]) {
    if (!fs.existsSync(sourcePath)) fail(`Thiếu nguồn UI: ${sourcePath}`);
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const css = fs.readFileSync(foundationCssPath, 'utf8') + fs.readFileSync(cssPath, 'utf8');
  const jsx = fs.readFileSync(jsxPath, 'utf8');

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
