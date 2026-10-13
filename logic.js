/** Pure calculations and parsing for OSRS Market Desk. Public market data: OSRS Wiki. */
export const TAX_EXEMPT = new Set([
  'old school bond','energy potion','bronze arrow','bronze dart','iron arrow','iron dart',
  'mind rune','steel arrow','steel dart','bass','bread','cake','cooked chicken',
  'cooked meat','herring','lobster','mackerel','meat pie','pike','salmon',
  'shrimps','tuna','ardougne teleport','camelot teleport','civitas illa fortis teleport',
  'falador teleport','games necklace (8)','kourend castle teleport',
  'lumbridge teleport','ring of dueling (8)','teleport to house',
  'varrock teleport','chisel','gardening trowel','glassblowing pipe','hammer',
  'needle','pestle and mortar','rake','saw','secateurs','seed dibber','shears',
  'spade','watering can (0)'
]);
export const gp = n => Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString('en-US') + ' gp' : '—';
export const compact = n => !Number.isFinite(Number(n)) ? '—' : Math.abs(n)>=1e9?(n/1e9).toFixed(2)+'b':Math.abs(n)>=1e6?(n/1e6).toFixed(2)+'m':Math.abs(n)>=1e3?(n/1e3).toFixed(1)+'k':Math.round(n).toLocaleString('en-US');
export const pct = n => Number.isFinite(n) ? (n*100).toFixed(2)+'%' : '—';
export function geTax(sellPrice,itemName='') {
  if (!Number.isFinite(Number(sellPrice)) || Number(sellPrice)<0) return 0;
  if (TAX_EXEMPT.has(String(itemName).toLowerCase().trim())) return 0;
  return Math.min(5_000_000, Math.floor(Number(sellPrice)*0.02));
}
export function flip(low,high,name='') {
  const buy=Number(low), sell=Number(high);
  if (!Number.isFinite(buy)||!Number.isFinite(sell)||buy<=0||sell<=0) return null;
  const tax=geTax(sell,name), net=sell-buy-tax;
  return {buy,sell,tax,net,roi:net/buy,spread:sell-buy};
}
export const volumeOf = x => Math.max(0,Number(x?.highPriceVolume||0))+Math.max(0,Number(x?.lowPriceVolume||0));
export function ageMinutes(ts,now=Date.now()) { return Number.isFinite(Number(ts)) && Number(ts)>0 ? Math.max(0,(now-Number(ts)*1000)/60000) : Infinity; }
export function classify(name='') {
  const n=name.toLowerCase();
  if (/potion|brew|restore|serum|antidote|super combat|ranging mix/.test(n)) return 'Potions';
  if (/rune|essence|teleport|tablet|scroll/.test(n)) return 'Runes & teleports';
  if (/ore|bar|log|plank|herb|grimy|seed|bones|leather|hide|coal|fish|uncut|gem|raw /.test(n)) return 'Resources';
  if (/sword|bow|shield|plate|helm|boots|gloves|robe|staff|scimitar|whip|armour|crossbow/.test(n)) return 'Equipment';
  if (/dart|arrow|bolt|cannonball|feather|food|shark|anglerfish|scale/.test(n)) return 'Supplies';
  return 'Other';
}
export function mapMarket(mapping,latest,oneHour,fiveMin,now=Date.now()) {
  const l=latest?.data||latest||{}, h=oneHour?.data||{}, f=fiveMin?.data||{};
  const rows=[];
  for(const m of (Array.isArray(mapping)?mapping:(mapping?.data||[]))) {
    const e=l[m.id]; if(!e)continue;
    const high=Number(e.high), low=Number(e.low);
    if(!(high>0&&low>0))continue;
    const trade=flip(low,high,m.name); if(!trade)continue;
    const v1=volumeOf(h[m.id]),v5=volumeOf(f[m.id]);
    const age=Math.max(ageMinutes(e.highTime,now),ageMinutes(e.lowTime,now));
    const liquidity=v1>=1000?'High':v1>=80?'Medium':'Low';
    const score=Math.max(0,Math.min(100,Math.round(
      100 - Math.min(60,age/4) - (v1<10?38:v1<50?24:v1<150?12:0)
      - (trade.roi>0.3?16:trade.roi>0.12?8:0) - (trade.net<=0?24:0)
    )));
    rows.push({...m,...trade,id:Number(m.id),v1,v5,age,liquidity,score,category:classify(m.name),
      highTime:e.highTime||0,lowTime:e.lowTime||0});
  }
  return rows;
}
export function percentile(sorted,p) {
  if(!sorted.length)return null;
  const i=(sorted.length-1)*p, lo=Math.floor(i),hi=Math.ceil(i);
  return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
}
export function analyzeHistory(points,name='') {
  const arr=(points||[]).filter(p=>Number(p.avgLowPrice)>0&&Number(p.avgHighPrice)>0);
  const buys=arr.map(p=>Number(p.avgLowPrice)).sort((a,b)=>a-b);
  const sells=arr.map(p=>Number(p.avgHighPrice)).sort((a,b)=>a-b);
  const entry=percentile(buys,0.25), exit=percentile(sells,0.75);
  const result=entry!==null && exit!==null ? flip(entry,exit,name):null;
  return {samples:arr.length,entry,exit,result,low24:buys.length?buys[0]:null,
    high24:sells.length?sells.at(-1):null,
    volume:arr.reduce((x,p)=>x+volumeOf(p),0),
    latestTimestamp:arr.length?Math.max(...arr.map(p=>Number(p.timestamp)||0)):0};
}
export function filterMarket(rows,f) {
  const q=(f.search||'').trim().toLowerCase();
  return rows.filter(r=>
    (!q||r.name.toLowerCase().includes(q)) &&
    (!f.members||f.members==='all'||(f.members==='members' ? r.members : !r.members)) &&
    (!f.category||f.category==='all'||r.category===f.category) &&
    (f.minPrice==null||r.buy>=f.minPrice) && (f.maxPrice==null||r.buy<=f.maxPrice) &&
    (f.minProfit==null||r.net>=f.minProfit) && (f.maxProfit==null||r.net<=f.maxProfit) &&
    (f.minRoi==null||r.roi*100>=f.minRoi) && (f.maxRoi==null||r.roi*100<=f.maxRoi) &&
    (f.minVolume==null||r.v1>=f.minVolume) && (f.maxVolume==null||r.v1<=f.maxVolume) &&
    (f.minLimit==null||((r.limit||0)>=f.minLimit)) &&
    (f.maxAge==null||r.age<=f.maxAge) &&
    (f.minScore==null||r.score>=f.minScore) &&
    (!f.profitable||r.net>0) &&
    (f.budget==null||r.buy<=f.budget)
  ).sort((a,b)=>(b[f.sort||'net']??0)-(a[f.sort||'net']??0));
}
export function highAlchProfit(item,natureRuneBuy){
  return (Number(item.highalch)||0)-(Number(item.buy)||0)-(Number(natureRuneBuy)||0);
}
export function journalMetrics(trades,itemsById={}){
  let spent=0,proceeds=0,realized=0,locked=0,open=0;
  for(const t of trades){
    const qty=Math.max(0,Number(t.qty)||0),sold=Math.min(qty,Math.max(0,Number(t.soldQty)||0));
    const buy=Number(t.buyPrice)||0,sell=Number(t.sellPrice)||0;
    spent+=qty*buy; proceeds+=sold*(sell-geTax(sell,t.name));
    realized+=sold*(sell-buy-geTax(sell,t.name));
    locked+=(qty-sold)*buy;
    if(qty>sold)open++;
  }
  let unrealized=0;
  for(const t of trades){
    const pending=Math.max(0,(Number(t.qty)||0)-(Number(t.soldQty)||0));
    const market=itemsById[t.id];
    const liquidation=Number(market?.buy ?? market?.low);
    if(pending&&liquidation>0)unrealized+=pending*(liquidation-geTax(liquidation,t.name)-(Number(t.buyPrice)||0));
  }
  return {spent,proceeds,realized,locked,unrealized,open};
}
