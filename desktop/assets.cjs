const path = require('node:path');

// Keep root-relative /sources URLs working without a local HTTP server.
function assetPath(root, requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== 'trainer:' || url.host !== 'app') throw new Error('Unknown origin');
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Outside application');
  return target;
}

module.exports = { assetPath };
