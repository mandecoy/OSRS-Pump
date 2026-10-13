/** OSRS Pump local web + API proxy. No passwords, keys, accounts or external server. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';

const root = process.cwd();
const base = 'https://prices.runescape.wiki/api/v1/osrs';
const agent = `OSRS-Pump/0.1 (https://github.com/mandecoy/OSRS-Pump; ${process.env.OSRS_PUMP_CONTACT || 'GitHub issues'})`;
const port = Number(process.env.PORT || 8765);
const cache = new Map();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};

function routeApi(path,searchParams){
  const paths={'/api/mapping':['mapping',24*3600_000],'/api/latest':['latest',60_000],'/api/1h':['1h',2*60_000],'/api/5m':['5m',60_000],'/api/24h':['24h',30*60_000]};
  if(paths[path]){const [url,ttl]=paths[path];return {url:`${base}/${url}`,ttl};}
  if(path==='/api/timeseries'){
    const id=searchParams.get('id'),step=searchParams.get('step')||'1h';
    if(!/^\d{1,8}$/.test(id||'') || !['5m','1h','6h','24h'].includes(step))return null;
    return {url:`${base}/timeseries?id=${id}&timestep=${step}`,ttl:3*60_000};
  }
  return null;
}
async function proxy(route,res){
  const old=cache.get(route.url);
  if(old && old.expires>Date.now()){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'private, max-age=15','X-OSRS-Pump-Cache':'HIT'});res.end(old.text);return;
  }
  try{
    const result=await fetch(route.url,{headers:{'User-Agent':agent,'Accept':'application/json'},signal:AbortSignal.timeout(12_000)});
    if(!result.ok) throw new Error('Wiki API returned HTTP '+result.status);
    const text=await result.text();JSON.parse(text);
    cache.set(route.url,{text,expires:Date.now()+route.ttl});
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'private, max-age=15'});res.end(text);
  }catch(err){
    if(old){res.writeHead(200,{'Content-Type':'application/json','X-OSRS-Pump-Cache':'STALE'});res.end(old.text);return;}
    res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Unable to fetch public Wiki prices',detail:err.message}));
  }
}
http.createServer(async(req,res)=>{
  let url;try {url=new URL(req.url||'/',`http://localhost:${port}`);}catch{res.writeHead(400);res.end();return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
  if(url.pathname.startsWith('/api/')){
    const route=routeApi(url.pathname,url.searchParams);
    if(!route){res.writeHead(400);res.end('Invalid API request');return;}
    return proxy(route,res);
  }
  const requestPath=(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname));
  const allowed=new Set(['/index.html','/styles.css','/app.js','/logic.js','/manifest.webmanifest','/sw.js','/icons/pump.svg']);
  if(!allowed.has(requestPath)){res.writeHead(404);res.end('Not found');return;}
  const path=resolve(root,'.'+requestPath);
  if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'0.0.0.0',()=>console.log(`OSRS Pump at http://localhost:${port} — Wiki market data is proxied with a descriptive User-Agent`));
