/* OSRS Pump v0.3 mobile market views. Only public Wiki market observations. */
import {riskSignals} from './logic.js';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>!Number.isFinite(Number(x))?'—':Math.round(Number(x)).toLocaleString('en-US');
const short=x=>!Number.isFinite(Number(x))?'—':Math.abs(x)>=1e9?(x/1e9).toFixed(2)+'B':Math.abs(x)>=1e6?(x/1e6).toFixed(2)+'M':Math.abs(x)>=1e3?(x/1e3).toFixed(1)+'K':Math.round(x).toLocaleString('en-US');
const number=x=>x===null||x===undefined||x===''?null:Number(x);
const keys=['minPrice','maxPrice','minProfit','maxProfit','minRoi','maxRoi','minVolume','maxVolume','min5m','max5m','minDay','maxDay','minLimit','maxLimit','maxAge','minScore','budget'];
export const DEFAULT_FILTER={sort:'flipRank',direction:'desc',members:'all',profitable:false,showRisky:false};
export const PRESETS={
  liquid:{sort:'flipRank',minVolume:200,profitable:true},
  lowcash:{sort:'flipRank',maxPrice:100000},
  margin:{sort:'flipBatchProfit',minProfit:5,profitable:true},
  highroi:{sort:'flipRoi',minRoi:3,profitable:true},
  expensive:{sort:'flipRank',minPrice:10000000,profitable:true}
};
export const CATEGORIES=[
  {group:'Trending',id:'rising',icon:'↗',label:'Above daily average',detail:'Recent average higher than 24h average',tone:'green'},
  {group:'Trending',id:'falling',icon:'↘',label:'Below daily average',detail:'Recent average lower than 24h average',tone:'red'},
  {group:'Trending',id:'gainers',icon:'⇈',label:'Largest positive gaps',detail:'Biggest GP gap vs daily average',tone:'green'},
  {group:'Trending',id:'losers',icon:'⇊',label:'Largest negative gaps',detail:'Biggest GP gap vs daily average',tone:'red'},
  {group:'Flipping',id:'margins',icon:'◆',label:'High Margins',detail:'Largest after-tax GP per item',tone:'gold'},
  {group:'Flipping',id:'roi',icon:'%',label:'High ROI',detail:'Best after-tax return vs entry price',tone:'gold'},
  {group:'Flipping',id:'fast',icon:'⚡',label:'Fast & Liquid',detail:'Fresh trades and strong recent volume',tone:'green'},
  {group:'Flipping',id:'lowcash',icon:'◈',label:'Low Cash Flips',detail:'Affordable items under 100K GP',tone:'gold'},
  {group:'Flipping',id:'expensive',icon:'♛',label:'Big Ticket Flips',detail:'Items costing 10M GP or more',tone:'gold'},
  {group:'Volume',id:'volume5',icon:'▥',label:'Most Traded · 5m',detail:'Highest completed-trade unit count',tone:'blue'},
  {group:'Volume',id:'volume1',icon:'▥',label:'Most Traded · 1h',detail:'Highest completed-trade unit count',tone:'blue'},
  {group:'Volume',id:'volume24',icon:'▥',label:'Most Traded · 24h',detail:'Highest completed-trade unit count',tone:'blue'},
  {group:'Volume',id:'quiet',icon:'☾',label:'Quiet Items',detail:'Low 1h trade activity; extra caution',tone:'blue'},
  {group:'Money Making',id:'alch',icon:'✦',label:'High Alchemy',detail:'Potential profit after nature rune cost',tone:'green'},
  {group:'Money Making',id:'processing',icon:'⚒',label:'Processing Calculator',detail:'Manually configure inputs and outputs',tone:'violet'},
  {group:'Item Types',id:'runes',icon:'✧',label:'Runes & Teleports',detail:'Runes, teleportation, essences',tone:'gold'},
  {group:'Item Types',id:'herbs',icon:'❃',label:'Herbs & Seeds',detail:'Grimy herbs, clean herbs, seeds',tone:'green'},
  {group:'Item Types',id:'potions',icon:'⚗',label:'Potions',detail:'Brews, restores, doses and mixes',tone:'violet'},
  {group:'Item Types',id:'materials',icon:'◩',label:'Ores, Bars & Logs',detail:'Skilling resources and construction',tone:'blue'},
  {group:'Item Types',id:'weapons',icon:'⚔',label:'Weapons & Armour',detail:'Combat equipment and expensive gear',tone:'gold'},
  {group:'Item Types',id:'food',icon:'♨',label:'Food & Fish',detail:'Fish and healing food',tone:'green'},
  {group:'Item Types',id:'ammunition',icon:'➹',label:'Ammo & Ranged',detail:'Bolts, arrows, darts and supplies',tone:'gold'},
  {group:'Item Types',id:'clues',icon:'◇',label:'Clue Rewards',detail:'Ornament kits, 3rd age and elegant',tone:'violet'}
];
export function decorate(rows,oneHour={},five={},day={}){
 const h=oneHour.data||{},f=five.data||{},d=day.data||{};
 return rows.map(r=>{
   const H=h[r.id],F=f[r.id],D=d[r.id];
   const dayVol=D?(Number(D.highPriceVolume)||0)+(Number(D.lowPriceVolume)||0):null;
   const fiveVol=F?(Number(F.highPriceVolume)||0)+(Number(F.lowPriceVolume)||0):null;
   const mid=(p)=>p&&p.avgHighPrice>0&&p.avgLowPrice>0?(Number(p.avgHighPrice)+Number(p.avgLowPrice))/2:null;
   const daily=mid(D),hourly=mid(H);
   const gap=hourly!==null&&daily!==null&&daily>0?100*(hourly-daily)/daily:null;
   return {...r,dayVol,fiveVol,dayGapPct:gap,dayGapGp:hourly!==null&&daily!==null?hourly-daily:null};
 });
}
function testNum(x,min,max){if(min!==null&&(!(typeof x==='number')||!Number.isFinite(x)||x<min))return false;if(max!==null&&(!(typeof x==='number')||!Number.isFinite(x)||x>max))return false;return true;}
export function applyFilters(rows,f={}){
 let out=rows.filter(r=>{
  const text=(f.search||'').trim().toLowerCase();if(text&&!r.name.toLowerCase().includes(text)&&String(r.id)!==text)return false;
  if(f.members==='members'&&!r.members)return false;if(f.members==='f2p'&&r.members)return false;
  if(f.category&&f.category!=='all'&&r.category!==f.category)return false;
  if(!f.showRisky&&!r.alchMode&&!r.flipRecommended)return false;
  const net=r.alchMode?r.net:f.showRisky?r.net:r.flipNet;
  const roi=r.alchMode?r.roi:f.showRisky?r.roi:r.flipRoi;
  if(f.profitable&&!(net>0))return false;
  if(!testNum(r.buy,number(f.minPrice),number(f.maxPrice)))return false;
  if(!testNum(net,number(f.minProfit),number(f.maxProfit)))return false;
  if(!testNum(roi*100,number(f.minRoi),number(f.maxRoi)))return false;
  if(!testNum(r.v1,number(f.minVolume),number(f.maxVolume)))return false;
  if(!testNum(r.fiveVol,number(f.min5m),number(f.max5m)))return false;
  if(!testNum(r.dayVol,number(f.minDay),number(f.maxDay)))return false;
  if(!testNum(r.limit??null,number(f.minLimit),number(f.maxLimit)))return false;
  if(!testNum(r.age,null,number(f.maxAge)))return false;
  if(!testNum(r.executionScore??0,number(f.minScore),null))return false;
  if(!testNum(r.buy,null,number(f.budget)))return false;
  return true;
 });
 const key=({volume5:'fiveVol',volume24:'dayVol',volume1:'v1',price:'buy',change:'dayGapPct',score:'executionScore',net:'flipNet',roi:'flipRoi'}[f.sort]||f.sort||'flipRank');
 const direction=f.direction==='asc'?1:-1;
 out.sort((a,b)=>{const av=Number(a[key]),bv=Number(b[key]);if(!Number.isFinite(av)&&!Number.isFinite(bv))return a.id-b.id;if(!Number.isFinite(av))return 1;if(!Number.isFinite(bv))return -1;return (av-bv)*direction||a.id-b.id;});
 return out;
}
export function categoryRows(rows,id){
 const n=s=>s.toLowerCase();
 const match=r=>{
  const s=n(r.name);
  switch(id){
   case 'rising':return r.dayGapPct!==null&&r.dayGapPct>0&&r.dayVol>0;
   case 'falling':return r.dayGapPct!==null&&r.dayGapPct<0&&r.dayVol>0;
   case 'gainers':return r.dayGapGp!==null&&r.dayGapGp>0;
   case 'losers':return r.dayGapGp!==null&&r.dayGapGp<0;
   case 'margins':case 'roi':return r.flipRecommended;
   case 'fast':return r.flipRecommended&&r.v1>0;
   case 'lowcash':return r.flipRecommended&&r.buy<=100000;
   case 'expensive':return r.flipRecommended&&r.buy>=10000000;
   case 'volume5':return r.fiveVol!==null&&r.fiveVol>0;
   case 'volume1':return r.v1>0;
   case 'volume24':return r.dayVol!==null&&r.dayVol>0;
   case 'quiet':return r.v1>0&&r.v1<=10;
   case 'alch':return r.highalch>0&&r.sell>0;
   case 'runes':return /rune|essence|teleport|tablet/i.test(s);
   case 'herbs':return /grimy |herb|seed/i.test(s);
   case 'potions':return /potion|brew|restore|antidote|mix/i.test(s);
   case 'materials':return /ore| bar|logs?|planks?|coal|clay|leather/i.test(s);
   case 'weapons':return /sword|bow|scimitar|armour|armor|shield|plate|helm|axe|whip|staff|robe|crossbow|boots|defender|torva/i.test(s);
   case 'food':return /shark|anglerfish|manta|lobster|cooked |raw |karambwan|trout|salmon|swordfish/i.test(s);
   case 'ammunition':return /bolts?|arrows?|darts?|cannonball/i.test(s);
   case 'clues':return /ornament kit|3rd age|elegant|vestment|gilded/i.test(s);
   default:return false;
  }
 };
 let list=rows.filter(match);const by={
 rising:'dayGapPct',falling:'dayGapPct',gainers:'dayGapGp',losers:'dayGapGp',margins:'flipBatchProfit',roi:'flipRoi',
 fast:'flipRank',lowcash:'flipRank',expensive:'flipBatchProfit',volume5:'fiveVol',volume1:'v1',volume24:'dayVol',quiet:'v1'
 };
 const key=by[id];if(key){list.sort((a,b)=>(id==='falling'||id==='losers'||id==='quiet'?1:-1)*((a[key]||0)-(b[key]||0)));}
 return list;
}
// High Alchemy has no GE sale: use the latest actual instant-buy price and nature-rune cost.
// Scan the full item mapping because alch items may have a recent high trade but no low trade.
export function alchemyRows(mapping=[],latest={},oneHour={},five={},day={}){
 const quotes=latest?.data||latest||{}, h=oneHour?.data||{},f=five?.data||{},d=day?.data||{};
 const members=Array.isArray(mapping)?mapping:(mapping?.data||[]);
 const nature=members.find(x=>String(x.name).toLowerCase()==='nature rune');
 const runeCost=Number(quotes[nature?.id]?.high);
 if(!(runeCost>0))return [];
 return members.flatMap(m=>{
  const e=quotes[m.id], price=Number(e?.high),alch=Number(m.highalch);
  if(!(price>0&&alch>0))return [];
  const net=alch-price-runeCost,age=e.highTime>0?Math.max(0,(Date.now()/1000-Number(e.highTime))/60):Infinity;
  if(net<=0)return [];
  const units=o=>o?(Number(o.highPriceVolume)||0)+(Number(o.lowPriceVolume)||0):null;
  const v1=units(h[m.id])??0,fiveVol=units(f[m.id]),dayVol=units(d[m.id]);
  const score=Math.max(0,Math.min(100,Math.round(100-Math.min(60,age/12)-(v1<10?25:v1<50?15:0))));
  return [{...m,id:Number(m.id),buy:price,sell:alch,highalch:alch,natureCost:runeCost,net,roi:net/(price+runeCost),v1,fiveVol,dayVol,age,score,alchMode:true,category:'Alchemy'}];
 }).sort((a,b)=>b.net-a.net);
}
function pic(r){if(!r.icon)return '<span class="pump-item-fallback">◈</span>';const url='https://oldschool.runescape.wiki/images/'+encodeURIComponent(r.icon.replace(/ /g,'_'));return '<img loading="lazy" alt="" src="'+esc(url)+'" onerror="this.style.display=\'none\'">';}
function title(t,sub){return '<div class="pump-section-title"><h2>'+esc(t)+'</h2><p>'+esc(sub||'')+'</p></div>';}
function row(r,ctx){
 const age=Number.isFinite(r.age)?Math.round(r.age)+'m':'Unknown',watched=ctx.user.watchlist.includes(r.id);
 const signals=riskSignals(r),bad=signals.level==='high',net=r.net||0;
 const subtitle=r.alchMode
  ?'<small>Buy '+short(r.buy)+' · High Alch '+short(r.highalch)+' · Rune '+short(r.natureCost)+'</small>'
  :'<small>Entry '+short(r.buy)+' · Exit '+short(r.sell)+' gp</small>';
 const units='<small>24h volume '+(r.dayVol===null||r.dayVol===undefined?'—':short(r.dayVol))+' · 1h '+short(r.v1)+' · Age '+age+'</small>';
 const indicator='<span class="pump-risk pump-risk-'+signals.level+'" title="'+esc(signals.flags.join(' · ')||'No major flags in this data snapshot')+'">'+(signals.flags.length?'⚠ '+esc(signals.flags.slice(0,2).join(' · ')):'✓ No major flags')+'</span>';
 return '<article class="pump-item-card '+(bad?'pump-muted':'')+'"><button class="pump-item-main" data-open="'+r.id+'"><span class="pump-sprite">'+pic(r)+'</span><span class="pump-item-summary"><strong>'+esc(r.name)+'</strong>'+subtitle+units+indicator+'</span><span class="pump-gain '+(net>0?'pump-up':'pump-down')+'">'+(net>0?'+':'')+short(net)+'<small>'+(r.alchMode?'gp / alch':'gp / ea after tax')+'</small><small>'+((r.roi||0)*100).toFixed(1)+'% ROI</small></span></button><button class="pump-star" data-watch="'+r.id+'" aria-label="'+(watched?'Remove from':'Add to')+' watchlist">'+(watched?'★':'☆')+'</button></article>';
}
function list(rows,ctx,limit=10){return rows.length?rows.slice(0,limit).map(r=>row(r,ctx)).join(''):'<div class="pump-empty">No matching items. Try a wider price range, higher trade age, or fewer volume restrictions.</div>';}
function filtersModal(ctx){
 const f=ctx.user.v3Filter||DEFAULT_FILTER;
 const text=(k,label)=>'<label class="pump-filter-field">'+esc(label)+'<input inputmode="decimal" name="'+k+'" placeholder="Any" value="'+esc(f[k]??'')+'" autocomplete="off"></label>';
 const pair=(a,al,b,bl)=>'<div class="pump-filter-pair">'+text(a,al)+text(b,bl)+'</div>';
 const select=(k,label,opts)=>'<label class="pump-filter-field">'+label+'<select name="'+k+'">'+opts.map(([v,n])=>'<option value="'+v+'" '+(f[k]===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';
 return '<div class="pump-sheet" id="pumpFilterSheet" hidden><div class="pump-sheet-shade" data-v3-close="1"></div><form id="pumpFilterForm" class="pump-sheet-panel"><div class="pump-sheet-head"><div><small>OSRS PUMP</small><h3>Advanced Market Filters</h3></div><button type="button" data-v3-close="1" aria-label="Close filters">✕</button></div><div class="pump-sheet-scroll">'
 + '<h4>Price & budget (GP)</h4>'+pair('minPrice','Min item price','maxPrice','Max item price')+pair('budget','Capital available','minLimit','Min 4-hour buy limit')
 + '<h4>Estimated flipping returns</h4>'+pair('minProfit','Min net profit / ea','maxProfit','Max net profit / ea')+pair('minRoi','Min after-tax ROI %','maxRoi','Max after-tax ROI %')
 + '<h4>Trading volume (units)</h4>'+pair('min5m','Min 5m volume','max5m','Max 5m volume')+pair('minVolume','Min 1h volume','maxVolume','Max 1h volume')+pair('minDay','Min 24h volume','maxDay','Max 24h volume')
 + '<h4>Freshness & risk</h4>'+pair('maxAge','Max price age (min)','minScore','Min execution score')
 + select('members','Membership',[['all','All items'],['members','Members only'],['f2p','Free to play']])
 + select('sort','Sort results',[['flipRank','Best feasible flip'],['flipBatchProfit','Capped batch profit'],['flipRoi','After-tax ROI'],['executionScore','Execution evidence (0-100)'],['net','GP / item'],['volume1','Hourly volume'],['volume24','Daily volume'],['volume5','5m volume'],['price','Entry price'],['change','Daily average gap']])
 + select('direction','Sort order',[['desc','High to low'],['asc','Low to high']])
 + '<label class="pump-filter-check"><input name="profitable" type="checkbox" '+(f.profitable?'checked':'')+'> Show profitable margins only</label>'
 + '<label class="pump-filter-check"><input name="showRisky" type="checkbox" '+(f.showRisky?'checked':'')+'> Include anomalies &amp; low-volume items (research only)</label>'
 + '<p class="pump-caveat">Wiki prices are observations of completed trades, not live offers. Recommended flips require recent two-sided activity, 1%+ after-tax ROI, 5 GP+ per item, and 1,000 GP+ capacity-sized profit. Execution score is a heuristic, not a fill probability. Fields accept K and M suffixes.</p></div>'
 + '<div class="pump-sheet-actions"><button type="button" class="pump-outline" data-v3-reset="1">Reset</button><button class="pump-gold" type="submit">Apply filters</button></div></form></div>';
}
export function parseGp(str){
 if(str===null||str===undefined||String(str).trim()==='')return null;
 const clean=String(str).trim().replace(/,/g,'');
 const m=/^(\d+(?:\.\d+)?)([kmb])?$/i.exec(clean);
 if(!m)return NaN;const result=Number(m[1])*({k:1e3,m:1e6,b:1e9}[m[2]?.toLowerCase()]||1);
 return Number.isFinite(result)?result:NaN;
}
export function validate(f){
 for(const key of keys)if(f[key]!=null&&(!Number.isFinite(f[key])||f[key]<0))return 'Invalid value in '+key;
 for(const [a,b] of [['minPrice','maxPrice'],['minProfit','maxProfit'],['minRoi','maxRoi'],['minVolume','maxVolume'],['min5m','max5m'],['minDay','maxDay'],['minLimit','maxLimit']])
 if(f[a]!=null&&f[b]!=null&&f[a]>f[b])return a+' must not exceed '+b;
 return null;
}
function toolbar(ctx,items,mode){
 const count=items.length.toLocaleString(), f=ctx.user.v3Filter||DEFAULT_FILTER;
 const chips=['showRisky','minPrice','maxPrice','minProfit','minRoi','minVolume','maxVolume','minDay','maxAge','members'].filter(k=>f[k]!==undefined&&f[k]!==null&&f[k]!==''&&f[k]!=='all');
 return '<div class="pump-toolbar"><strong>'+count+' items</strong><button class="pump-outline" data-v3-filter="1">☷ Filters '+(chips.length?'('+chips.length+')':'')+'</button></div><div class="pump-quick-presets">'
 +Object.entries({liquid:'Liquid',lowcash:'Under 100K',margin:'High Margin',highroi:'High ROI',expensive:'10M+'}).map(([k,v])=>'<button data-v3-preset="'+k+'">'+v+'</button>').join('')
 +'</div><p class="pump-caption">Screened for fresh two-sided trades and repeatable volume. Ranked by conservative after-tax ROI and capacity-sized profit. Execution score measures evidence, not fill probability.</p>';
}
export function home(ctx){
 const market=ctx.rows||[],fresh=market.filter(x=>x.net>0&&x.age<=60&&x.v1>0),best=[...fresh].sort((a,b)=>b.score-a.score||b.net-a.net);
 const watched=ctx.user.watchlist.map(id=>market.find(x=>x.id===id)).filter(Boolean);
 const active=market.filter(r=>r.v1>0).length,day=market.reduce((n,r)=>n+(r.dayVol||0),0);
 const stat=(label,val,foot,tone)=>'<div class="pump-metric '+(tone||'')+'"><small>'+label+'</small><strong>'+val+'</strong><span>'+foot+'</span></div>';
 const chunk=(label,cat,items)=>'<section class="pump-discovery"><div class="pump-section-heading"><h3>'+label+'</h3><button data-v3-cat="'+cat+'">See all →</button></div>'+list(items,ctx,4)+'</section>';
 return '<div class="pump-home">'
 +'<div class="pump-hero"><small>THE GRAND EXCHANGE · PUBLIC MARKET DATA</small><h2>Find your next <em>flip.</em></h2><p>Every publicly priced item, calculated after GE tax.</p></div>'
 +'<div class="pump-ticker"><span>◆</span> Wiki price feed &nbsp;·&nbsp; '+market.length.toLocaleString()+' priced items &nbsp;·&nbsp; '+active.toLocaleString()+' with 1h trade activity &nbsp;·&nbsp; Observed prices ≠ guaranteed offers</div>'
 +'<div class="pump-section-heading"><h3>Market overview</h3><span>Current snapshot</span></div><div class="pump-overview">'
 +stat('Priced items',money(market.length),'From OSRS Wiki','')
 +stat('Active in 1h',money(active),'Observed trade volume','')
 +stat('24h traded units',day?short(day):'—',day?'Summed item volumes':'Not available','')
 +stat('Fresh flip ideas',money(fresh.length),'Within 60m · net positive','')
 +'</div><div class="pump-section-heading"><h3>Quick tools</h3></div><div class="pump-shortcuts">'
 +[['flips','⚖','Flip Finder'],['markets','◆','Markets'],['portfolio','▣','Portfolio'],['money','✦','Money Making']].map(([id,icon,label])=>'<button data-go="'+id+'"><b>'+icon+'</b><small>'+label+'</small></button>').join('')+'</div>'
 +chunk('◆ High-confidence candidates','fast',best)
 +chunk('↗ Above daily average','rising',categoryRows(market,'rising'))
 +chunk('⚡ Most traded · 1 hour','volume1',categoryRows(market,'volume1'))
 +chunk('✧ Your watchlist','margins',watched)
 +'<p class="pump-caveat">The 24h average-gap sections compare recent and 24-hour average prices; they are not literal 24-hour percentage returns.</p>'
 +'</div>';
}
export function markets(ctx){
 const all=ctx.rows||[],cat=ctx.user.v3Category,info=CATEGORIES.find(x=>x.id===cat);
 if(info&&cat==='processing'){return '<div class="pump-back"><button data-v3-back="1">← Markets</button></div>'+title('Processing calculator','Calculate an item conversion using actual ingredient quantities.')+'<button class="pump-gold" data-go="money">Open Money Making Lab →</button>';}
 if(info){
 const items=cat==='alch'?(ctx.alchRows||[]):categoryRows(all,cat);
 const f=ctx.user.v3Filter||DEFAULT_FILTER;
 const sorts={rising:'change',falling:'change',gainers:'dayGapGp',losers:'dayGapGp',margins:'net',roi:'roi',fast:'v1',lowcash:'roi',expensive:'net',volume5:'volume5',volume1:'volume1',volume24:'volume24',quiet:'v1',alch:'net'};
 const autoSort=f.sort==='flipRank';
 const isFlip=['margins','roi','fast','lowcash','expensive'].includes(cat);
 const selected=applyFilters(items,{...f,showRisky:!isFlip||f.showRisky,sort:autoSort?(sorts[cat]||'flipRank'):f.sort,direction:autoSort&&['falling','losers','quiet'].includes(cat)?'asc':f.direction,search:''});
 return '<div class="pump-back"><button data-v3-back="1">← All markets</button></div>'
 +title(info.icon+' '+info.label,info.detail)
 +'<p class="pump-caveat">This is a data-driven category. Trade volume measures past filled items, not order-book depth.</p>'
 +toolbar(ctx,selected,'markets')
 +'<div class="pump-list">'+list(selected,ctx,ctx.user.v3Limit||10)+'</div>'
 +(selected.length>(ctx.user.v3Limit||40)?'<button class="pump-more" data-v3-more="1">Load more '+(selected.length-(ctx.user.v3Limit||40))+' remaining</button>':'')
 +filtersModal(ctx);
 }
 let output=title('Market Discovery','Browse publicly sourced Grand Exchange opportunities');
 let group='';
 for(const c of CATEGORIES){if(c.group!==group){if(group)output+='</div></section>';group=c.group;output+='<section class="pump-category-group"><h3>'+esc(group)+'</h3><div class="pump-category-grid">';}
 const count=c.id==='alch'?(ctx.alchRows||[]).length:categoryRows(all,c.id).length;
 output+='<button class="pump-category-tile pump-border-'+c.tone+'" data-v3-cat="'+c.id+'"><span class="pump-category-icon">'+c.icon+'</span><span class="pump-category-description"><strong>'+esc(c.label)+'</strong><small>'+esc(c.detail)+'</small></span><span class="pump-category-count">'+(all.length?count.toLocaleString():'—')+' ›</span></button>';
 }if(group)output+='</div></section>';
 return output+'<p class="pump-caveat">“Above/below daily average” compares observed hourly and daily average prices, not start/end-of-day returns. Live players and exact tax totals are intentionally not fabricated.</p>';
}
export function flips(ctx){
 const rows=ctx.rows||[],filter=ctx.user.v3Filter||DEFAULT_FILTER;
 const result=applyFilters(rows,filter);
 const text=esc(filter.search||'');
 return title('Advanced Flip Finder','Realistic candidates only by default. Illiquid items are research-only; do not mistake anomalies for fillable trades.')
 +'<div class="pump-searchbar"><span>⌕</span><input id="pumpFlipSearch" placeholder="Search items by name or item ID…" value="'+text+'" autocomplete="off"><button id="pumpFlipFind" type="button">Find</button></div>'
 +toolbar(ctx,result,'flips')
 +'<div class="pump-list">'+list(result,ctx,ctx.user.v3Limit||40)+'</div>'
 +(result.length>(ctx.user.v3Limit||40)?'<button class="pump-more" data-v3-more="1">Load next items • '+(result.length-(ctx.user.v3Limit||40))+' remaining</button>':'')
 +filtersModal(ctx);
}
export function init(ctx){
 if(window.__pumpV03Ready)return;window.__pumpV03Ready=true;
 document.addEventListener('click',e=>{
  const el=e.target.closest('[data-v3-cat],[data-v3-back],[data-v3-filter],[data-v3-close],[data-v3-reset],[data-v3-more],[data-v3-preset]');
  if(el){
   if(el.dataset.v3Cat){ctx.user.v3Category=el.dataset.v3Cat;ctx.user.v3Filter={...DEFAULT_FILTER};ctx.user.v3Limit=10;ctx.save();ctx.nav('markets');}
   else if(el.dataset.v3Back){ctx.user.v3Category=null;ctx.save();ctx.nav('markets');}
   else if(el.dataset.v3Filter){const panel=$('#pumpFilterSheet');if(panel){panel.hidden=false;document.body.classList.add('pump-sheet-open');}}
   else if(el.dataset.v3Close){const panel=$('#pumpFilterSheet');if(panel)panel.hidden=true;document.body.classList.remove('pump-sheet-open');}
   else if(el.dataset.v3Reset){ctx.user.v3Filter={...DEFAULT_FILTER};ctx.user.v3Limit=10;ctx.save();ctx.renderPage();}
   else if(el.dataset.v3More){ctx.user.v3Limit=(ctx.user.v3Limit||10)+10;ctx.renderPage();}
   else if(el.dataset.v3Preset){const search=ctx.user.v3Filter?.search||'';ctx.user.v3Filter={...DEFAULT_FILTER,...PRESETS[el.dataset.v3Preset],search};ctx.user.v3Limit=10;ctx.save();ctx.renderPage();}
   return;
  }
  if(e.target.id==='pumpFlipFind'){search();return;}
 });
 document.addEventListener('submit',e=>{
  if(e.target.id!=='pumpFilterForm')return;
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target));const f={...ctx.user.v3Filter,...d};
  for(const k of keys)f[k]=parseGp(d[k]);
  f.profitable=!!e.target.querySelector('[name=profitable]').checked;
  f.showRisky=!!e.target.querySelector('[name=showRisky]').checked;
  f.search=ctx.user.v3Filter?.search||'';
  const error=validate(f);if(error){ctx.toast(error.replace(/([a-z])([A-Z])/g,'$1 $2'));return;}
  ctx.user.v3Filter=f;ctx.user.v3Limit=10;ctx.save();document.body.classList.remove('pump-sheet-open');ctx.renderPage();
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#pumpFilterSheet')&&!$('#pumpFilterSheet').hidden){$('#pumpFilterSheet').hidden=true;document.body.classList.remove('pump-sheet-open');}
  if(e.key==='Enter'&&(e.target.id==='pumpFlipSearch'||e.target.id==='pumpTopSearch')){e.preventDefault();search();}
 });
 document.addEventListener('click',e=>{if(e.target.id==='pumpTopGo')search();});
 function search(){
  const input=$('#pumpFlipSearch')||$('#pumpTopSearch');if(!input)return;
  ctx.user.v3Filter={...(ctx.user.v3Filter||DEFAULT_FILTER),search:input.value.trim()};
  ctx.user.v3Limit=10;ctx.save();ctx.nav('flips');
 }
}
