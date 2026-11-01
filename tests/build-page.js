// The test page is index.html exactly as served (it's a complete document, so GitHub Pages and the artifact host
// both show it the same way). Kept as a step so tests always load the latest file.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!/^\s*<!doctype html>/i.test(html)) throw new Error('index.html must start with <!doctype html> (GitHub Pages serves it as-is)');
fs.writeFileSync(path.join(__dirname, 'page.html'), html);
