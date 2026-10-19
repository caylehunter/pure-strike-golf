// Wraps index.html in the document skeleton the artifact host adds at publish time.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
  + fs.readFileSync(path.join(root, 'index.html'), 'utf8') + '</body></html>';
fs.writeFileSync(path.join(__dirname, 'page.html'), html);
