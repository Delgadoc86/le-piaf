// Imprime un HTML local a PDF con Edge headless (CDP Page.printToPDF).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [entrada, salida] = process.argv.slice(2);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const puerto = 9900 + Math.floor(Math.random() * 90);
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`, '--no-first-run', 'about:blank']);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let destino;
for (let i = 0; i < 50 && !destino; i++) { await esperar(200); try { destino = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(destino.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await cdp('Page.enable');
await cdp('Page.navigate', { url: pathToFileURL(resolve(entrada)).href });
await esperar(3000);
const pie = '<div style="width:100%;font-size:8px;color:#78716c;padding:0 15mm;display:flex;justify-content:space-between;font-family:Segoe UI,sans-serif"><span>Manual del panel · Silverio Club</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>';
const r = await cdp('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: pie });
if (!r.result) { console.error(JSON.stringify(r)); process.exit(1); }
writeFileSync(salida, Buffer.from(r.result.data, 'base64'));
console.log('PDF:', salida);
ws.close(); edge.kill(); process.exit(0);
