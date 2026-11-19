// Stayflow Design Lab server. Static files only, bound to loopback. Not part of the product and never connected to the database.
// Usage: node scripts/design-lab-server.mjs   (then open http://127.0.0.1:4173/)
import http from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const lab = join(root, 'design-lab');
const mounts = { '/ledger-dist/': join(root, 'dist', 'assets'), '/fonts/': join(root, 'prototypes', 'stayflow', 'fonts') };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webm': 'video/webm', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
const port = Number(process.env.LAB_PORT ?? 4173);

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let base = lab, path = decodeURIComponent(url.pathname);
  for (const [prefix, dir] of Object.entries(mounts)) if (path.startsWith(prefix)) { base = dir; path = path.slice(prefix.length - 1); }
  if (base === mounts['/ledger-dist/'] && path === '/app.css') path = '/' + readdirSync(base).find(f => f.endsWith('.css'));
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(base, path));
  if ((file !== base && !file.startsWith(base + sep)) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Design Lab: http://127.0.0.1:${port}/ (loopback only; Ctrl+C to stop)`));
