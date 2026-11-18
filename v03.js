/* OSRS Pump Hardcore GE: simple, transparent market discovery with no hidden 5GP/volume thresholds. */
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Math.round(Number(x)).toLocaleString('en-US');
const short=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Math.abs(x)>=1e9?(x/1e9).toFixed(2)+'B':Math.abs(x)>=1e6?(x/1e6).toFixed(2)+'M':Math.abs(x)>=1e3?(x/1e3).toFixed(1)+'K':fmt(x);
const num=x=>x==null||x===''?null:Number(x);
const numeric=['minPrice','maxPrice','minProfit','maxProfit','minRoi','maxRoi','minVolume','maxVolume','min5m','max5m','minDay','maxDay','minLimit','maxLimit','maxAge','budget'];
export const DEFAULT_FILTER={sort:'flipRank',direction:'desc',members:'all',profitable:false,activity:'all'};
export const PRESETS={
 all:{...DEFAULT_FILTER},
 active:{...DEFAULT_FILTER,activity:'two-sided',sort:'flipRank'},
 lowcash:{...DEFAULT_FILTER,maxPrice:100000},
 roi:{...DEFAULT_FILTER,sort:'roi',profitable:true},
 profit:{...DEFAULT_FILTER,sort:'flipBatchProfit',profitable:true}
};
export const CATEGORIES=[
 {group:'Discover Flips',id:'all',icon:'◆',label:'All GE Items',detail:'Every item with two observed prices',tone:'gold'},
 {group:'Discover Flips',id:'roi',icon:'%',label:'Highest ROI',detail:'After-tax percentage, all price ranges',tone:'gold'},
 {group:'Discover Flips',id:'margins',icon:'↗',label:'Highest GP per Item',detail:'Largest observed net margin',tone:'gold'},
 {group:'Discover Flips',id:'fast',icon:'⚡',label:'Active Flip Ideas',detail:'Traded on both sides within 24h',tone:'green'},
 {group:'Discover Flips',id:'lowcash',icon:'◈',label:'Under 100K',detail:'Low-budget item opportunities',tone:'green'},
 {group:'Discover Flips',id:'expensive',icon:'♛',label:'Over 10M',detail:'Expensive item observations',tone:'gold'},
 {group:'Trading Activity',id:'volume24',icon:'▥',label:'Most Traded (24h)',detail:'Wiki traded units, both sides',tone:'blue'},
 {group:'Trading Activity',id:'volume1',icon:'▥',label:'Most Traded (1h)',detail:'Recent hourly traded units',tone:'blue'},
 {group:'Trading Activity',id:'volume5',icon:'▥',label:'Most Traded (5m)',detail:'Recent five-minute traded units',tone:'blue'},
 {group:'Trading Activity',id:'quiet',icon:'☾',label:'Quiet Markets',detail:'Older or little trading, still searchable',tone:'blue'},
 {group:'Item Types',id:'runes',icon:'✧',label:'Runes & Teleports',detail:'Including 1 GP-margin rune flips',tone:'gold'},
 {group:'Item Types',id:'herbs',icon:'❃',label:'Herbs & Seeds',detail:'Herbs and seeds',tone:'green'},
 {group:'Item Types',id:'potions',icon:'⚗',label:'Potions',detail:'Potion doses, mixes, restores',tone:'violet'},
 {group:'Item Types',id:'materials',icon:'◩',label:'Ores, Bars & Logs',detail:'Skilling resources',tone:'blue'},
 {group:'Item Types',id:'weapons',icon:'⚔',label:'Weapons & Armour',detail:'Combat equipment',tone:'gold'},
 {group:'Item Types',id:'food',icon:'♨',label:'Food & Fish',detail:'Cooking and healing',tone:'green'},
 {group:'Item Types',id:'ammunition',icon:'➹',label:'Ammo & Ranged',detail:'Bolts, arrows and darts',tone:'gold'},
 {group:'Item Types',id:'clues',icon:'◇',label:'Clue Rewards',detail:'Treasure Trails gear',tone:'violet'}
];
export function decorate(rows,oneHour={},five={},day={}){
 const h=oneHour?.data||{},f=five?.data||{},d=day?.data||{};
 return rows.map(r=>{
  const H=h[r.id],F=f[r.id],D=d[r.id];
  const units=p=>p?(Number(p.highPriceVolume)||0)+(Number(p.lowPriceVolume)||0):null;
  const mid=p=>p&&p.avgHighPrice>0&&p.avgLowPrice>0?(Number(p.avgHighPrice)+Number(p.avgLowPrice))/2:null;
  const daily=mid(D),hourly=mid(H);
  return {...r,dayVol:units(D),fiveVol:units(F),dayGapPct:hourly!==null&&daily!==null&&daily>0?100*(hourly-daily)/daily:null,
   dayGapGp:hourly!==null&&daily!==null?hourly-daily:null};
 });
}
const between=(x,lo,hi)=>{const v=Number(x);if(lo!==null&&(!Number.isFinite(v)||v<lo))return false;if(hi!==null&&(!Number.isFinite(v)||v>hi))return false;return true;};
export function applyFilters(rows,f={}){
 const text=String(f.search||'').trim().toLowerCase();
 const out=rows.filter(r=>{
  if(text&&!r.name.toLowerCase().includes(text)&&String(r.id)!==text)return false;
  if(f.members==='members'&&!r.members)return false;
  if(f.members==='f2p'&&r.members)return false;
  if(f.category&&f.category!=='all'&&r.category!==f.category)return false;
  if(f.activity==='two-sided'&&!(r.flipDayHighVolume>0&&r.flipDayLowVolume>0))return false;
  if(f.activity==='hourly'&&!(r.flipHourHighVolume>0&&r.flipHourLowVolume>0))return false;
  if(f.profitable&&!(r.net>0))return false;
  if(!between(r.buy,num(f.minPrice),num(f.maxPrice)))return false;
  if(!between(r.net,num(f.minProfit),num(f.maxProfit)))return false;
  if(!between(r.roi*100,num(f.minRoi),num(f.maxRoi)))return false;
  if(!between(r.v1,num(f.minVolume),num(f.maxVolume)))return false;
  if(!between(r.fiveVol,num(f.min5m),num(f.max5m)))return false;
  if(!between(r.dayVol,num(f.minDay),num(f.maxDay)))return false;
  if(!between(r.limit??null,num(f.minLimit),num(f.maxLimit)))return false;
  if(!between(r.age,null,num(f.maxAge)))return false;
  if(!between(r.buy,null,num(f.budget)))return false;
  return true;
 });
 const key=({price:'buy',volume1:'v1',volume24:'dayVol',volume5:'fiveVol',
  net:'net',roi:'roi',change:'dayGapPct'}[f.sort]||f.sort||'flipRank');
 const direction=f.direction==='asc'?1:-1;
 out.sort((a,b)=>{const x=Number(a[key]),y=Number(b[key]);if(!Number.isFinite(x)&&!Number.isFinite(y))return a.id-b.id;
  if(!Number.isFinite(x))return 1;if(!Number.isFinite(y))return -1;
  return (x-y)*direction||a.id-b.id;
 });
 return out;
}
export function categoryRows(rows,id){
 const test=r=>{
  const n=r.name.toLowerCase();
  switch(id){
  case 'all':return true;
  case 'roi':case 'margins':return r.net>0;
  case 'fast':return r.net>0&&r.flipDayHighVolume>0&&r.flipDayLowVolume>0;
  case 'lowcash':return r.net>0&&r.buy<=100000;
  case 'expensive':return r.net>0&&r.buy>=10000000;
  case 'volume5':return r.fiveVol>0;
  case 'volume1':return r.v1>0;
  case 'volume24':return r.dayVol>0;
  case 'quiet':return !r.flipDayHighVolume||!r.flipDayLowVolume||r.v1<=10;
  case 'runes':return /rune|essence|teleport|tablet/i.test(n);
  case 'herbs':return /grimy |herb|seed/i.test(n);
  case 'potions':return /potion|brew|restore|antidote|mix/i.test(n);
  case 'materials':return /ore| bar|logs?|planks?|coal|clay|leather/i.test(n);
  case 'weapons':return /sword|bow|scimitar|armour|armor|shield|plate|helm|axe|whip|staff|robe|crossbow|boots|defender|torva/i.test(n);
  case 'food':return /shark|anglerfish|manta|lobster|cooked |raw |karambwan|trout|salmon|swordfish/i.test(n);
  case 'ammunition':return /bolts?|arrows?|darts?|cannonball/i.test(n);
  case 'clues':return /ornament kit|3rd age|elegant|vestment|gilded/i.test(n);
  default:return false;
  }
 };
 const result=rows.filter(test);
 const key=({margins:'net',roi:'roi',fast:'flipRank',lowcash:'flipRank',expensive:'net',volume5:'fiveVol',volume1:'v1',volume24:'dayVol',quiet:'v1'}[id]||'flipRank');
 result.sort((a,b)=>(id==='quiet'?1:-1)*((a[key]||0)-(b[key]||0)));
 return result;
}
function pic(r){if(!r.icon)return '<span class="pump-item-fallback">◈</span>';const url='https://oldschool.runescape.wiki/images/'+encodeURIComponent(r.icon.replace(/ /g,'_'));return '<img loading="lazy" alt="" src="'+esc(url)+'" onerror="this.style.display=\'none\'">';}
function title(t,sub){return '<div class="pump-section-title"><h2>'+esc(t)+'</h2><p>'+esc(sub||'')+'</p></div>';}
function row(r,ctx){
 const watching=ctx.user.watchlist.includes(r.id),net=r.net,positive=net>0;
 const roi=Number.isFinite(r.roi)?(r.roi*100).toFixed(1)+'%':'—';
 const age=Number.isFinite(r.age)?(r.age<60?Math.round(r.age)+'m':Math.round(r.age/60)+'h'):'—';
 const volume=r.dayVol==null?'—':short(r.dayVol),activity=r.flipGrade||'Unknown activity';
 return '<article class="pump-item-card"><button class="pump-item-main" data-open="'+r.id+'">'+
  '<span class="pump-sprite">'+pic(r)+'</span><span class="pump-item-summary"><strong>'+esc(r.name)+'</strong>'+
  '<small>Observed buy '+fmt(r.buy)+' → sell '+fmt(r.sell)+' GP</small>'+
  '<small>24h '+volume+' units · 1h '+short(r.v1)+' · Quote '+age+'</small>'+
  '<small class="pump-execution-detail">'+esc(activity)+(positive&&r.flipUnits>0?' · Up to '+fmt(r.flipUnits)+' units / '+short(r.flipBatchProfit)+' GP scenario':' · Capacity not confirmed')+'</small></span>'+
  '<span class="pump-gain '+(positive?'pump-up':'pump-down')+'">'+(positive?'+':'')+fmt(net)+'<small>GP/item after tax</small><small>'+roi+' ROI</small></span></button>'+
  '<button class="pump-star" data-watch="'+r.id+'" aria-label="'+(watching?'Remove from':'Add to')+' watchlist">'+(watching?'★':'☆')+'</button></article>';
}
function list(rows,ctx,limit=10){return rows.length?rows.slice(0,limit).map(r=>row(r,ctx)).join(''):'<div class="pump-empty">No matches. Try a different search or clear your filters; all priced items are searchable.</div>';}
export function parseGp(value){
 if(value==null||String(value).trim()==='')return null;
 const m=/^(\d+(?:\.\d+)?)([kmb])?$/i.exec(String(value).trim().replace(/,/g,''));
 if(!m)return NaN;
 return Number(m[1])*({k:1e3,m:1e6,b:1e9}[m[2]?.toLowerCase()]||1);
}
export function validate(f){
 for(const key of numeric)if(f[key]!=null&&(!Number.isFinite(f[key])||f[key]<0))return 'Invalid '+key;
 for(const [a,b] of [['minPrice','maxPrice'],['minProfit','maxProfit'],['minRoi','maxRoi'],['minVolume','maxVolume'],['min5m','max5m'],['minDay','maxDay'],['minLimit','maxLimit']])
  if(f[a]!=null&&f[b]!=null&&f[a]>f[b])return a+' cannot exceed '+b;
 return null;
}
function filterSheet(ctx){
 const f=ctx.user.v3Filter||DEFAULT_FILTER;
 const field=(key,label)=>'<label class="pump-filter-field">'+esc(label)+'<input inputmode="decimal" name="'+key+'" placeholder="Any" value="'+esc(f[key]??'')+'"></label>';
 const pair=(a,al,b,bl)=>'<div class="pump-filter-pair">'+field(a,al)+field(b,bl)+'</div>';
 const select=(key,label,options)=>'<label class="pump-filter-field">'+label+'<select name="'+key+'">'+options.map(([v,n])=>'<option value="'+v+'"'+(f[key]===v?' selected':'')+'>'+n+'</option>').join('')+'</select></label>';
 return '<div class="pump-sheet" id="pumpFilterSheet" hidden><div class="pump-sheet-shade" data-v3-close="1"></div>'+
  '<form id="pumpFilterForm" class="pump-sheet-panel"><div class="pump-sheet-head"><div><small>HARDCORE GE</small><h3>Flip Filters</h3></div>'+
  '<button type="button" data-v3-close="1" aria-label="Close">✕</button></div><div class="pump-sheet-scroll">'+
  '<h4>Price (GP)</h4>'+pair('minPrice','Min buy','maxPrice','Max buy')+
  '<h4>After-tax margin (GP)</h4>'+pair('minProfit','Min GP/item','maxProfit','Max GP/item')+
  '<h4>ROI (%)</h4>'+pair('minRoi','Min ROI','maxRoi','Max ROI')+
  '<h4>Trading volume (units)</h4>'+pair('minVolume','Min 1h','maxVolume','Max 1h')+pair('minDay','Min 24h','maxDay','Max 24h')+
  '<h4>Other</h4>'+select('activity','Activity',[['all','All items'],['two-sided','Two-sided 24h trades'],['hourly','Two-sided 1h trades']])+
  select('members','Membership',[['all','All items'],['members','Members only'],['f2p','Free to play']])+
  select('sort','Sort',[['flipRank','Best overall'],['roi','Highest ROI'],['net','Highest GP/item'],['flipBatchProfit','Budget-sized potential'],['volume24','24h volume'],['volume1','1h volume'],['price','Price']])+
  select('direction','Order',[['desc','High to low'],['asc','Low to high']])+
  '<label class="pump-filter-check"><input type="checkbox" name="profitable"'+(f.profitable?' checked':'')+'> Positive net margin only</label>'+
  '<p class="pump-caveat">Hardcore Worlds prices are past completed trades, not guaranteed buy/sell offers. Activity and buy limits help size opportunities; no hard minimum margin blocks inexpensive runes.</p></div>'+
  '<div class="pump-sheet-actions"><button type="button" class="pump-outline" data-v3-reset="1">Reset</button><button type="submit" class="pump-gold">Apply</button></div></form></div>';
}
function toolbar(ctx,rows){
 const f=ctx.user.v3Filter||DEFAULT_FILTER;
 const tabs=[['all','All'],['two-sided','Active 24h'],['hourly','Active 1h']].map(([key,label])=>'<button class="'+(f.activity===key?'active':'')+'" data-v3-activity="'+key+'">'+label+'</button>').join('');
 return '<div class="pump-toolbar"><strong>'+fmt(rows.length)+' items</strong><button class="pump-outline" data-v3-filter="1">☷ Filters</button></div>'+
 '<div class="pump-quick-presets">'+tabs+'</div>'+
 '<p class="pump-caption">Prices: latest completed trades · GP/item after GE tax · 24h is traded units, not available order depth. Even 1-GP margins are shown.</p>';
}
export function home(ctx){return flips(ctx);}
export function markets(ctx){
 const all=ctx.rows||[],cat=ctx.user.v3Category,info=CATEGORIES.find(c=>c.id===cat);
 if(info){
  const selected=applyFilters(categoryRows(all,cat),{...ctx.user.v3Filter,search:''});
  return '<div class="pump-back"><button data-v3-back="1">← All Markets</button></div>'+
   title(info.icon+' '+info.label,info.detail)+toolbar(ctx,selected)+
   '<div class="pump-list">'+list(selected,ctx,ctx.user.v3Limit||10)+'</div>'+
   (selected.length>(ctx.user.v3Limit||10)?'<button class="pump-more" data-v3-more="1">Load 10 more · '+(selected.length-(ctx.user.v3Limit||10))+' remaining</button>':'')+
   filterSheet(ctx);
 }
 let html=title('Explore Hardcore Markets','Simple categories with no invisible exclusions');
 let group='';
 for(const c of CATEGORIES){if(c.group!==group){if(group)html+='</div></section>';group=c.group;html+='<section class="pump-category-group"><h3>'+esc(group)+'</h3><div class="pump-category-grid">';}
 const count=categoryRows(all,c.id).length;
 html+='<button class="pump-category-tile pump-border-'+c.tone+'" data-v3-cat="'+c.id+'"><span class="pump-category-icon">'+c.icon+
 '</span><span class="pump-category-description"><strong>'+esc(c.label)+'</strong><small>'+esc(c.detail)+
 '</small></span><span class="pump-category-count">'+fmt(count)+' ›</span></button>';
 }
 return html+'</div></section><p class="pump-caveat">24h trading volume and latest prices use the Hardcore Worlds Wiki API.</p>';
}
export function flips(ctx){
 const rows=ctx.rows||[],filter=ctx.user.v3Filter||DEFAULT_FILTER,selected=applyFilters(rows,filter);
 return title('Hardcore Flip Finder','All items with observed high and low prices. Ranked by ROI, volume and budget-sized potential.')+
 '<div class="pump-searchbar"><span>⌕</span><input id="pumpFlipSearch" placeholder="Search item name (e.g., Mind rune)" value="'+esc(filter.search||'')+'" autocomplete="off"><button id="pumpFlipFind">Search</button></div>'+
 toolbar(ctx,selected)+'<div class="pump-list">'+list(selected,ctx,ctx.user.v3Limit||10)+'</div>'+
 (selected.length>(ctx.user.v3Limit||10)?'<button class="pump-more" data-v3-more="1">Load 10 more · '+(selected.length-(ctx.user.v3Limit||10))+' remaining</button>':'')+
 filterSheet(ctx);
}
export function init(ctx){
 if(window.__pumpV03Ready)return;window.__pumpV03Ready=true;
 const reload=()=>{ctx.save();ctx.renderPage();};
 document.addEventListener('click',e=>{
  const el=e.target.closest('[data-v3-cat],[data-v3-back],[data-v3-filter],[data-v3-close],[data-v3-reset],[data-v3-more],[data-v3-activity],[data-v3-preset]');
  if(!el){if(e.target.id==='pumpFlipFind'||e.target.id==='pumpTopGo')search();return;}
  if(el.dataset.v3Cat){ctx.user.v3Category=el.dataset.v3Cat;ctx.user.v3Filter={...DEFAULT_FILTER};ctx.user.v3Limit=10;ctx.save();ctx.nav('markets');return;}
  if(el.dataset.v3Back){ctx.user.v3Category=null;ctx.save();ctx.nav('markets');return;}
  if(el.dataset.v3Filter){const panel=$('#pumpFilterSheet');if(panel){panel.hidden=false;document.body.classList.add('pump-sheet-open');}return;}
  if(el.dataset.v3Close){const panel=$('#pumpFilterSheet');if(panel)panel.hidden=true;document.body.classList.remove('pump-sheet-open');return;}
  if(el.dataset.v3Reset){ctx.user.v3Filter={...DEFAULT_FILTER};ctx.user.v3Limit=10;reload();return;}
  if(el.dataset.v3More){ctx.user.v3Limit=(ctx.user.v3Limit||10)+10;reload();return;}
  if(el.dataset.v3Activity){ctx.user.v3Filter={...ctx.user.v3Filter,activity:el.dataset.v3Activity};ctx.user.v3Limit=10;reload();return;}
  if(el.dataset.v3Preset){ctx.user.v3Filter={...PRESETS[el.dataset.v3Preset],search:ctx.user.v3Filter?.search||''};ctx.user.v3Limit=10;reload();}
 });
 document.addEventListener('submit',e=>{
  if(e.target.id!=='pumpFilterForm')return;
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const f={...DEFAULT_FILTER,...ctx.user.v3Filter,...data};
  for(const key of numeric)f[key]=parseGp(data[key]);
  f.profitable=!!e.target.querySelector('[name=profitable]').checked;
  const error=validate(f);if(error){ctx.toast(error);return;}
  ctx.user.v3Filter=f;ctx.user.v3Limit=10;document.body.classList.remove('pump-sheet-open');reload();
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const x=$('#pumpFilterSheet');if(x&&!x.hidden){x.hidden=true;document.body.classList.remove('pump-sheet-open');}}
  if(e.key==='Enter'&&(e.target.id==='pumpFlipSearch'||e.target.id==='pumpTopSearch')){e.preventDefault();search();}
 });
 function search(){
  const el=$('#pumpFlipSearch')||$('#pumpTopSearch');if(!el)return;
  ctx.user.v3Filter={...ctx.user.v3Filter,search:el.value.trim(),activity:'all'};
  ctx.user.v3Limit=10;ctx.save();ctx.nav('flips');
 }
}
