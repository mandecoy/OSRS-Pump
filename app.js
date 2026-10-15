import {gp,compact,pct,flip,geTax,mapMarket,filterMarket,analyzeHistory,journalMetrics,highAlchProfit,volumeOf} from './logic.js';
import * as V03 from './v03.js';
import {historical24h} from './logic.js';
import {sizingCard,watchCard,alertValue,alertDisplay,ALERT_METRICS} from './market-intel.js';
import * as HISTORY from './history-chart.js';
import * as DASH from './dashboard.js';
import * as PROC from './processing.js';
const $=selector=>document.querySelector(selector);
const names={dashboard:'Market Overview',markets:'Explore Markets',flips:'Advanced Flip Finder',intel:'Item Intelligence',portfolio:'Trade Portfolio',watchlist:'Watchlist & Alerts',money:'Money-Making Methods',settings:'Settings & Sources'};
const KEY='osrs-pump-v1';
const makeId=()=>globalThis.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const defaults={page:'dashboard',watchlist:[],alerts:[],trades:[],selected:4151,historyStep:'1h',historyWindow:'day',filter:{sort:'score',profitable:true,minScore:50},v3Filter:{...V03.DEFAULT_FILTER},v3Category:null,v3Limit:10,v3FilterRevision:2,alchLimit:10,process:{input:1000,output:1500,inputQty:1,outputQty:1,actionsPerHour:300},tradingGp:1000000,watchLimit:10,homeWidgets:DASH.normalizedOrder(),homeHidden:[],homeRank:'net',homeLoad:5,homeCalcId:null,homeCustomize:false,processKind:'all',processSort:'net',processProfitable:false,processMinProfit:null,processRate:1200,processLimit:10};
function loadLocal(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return {...defaults,...x,filter:{...defaults.filter,...x.filter},v3Filter:x.v3FilterRevision===2?{...V03.DEFAULT_FILTER,...x.v3Filter}:{...V03.DEFAULT_FILTER},v3Limit:10,v3FilterRevision:2};}catch{return {...defaults};}}
const user=loadLocal();
const state={mapping:[],latest:{},h:{},five:{},day:{},market:[],byId:{},history:[],historyId:null,historyStep:null,busy:false,error:null,loadedAt:0,alchRows:[],watchHistory:{},historyLoading:new Set(),recipes:[]};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metric=(label,value,foot='',cls='')=>`<div class="card"><div class="stat-label">${esc(label)}</div><div class="stat-number ${cls}">${esc(value)}</div><div class="stat-foot">${esc(foot)}</div></div>`;
const head=(eyebrow,title,description,action='')=>`<div class="heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2><p>${esc(description)}</p></div>${action}</div>`;
const notice=s=>`<div class="info-bar">${s}</div>`;
const empty=(t,d)=>`<div class="emptystate"><strong>${t}</strong>${d}</div>`;
const field=(label,name,value='',placeholder='',type='number')=>`<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><input id="f-${esc(name)}" name="${esc(name)}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${type==='number'?'min="0"':''}></div>`;
const titleLink=(id)=>`<a target="_blank" rel="noopener" href="https://prices.runescape.wiki/osrs/item/${id}">Wiki item prices ↗</a>`;
function save(){localStorage.setItem(KEY,JSON.stringify({page:user.page,watchlist:user.watchlist,alerts:user.alerts,trades:user.trades,selected:user.selected,historyStep:user.historyStep,historyWindow:user.historyWindow,filter:user.filter,v3Filter:user.v3Filter,v3Category:user.v3Category,v3Limit:user.v3Limit,v3FilterRevision:user.v3FilterRevision,alchLimit:user.alchLimit,process:user.process,tradingGp:user.tradingGp,watchLimit:user.watchLimit,homeWidgets:user.homeWidgets,homeHidden:user.homeHidden,homeRank:user.homeRank,homeLoad:user.homeLoad,homeCalcId:user.homeCalcId,processKind:user.processKind,processSort:user.processSort,processProfitable:user.processProfitable,processMinProfit:user.processMinProfit,processRate:user.processRate,processLimit:user.processLimit}));}
let toastTimer;
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4000);}
function item(id){return state.byId[Number(id)];}
function lookup(id){return state.mapping.find(x=>Number(x.id)===Number(id));}
// The Android WebView contains one HTML document. Internal screens need their own back stack.
let displayedRoute=null;
const routeStack=[];
const sameRoute=(a,b)=>!!a&&!!b&&a.page===b.page&&a.category===b.category&&a.selected===b.selected;
function nav(page,record=true){
 if(!names[page])return;
 const next={page,category:page==='markets'?(user.v3Category||null):null,selected:user.selected,scrollY:0};
 if(record&&displayedRoute&&!sameRoute(displayedRoute,next)){
   routeStack.push({...displayedRoute,scrollY:window.scrollY||0});
   if(routeStack.length>80)routeStack.shift();
 }
 user.page=page;save();
 for(const el of document.querySelectorAll('.page'))el.hidden=el.id!==page+'Page';
 for(const b of document.querySelectorAll('[data-page]'))b.classList.toggle('active',b.dataset.page===page);
 $('#pageTitle').textContent=names[page];
 displayedRoute=next;
 const back=$('#pumpBack');if(back)back.hidden=routeStack.length===0&&page==='dashboard';
 if(record)window.scrollTo({top:0,behavior:'auto'});
 renderPage();
}
function goBack(){
 const filter=$('#pumpFilterSheet');
 if(filter&&!filter.hidden){filter.hidden=true;document.body.classList.remove('pump-sheet-open');return true;}
 if(user.homeCustomize&&user.page==='dashboard'){user.homeCustomize=false;renderPage();return true;}
 const previous=routeStack.pop();
 if(previous){
  user.selected=previous.selected;
  user.v3Category=previous.category;
  nav(previous.page,false);
  requestAnimationFrame(()=>window.scrollTo({top:previous.scrollY||0,behavior:'auto'}));
  return true;
 }
 if(user.page!=='dashboard'){user.v3Category=null;nav('dashboard',false);return true;}
 return false;
}
window.OSRSPumpNavigateBack=goBack;
function v3ctx(){return {rows:state.market,alchRows:state.alchRows,recipes:state.recipes,mapping:state.mapping,latest:state.latest,day:state.day,user,nav,save,toast,renderPage};}
function renderPage(){switch(user.page){case 'dashboard':$('#dashboardPage').innerHTML=DASH.home(v3ctx());return;case 'markets':$('#marketsPage').innerHTML=V03.markets(v3ctx());return;case 'flips':$('#flipsPage').innerHTML=V03.flips(v3ctx());return;case 'intel':return renderIntel();case 'portfolio':return renderPortfolio();case 'watchlist':renderWatchlist();void ensureWatchHistory();return;case 'money':return renderMoney();case 'settings':return renderSettings();}}
function status(){const date=state.loadedAt?new Date(state.loadedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Not synced';$('#lastSync').textContent=state.busy?'Syncing Wiki data…':date;$('#refresh').disabled=state.busy;}
async function fetchJson(path){const res=await fetch('/api/'+path,{cache:'no-store'});const data=await res.json().catch(()=>({error:'Non-JSON response'}));if(!res.ok)throw new Error(data.detail||data.error||`HTTP ${res.status}`);return data;}
async function loadMarket(){if(state.busy)return;state.busy=true;state.error=null;status();renderPage();try{
 const [mapping,latest,h,five,day]=await Promise.all([fetchJson('mapping'),fetchJson('latest'),fetchJson('1h'),fetchJson('5m'),fetchJson('24h').catch(()=>({data:{}}))]);
 state.mapping=mapping;state.latest=latest;state.h=h;state.five=five;state.day=day;state.market=V03.decorate(mapMarket(mapping,latest,h,five),h,five,day);
 state.byId=Object.fromEntries(state.market.map(x=>[x.id,x]));state.alchRows=V03.alchemyRows(mapping,latest,h,five,day);state.recipes=PROC.evaluateRecipes(mapping,latest,day);state.loadedAt=Date.now();evaluateAlerts();if(user.alerts.some(a=>a.metric==='change24'))void ensureWatchHistory();
 }catch(e){state.error=e.message;toast('Market feed error: '+e.message);}finally{state.busy=false;status();renderPage();}}
function stamp(age){if(!Number.isFinite(age))return 'Unknown';if(age<60)return Math.round(age)+'m ago';if(age<1440)return Math.round(age/60)+'h ago';return Math.round(age/1440)+'d ago';}
function rowsTable(rows,limit=30){if(!rows.length)return empty('No matching items','Try resetting filters or refreshing the public market feed.');return `<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Buy target</th><th>Sell target</th><th>Tax</th><th>Net / ea</th><th>ROI</th><th>1h volume</th><th>Freshness</th><th>Risk</th><th>★</th></tr></thead><tbody>${rows.slice(0,limit).map(x=>{const watched=user.watchlist.includes(x.id);return `<tr data-open="${x.id}"><td class="name">${esc(x.name)}<div class="sub">${esc(x.category)} · Limit ${esc(x.limit??'unknown')}</div></td><td>${compact(x.buy)}</td><td>${compact(x.sell)}</td><td>${compact(x.tax)}</td><td class="${x.net>0?'positive':'negative'}">${compact(x.net)}</td><td class="${x.roi>0?'positive':'negative'}">${pct(x.roi)}</td><td>${compact(x.v1)}</td><td>${stamp(x.age)}</td><td><span class="tag ${x.score>=70?'good':x.score>=45?'warn':'bad'}">${x.score}/100</span></td><td><button class="star ${watched?'on':''}" data-watch="${x.id}" aria-label="${watched?'Remove from':'Add to'} watchlist">${watched?'★':'☆'}</button></td></tr>`;}).join('')}</tbody></table></div><div class="footer-note">Showing ${Math.min(limit,rows.length).toLocaleString()} of ${rows.length.toLocaleString()} results. Buy and sell targets are <strong>recent transaction observations, not guaranteed fill prices</strong>.</div>`;}
function loading(){return state.error?notice(`<strong>Market API unavailable:</strong> ${esc(state.error)}. Check your connection and try refresh.`):empty('Loading the public OSRS market','Prices are fetched from the OSRS Wiki via the local development proxy.');}
function renderDashboard(){const all=state.market,valid=all.filter(x=>x.net>0&&x.age<120&&x.v1>0),top=[...valid].sort((a,b)=>b.score-a.score||b.net-a.net).slice(0,10),watched=user.watchlist.map(item).filter(Boolean);const m=journalMetrics(user.trades,state.byId);
 $('#dashboardPage').innerHTML=head('OSRS Pump / Market command center','Your Grand Exchange edge','Live public prices, tax-aware flips, and market health — no subscription.')+
 `<div class="stats">${metric('Market items',all.length.toLocaleString(),'Tracked with valid high & low')}${metric('Positive margins',valid.length.toLocaleString(),'Recent trades · positive net')}${metric('Open positions',m.open.toString(),`${compact(m.locked)} gp invested`)}${metric('Realized profit',compact(m.realized)+' gp','Manual trade journal',m.realized>=0?'positive':'negative')}</div>`+
 `${notice('<strong>How pricing works:</strong> OSRS Wiki “low” is the latest instant-sell price (a possible patient buy target). “High” is the latest instant-buy price (a possible patient sell target). Fills, bid depth and actual future profit are not guaranteed. Tax is included.')}`+
 `<div class="split"><div class="card"><div class="section-heading"><h3>High-confidence flip candidates</h3><button class="button-link" data-go="flips">Advanced filters →</button></div>${all.length?rowsTable(top,10):loading()}</div><div class="card"><div class="section-heading"><h3>Watching</h3><button class="button-link" data-go="watchlist">All watchlists →</button></div>${watched.length?watched.slice(0,12).map(x=>`<div class="item-row"><div><strong>${esc(x.name)}</strong><small>${gp(x.net)} est. net · ${pct(x.roi)} ROI</small></div><button class="action secondary minor" data-open="${x.id}">Analyze</button></div>`).join(''):empty('No watched items','Star any market item to monitor it here.')}</div></div>`;
}
function filterFields(){const f=user.filter,val=(key)=>f[key]??'';return `<div class="grid-controls">${field('Search item','search',val('search'),'Item name','text')}${field('Min buy price (gp)','minPrice',val('minPrice'),'0')}${field('Max buy price (gp)','maxPrice',val('maxPrice'),'Unlimited')}${field('Min 1h volume','minVolume',val('minVolume'),'0')}${field('Max 1h volume','maxVolume',val('maxVolume'),'Unlimited')}${field('Min net profit (gp)','minProfit',val('minProfit'),'0')}${field('Max net profit (gp)','maxProfit',val('maxProfit'),'Unlimited')}${field('Min ROI (%)','minRoi',val('minRoi'),'0')}${field('Max ROI (%)','maxRoi',val('maxRoi'),'Unlimited')}${field('Max trade age (min)','maxAge',val('maxAge'),'Unlimited')}${field('Min quality score','minScore',val('minScore'),'0')}${field('Available capital (gp)','budget',val('budget'),'Any')}<div class="field"><label for="f-category">Category</label><select id="f-category" name="category">${['all','Potions','Runes & teleports','Resources','Equipment','Supplies','Other'].map(n=>`<option ${val('category')===n?'selected':''} value="${esc(n)}">${n==='all'?'All categories':n}</option>`).join('')}</select></div><div class="field"><label for="f-members">Membership</label><select id="f-members" name="members"><option value="all">All items</option><option value="members" ${val('members')==='members'?'selected':''}>Members only</option><option value="f2p" ${val('members')==='f2p'?'selected':''}>Free-to-play</option></select></div><div class="field"><label for="f-sort">Rank by</label><select id="f-sort" name="sort">${[['score','Confidence score'],['net','Net profit / item'],['roi','ROI'],['v1','Hourly volume'],['buy','Buy price']].map(([k,v])=>`<option value="${k}" ${val('sort')===k?'selected':''}>${v}</option>`).join('')}</select></div></div>`;}
function currentFilters(){const out={...user.filter};for(const k of ['minPrice','maxPrice','minVolume','maxVolume','minProfit','maxProfit','minRoi','maxRoi','maxAge','minScore','budget'])out[k]=out[k]===''||out[k]==null?null:Math.max(0,Number(out[k])||0);return out;}
function renderFlipTable(){const rows=filterMarket(state.market,currentFilters());$('#flipSummary').textContent=`${rows.length.toLocaleString()} matching opportunities · ${state.market.length.toLocaleString()} priced items`;$('#flipTable').innerHTML=state.market.length?rowsTable(rows,100):loading();}
function renderFlips(){const f=user.filter;$('#flipsPage').innerHTML=head('OSRS Pump / Screener','Advanced Flip Finder','Filter every publicly priced item by cost, liquidity, profit, ROI, freshness and risk.')+
 `<div class="card filters"><div class="filter-header"><h3>Market filters</h3><button class="button-link" id="resetFilters">Reset all</button></div>${filterFields()}<div class="filter-footer"><label class="check"><input id="f-profitable" name="profitable" type="checkbox" ${f.profitable?'checked':''}> Show positive net margins only</label><div class="pills"><button class="pill" data-preset="safe">Liquid</button><button class="pill" data-preset="budget">Budget</button><button class="pill" data-preset="high">High ROI</button></div></div></div><div class="card"><div class="section-heading"><h3 id="flipSummary">Loading…</h3><span class="tag">Tax-adjusted</span></div><div id="flipTable"></div></div>`;
 for(const input of document.querySelectorAll('#flipsPage [name]'))input.addEventListener(input.tagName==='INPUT'?'input':'change',()=>{user.filter[input.name]=input.type==='checkbox'?input.checked:input.value;save();renderFlipTable();});
 $('#resetFilters').addEventListener('click',()=>{user.filter={sort:'score',profitable:true,minScore:50};save();renderFlips();});
 renderFlipTable();}
function selectItem(id){const m=lookup(id);if(!m){toast('Item not found in current market feed');return;}user.selected=Number(id);save();state.historyId=null;state.history=[];nav('intel');loadHistory();}
async function loadHistory(){
 const id=Number(user.selected),range=HISTORY.WINDOWS[user.historyWindow]?user.historyWindow:'day';
 if(!id||!state.mapping.length)return;
 const step=HISTORY.WINDOWS[range].step;
 state.historyId=id;state.historyStep=step;state.historyWindow=range;state.history=[];renderIntel();
 try{
  const d=await fetchJson('timeseries?id='+id+'&step='+step);
  if(state.historyId===id&&state.historyWindow===range){
   state.history=Array.isArray(d.data)?d.data:[];renderIntel();
  }
 }catch(e){toast('Price history unavailable: '+e.message);renderIntel();}
}
function plotHistory(points,range){
 return HISTORY.renderHistoryChart(points,range);
}
function renderIntel(){
 const m=lookup(user.selected),x=item(user.selected);
 if(!m){
  $('#intelPage').innerHTML=head('OSRS Pump / Deep dive','Item Intelligence','Select an item from Markets or the Flip Finder to review its history.')+(state.market.length?empty('Choose a market item','Select an item to inspect its history.'):loading());
  return;
 }
 const range=HISTORY.WINDOWS[user.historyWindow]?user.historyWindow:'day';
 const config=HISTORY.WINDOWS[range];
 const source=state.historyId===Number(m.id)&&state.historyWindow===range?state.history:[];
 const samples=HISTORY.selectWindow(source,range);
 const summary=analyzeHistory(samples,m.name),current=x?flip(x.buy,x.sell,x.name):null;
 const icon=m.icon?'https://oldschool.runescape.wiki/images/'+encodeURIComponent(String(m.icon).replace(/ /g,'_')):'';
 const iconTag=icon?'<img src="'+esc(icon)+'" loading="lazy" alt="'+esc(m.name)+' icon" onerror="this.style.display=\'none\'">':'◆';
 const wiki='https://prices.runescape.wiki/osrs/item/'+encodeURIComponent(m.id);
 const buttons='<div class="pump-detail-actions"><a class="action secondary pump-wiki-button" href="'+wiki+'" target="_blank" rel="noopener noreferrer">↗ OSRS Wiki Prices</a><button class="action secondary" id="intelWatch">'+(user.watchlist.includes(m.id)?'★ Watching':'☆ Watch')+'</button></div>';
 const header='<div class="pump-detail-item"><div class="pump-detail-icon">'+iconTag+'</div><div class="pump-detail-names"><small>GRAND EXCHANGE ITEM</small><h2>'+esc(m.name)+'</h2><span>Item #'+Number(m.id)+' · '+(m.members?'Members':'Free-to-play')+'</span></div></div>';
 const ranges=Object.entries(HISTORY.WINDOWS).map(([key,v])=>'<button type="button" class="'+(range===key?'active':'')+'" data-chart-window="'+key+'" aria-pressed="'+(range===key?'true':'false')+'">'+v.label+'</button>').join('');
 const chart=source.length?plotHistory(samples,range):empty('Loading price history','Loading publicly sourced history for this item and interval.');
 const section='<div class="card pump-history-card"><div class="pump-history-head"><div><h3>Price history</h3><p>GP per item · '+config.title+' window · '+config.step+' average buckets</p></div></div><div class="pump-history-tabs">'+ranges+'</div>'+chart+'</div>';
 const unavailable='—';
 const stats=x?'<div class="stats">'+
  metric('Observed buy target',gp(x.buy),'Recent instant sell')+
  metric('Observed sell target',gp(x.sell),'Recent instant buy')+
  metric('Net flip / item',gp(x.net),'After GE sale tax',x.net>=0?'positive':'negative')+
  metric('24h traded volume',x.dayVol==null?'—':compact(x.dayVol),'Completed units · Activity '+stamp(x.age))+
 '</div>':notice('Latest completed high/low prices unavailable; historical points may still be available.');
 const intervalMetrics='<div class="analysis-grid pump-range-metrics">'+
  metric(config.title+' sampled low',summary.low24!=null?gp(summary.low24):unavailable,'Lowest interval average')+
  metric(config.title+' sampled high',summary.high24!=null?gp(summary.high24):unavailable,'Highest interval average')+
  metric('Sampled units',summary.samples?compact(summary.volume):unavailable,'From available bucket data')+
  metric('Samples',String(samples.length),config.step+' buckets in selected window')+'</div>';
 const analysis='<div class="split" style="margin-top:16px"><div class="card"><div class="section-heading"><h3>Execution profile</h3></div>'+
  '<div class="item-row"><strong>GE buy limit / 4h</strong><strong>'+esc(m.limit??'Not listed')+'</strong></div>'+
  '<div class="item-row"><strong>Last observed transaction age</strong><strong>'+(x?stamp(x.age):unavailable)+'</strong></div>'+
  '<div class="item-row"><strong>GE sale tax / item</strong><strong>'+(current?gp(current.tax):unavailable)+'</strong></div>'+
  '<div class="item-row"><strong>Quality heuristic</strong><strong>'+(x?x.score+'/100':unavailable)+'</strong></div>'+
  '<p class="smallnote">Price ranges represent interval averages, not individual trade extremes. Wiki history has no standing order-book depth. 24h traded-unit volume is sourced from the OSRS Wiki aggregate, not Jagex's 7-day Most Traded ranking. <a href="https://secure.runescape.com/m=itemdb_oldschool/top100?list=0" target="_blank" rel="noopener noreferrer">Jagex official Most Traded (7 days) ↗</a></p></div>'+
  '<div class="card"><div class="section-heading"><h3>Trade action</h3></div><p class="smallnote">Log actual fill prices to calculate realized profits.</p><button class="action" id="newTrade">+ Record a flip</button>'+
  '<div class="divider-x"></div><p class="smallnote">'+esc(m.examine||'Details supplied by the public OSRS Wiki mapping.')+'</p></div></div>';
 $('#intelPage').innerHTML=head('OSRS Pump / Item Intelligence','Item market analysis','Public trade history and price/volume inspection.',buttons)+header+stats+section+intervalMetrics+(x?sizingCard(x,user.tradingGp):'')+analysis;
 const sizeForm=$('#sizerForm');if(sizeForm)sizeForm.addEventListener('submit',e=>{e.preventDefault();const amount=Number(new FormData(sizeForm).get('available'));if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(Math.floor(amount))){toast('Enter a valid GP amount');return;}user.tradingGp=Math.floor(amount);save();renderIntel();});
  $('#intelWatch').addEventListener('click',()=>{toggleWatch(m.id);renderIntel();});
 $('#newTrade').addEventListener('click',()=>nav('portfolio'));
 for(const b of document.querySelectorAll('#intelPage [data-chart-window]')){
  b.addEventListener('click',()=>{if(user.historyWindow===b.dataset.chartWindow)return;user.historyWindow=b.dataset.chartWindow;save();loadHistory();});
 }
 HISTORY.bindHistoryChart(samples,range);
}
function resolveItemName(value){
 const name=String(value??'').trim();if(!name)return null;
 if(/^\d+$/.test(name))return lookup(Number(name));
 return state.mapping.find(x=>x.name.toLowerCase()===name.toLowerCase())||null;
}
function namePicker(id){
 const current=lookup(user.selected)?.name||'';
 return '<div class="field"><label for="f-'+id+'">Item name</label><input id="f-'+id+'" type="search" name="itemName" list="'+id+'Choices" autocomplete="off" placeholder="Search items by name" value="'+esc(current)+'"><datalist id="'+id+'Choices"></datalist></div>';
}
function wireNamePicker(id){
 const input=$('#f-'+id),list=$('#'+id+'Choices');if(!input||!list)return;
 const fill=()=>{
  const q=input.value.toLowerCase().trim();
  const matches=(q?state.mapping.filter(x=>x.name.toLowerCase().includes(q)):user.watchlist.map(lookup).filter(Boolean))
   .slice(0,40);
  list.replaceChildren(...matches.map(x=>{const el=document.createElement('option');el.value=x.name;el.label='Item '+x.id;return el;}));
 };
 input.addEventListener('input',fill);input.addEventListener('focus',fill);fill();
}
function renderPortfolio(){const m=journalMetrics(user.trades,state.byId),selected=lookup(user.selected),rows=user.trades.slice().reverse();$('#portfolioPage').innerHTML=head('OSRS Pump / Your trades','Portfolio & Trade Journal','Record real buys, partial sales, and finished flips. All entries stay on this device.')+
 `<div class="stats">${metric('Realized P/L',gp(m.realized),'After sale tax',m.realized>=0?'positive':'negative')}${metric('Unrealized estimate',gp(m.unrealized),'Market-priced open lots')}${metric('Open inventory',gp(m.locked),'Original cost basis')}${metric('Transactions',user.trades.length+'','Open positions: '+m.open)}</div>`+
 `<div class="card filters"><div class="section-heading"><h3>Record a purchase / sale</h3><span class="tag">Stored locally</span></div><form id="tradeForm"><div class="grid-controls">${namePicker('tradeItem')}${field('Quantity purchased','qty',1,'1')}${field('Executed buy price (gp)','buyPrice',item(user.selected)?.buy||'','Price each')}${field('Quantity already sold','soldQty',0,'0')}${field('Executed sell price (gp)','sellPrice',item(user.selected)?.sell||'','Price each')}<div class="field"><label for="f-notes">Notes</label><input id="f-notes" name="notes" maxlength="250" placeholder="Optional trade notes" type="text"></div></div><div class="filter-footer"><span class="smallnote">Search for items by name; enter actual GE fills, not suggested targets.</span><button type="submit" class="action">Save trade</button></div></form></div>`+
 `<div class="card"><div class="section-heading"><h3>Trade ledger</h3><span class="tag">${rows.length} entries</span></div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Item / notes</th><th>Qty</th><th>Sold</th><th>Buy each</th><th>Sell each</th><th>Realized</th><th></th></tr></thead><tbody>${rows.map(t=>{const p=(Number(t.soldQty)||0)*((Number(t.sellPrice)||0)-(Number(t.buyPrice)||0)-geTax(Number(t.sellPrice)||0,t.name));return `<tr><td class="name">${esc(t.name)}<div class="sub">${esc(t.notes||new Date(t.when).toLocaleDateString())}</div></td><td>${compact(t.qty)}</td><td>${compact(t.soldQty)}</td><td>${compact(t.buyPrice)}</td><td>${t.soldQty?compact(t.sellPrice):'—'}</td><td class="${p>=0?'positive':'negative'}">${gp(p)}</td><td><button class="button-link danger" data-delete-trade="${t.tradeId}">Delete</button></td></tr>`;}).join('')}</tbody></table></div>`:empty('No trades recorded','Open any item and choose Record a flip, or fill out the form above.')}</div>`;
 wireNamePicker('tradeItem');
 $('#tradeForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const found=resolveItemName(d.itemName),id=Number(found?.id),qty=Math.floor(Number(d.qty)),soldQty=Math.floor(Number(d.soldQty)),buyPrice=Math.floor(Number(d.buyPrice)),sellPrice=Math.floor(Number(d.sellPrice));if(!found||!(qty>0)||soldQty<0||soldQty>qty||!(buyPrice>0)||(soldQty>0&&!(sellPrice>0))){toast('Choose an item name, positive buy price and valid purchased/sold quantities.');return;}
 user.trades.push({tradeId:makeId(),id,name:found.name,qty,soldQty,buyPrice,sellPrice:soldQty?sellPrice:0,notes:String(d.notes||'').slice(0,250),when:Date.now()});save();toast('Trade saved on this device');renderPortfolio();});}
function toggleWatch(id){id=Number(id);const at=user.watchlist.indexOf(id);if(at<0)user.watchlist.push(id);else user.watchlist.splice(at,1);save();toast(at<0?'Item added to watchlist':'Item removed from watchlist');}

function evaluateAlerts(){
 let n=0,changed=false;
 for(const a of user.alerts){
  const value=alertValue(a,item(a.itemId),state.watchHistory[a.itemId]);
  if(value===null||!Number.isFinite(value))continue;
  const hit=a.rule==='above'?value>=Number(a.target):value<=Number(a.target);
  if(hit&&!a.triggered){
   a.triggered=true;changed=true;n++;
   if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    try{new Notification('OSRS Pump market alert',{body:(item(a.itemId)?.name||'Item')+': '+alertDisplay(a)});}catch{}
   }
  }else if(!hit&&a.triggered){a.triggered=false;changed=true;}
 }
 if(changed)save();
 if(n)toast(n+' market alert'+(n===1?'':'s')+' triggered');
}
async function ensureWatchHistory(){
 if(!state.mapping.length)return;
 const seen=user.page==='watchlist'?user.watchlist.slice(0,user.watchLimit||10):[];
 const alerts=user.alerts.filter(a=>a.metric==='change24').map(a=>Number(a.itemId));
 const ids=[...new Set([...seen,...alerts].map(Number).filter(Number.isSafeInteger))];
 const needed=ids.filter(id=>!state.historyLoading.has(id)&&(!state.watchHistory[id]||Date.now()-state.watchHistory[id].when>10*60_000));
 for(let i=0;i<needed.length;i+=3){
  await Promise.all(needed.slice(i,i+3).map(async id=>{
   if(state.historyLoading.has(id))return;
   state.historyLoading.add(id);
   try{
    const result=await fetchJson('timeseries?id='+id+'&step=5m');
    state.watchHistory[id]={summary:historical24h(result.data),when:Date.now()};
   }catch(error){
    state.watchHistory[id]={summary:null,error:String(error.message||error),when:Date.now()};
   }finally{state.historyLoading.delete(id);}
  }));
  if(user.page==='watchlist')renderWatchlist();
  evaluateAlerts();
 }
}
function renderWatchlist(){
 const watched=user.watchlist.slice(0,user.watchLimit||10).map(id=>item(id)||lookup(id)).filter(Boolean);
 const alertRows=user.alerts.map(a=>({...a,m:lookup(a.itemId)}));
 const options=Object.entries(ALERT_METRICS).map(([id,label])=>'<option value="'+id+'">'+esc(label)+'</option>').join('');
 $('#watchlistPage').innerHTML=head('OSRS Pump / Signals','Watchlist & Market Alerts','Follow 24h price ranges, trade volume, potential profit and configurable alerts.')+
 notice('<strong>Foreground alerts:</strong> signals are checked on price refresh while the app runs. Browser notifications need your permission; reliable Android background pushes require a native service. Historical percentage changes are sampled midpoint changes, not guaranteed returns.')+
 '<div class="card" style="margin-bottom:16px"><div class="section-heading"><h3>Your GP for potential flips</h3></div>'+
 '<form id="watchBudgetForm" class="form-inline"><div class="field"><label for="watchBudgetGp">Available GP</label><input id="watchBudgetGp" type="number" name="available" inputmode="numeric" step="1" min="0" value="'+esc(Math.floor(user.tradingGp??1000000))+'"></div>'+
 '<button type="submit" class="action">Update estimates</button></form></div>'+
 '<div class="alert-grid"><div class="card"><div class="section-heading"><h3>My watched items</h3><span class="tag">'+user.watchlist.length+'</span></div>'+
 (watched.length?watched.map(x=>watchCard(x,state.watchHistory[x.id],user.tradingGp)).join(''):empty('Your watchlist is empty','Star an item in Markets or the Flip Finder.'))+
 (user.watchlist.length>(user.watchLimit||10)?'<button class="pump-more" id="watchMore">Load 10 more ('+(user.watchlist.length-(user.watchLimit||10))+' remaining)</button>':'')+
 '</div><div class="card"><div class="section-heading"><h3>Custom market alert</h3></div>'+
 '<form id="alertForm"><div class="grid-controls" style="grid-template-columns:1fr 1fr">'+namePicker('alertItem')+
 '<div class="field"><label for="alertMetric">Track metric</label><select id="alertMetric" name="metric">'+options+'</select></div>'+
 '<div class="field"><label for="f-rule">Trigger when</label><select id="f-rule" name="rule"><option value="below">At or below</option><option value="above">At or above</option></select></div>'+
 '<div class="field"><label for="alertTarget">Threshold (GP, units or %)</label><input id="alertTarget" type="number" step="any" name="target" placeholder="Alert value" required></div>'+
 '</div><div class="filter-footer"><span class="smallnote">Prices, after-tax margin, 24h volume or sampled 24h change. No automatic trades.</span><button type="submit" class="action">Save alert</button></div></form>'+
 '<div class="gap8" style="margin-top:11px"><button type="button" id="enablePumpNotifications" class="action secondary minor">Enable notifications</button></div>'+
 '<div class="divider-x"></div><div class="section-heading"><h3>Saved alerts</h3><span class="tag">'+alertRows.length+'</span></div>'+
 (alertRows.length?alertRows.map(a=>'<div class="item-row"><div><strong>'+esc(a.m?.name||'Unknown item')+'</strong><small>'+esc(alertDisplay(a))+' · '+(a.triggered?'Triggered':'Armed')+'</small></div>'+
 '<button class="button-link danger" data-delete-alert="'+esc(a.alertId)+'">Delete</button></div>').join(''):empty('No active alerts','Choose an item and add a threshold above.'))+
 '</div></div>';
 wireNamePicker('alertItem');
 $('#watchBudgetForm').addEventListener('submit',e=>{
  e.preventDefault();const amount=Number(new FormData(e.currentTarget).get('available'));
  if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(Math.floor(amount))){toast('Enter a valid GP budget');return;}
  user.tradingGp=Math.floor(amount);save();renderWatchlist();
 });
 $('#alertForm').addEventListener('submit',e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));
  const found=resolveItemName(d.itemName),id=Number(found?.id),target=Number(d.target);
  const valid=(d.metric==='change24'||d.metric==='net')?Number.isFinite(target):Number.isFinite(target)&&target>0;
  if(!found||!Object.hasOwn(ALERT_METRICS,d.metric)||!valid){toast('Choose an item, metric and valid threshold');return;}
  user.alerts.push({alertId:makeId(),itemId:id,metric:d.metric,rule:d.rule==='above'?'above':'below',target,triggered:false});
  save();renderWatchlist();void ensureWatchHistory();evaluateAlerts();toast('Market alert saved');
 });
 $('#enablePumpNotifications').addEventListener('click',async()=>{
  if(typeof Notification==='undefined'||!Notification.requestPermission){toast('Notifications unsupported in this environment');return;}
  try{const permission=await Notification.requestPermission();toast(permission==='granted'?'Notifications enabled':'Permission: '+permission);}catch{toast('Notification permission unavailable');}
 });
 const more=$('#watchMore');
 if(more)more.addEventListener('click',()=>{user.watchLimit=(user.watchLimit||10)+10;save();renderWatchlist();void ensureWatchHistory();});
}
function renderMoney(){const natureId=state.mapping.find(x=>x.name.toLowerCase()==='nature rune')?.id,nature=Number((state.latest?.data||state.latest||{})[natureId]?.high)||0;
 const alch=state.alchRows,visible=alch.slice(0,user.alchLimit||10);
 const p=user.process,profit=(Number(p.output)||0)*(Number(p.outputQty)||0)*(1-.02)-(Number(p.input)||0)*(Number(p.inputQty)||0),perHour=profit*(Number(p.actionsPerHour)||0);
 $('#moneyPage').innerHTML=head('OSRS Pump / Research','Money-Making Lab','Explore public Wiki Herblore recipes and high-alchemy opportunities.')+PROC.renderProcessing(v3ctx())+
 `<div class="split"><div class="card"><div class="section-heading"><h3>High Alchemy screener</h3><span class="tag">Nature rune: ${nature?gp(nature):'N/A'}</span></div><p class="smallnote kicker">Estimated result = high alch value − instant-buy price − nature rune instant-buy price. Excludes time, staff requirements, alchemy costs besides runes, and buy limits.</p>${!state.market.length?loading():!nature?empty('Nature rune quote missing','The alchemy list requires current nature rune prices.'):alch.length?`<div class="scroll-y">${visible.map(x=>`<div class="item-row"><div><strong>${esc(x.name)}</strong><small>Buy ${gp(x.buy)} · Alch ${gp(x.highalch)} · Limit ${esc(x.limit??'—')}</small></div><div class="gap8"><strong class="positive">+${compact(x.net)} gp</strong><button class="action secondary minor" data-open="${x.id}">View</button></div></div>`).join('')}</div>${alch.length>visible.length?`<button class="pump-more" data-alch-more="1">Load 10 more · ${alch.length-visible.length} remaining</button>`:''}`:empty('No qualifying items','Current data has no positive items meeting minimum liquidity/freshness settings.')}</div><div class="card"><div class="section-heading"><h3>Processing / crafting calculator</h3></div><p class="smallnote kicker">Manual public-data calculator for methods such as cleaning herbs, processing supplies, tanning and combining ingredients. Verify yields using the OSRS Wiki.</p><div class="grid-controls" id="processInputs" style="grid-template-columns:1fr 1fr">${field('Input price per unit','input',p.input)}${field('Output sell price','output',p.output)}${field('Input units / action','inputQty',p.inputQty)}${field('Output units / action','outputQty',p.outputQty)}${field('Actions / hour','actionsPerHour',p.actionsPerHour)}</div><div class="divider-x"></div><div class="stats" style="grid-template-columns:1fr 1fr;margin:0">${metric('Estimated profit / action',gp(Math.floor(profit)),'Assumes 2% sale tax')}${metric('Estimated gp / hour',gp(Math.floor(perHour)),'Manual throughput assumption',perHour>0?'positive':'negative')}</div><p class="smallnote">This generic model charges 2% sales tax on output; tax-exempt items, the per-item tax cap, and multi-output recipes must be handled in a specialized recipe. Calculations are estimates, not verified hourly rates.</p></div></div>`;
 for(const el of document.querySelectorAll('#moneyPage #processInputs [name]'))el.addEventListener('change',()=>{user.process[el.name]=Math.max(0,Number(el.value)||0);save();renderMoney();});
}
function download(data,name){const u=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function renderSettings(){$('#settingsPage').innerHTML=head('OSRS Pump / Configuration','Settings & Sources','Your watchlists and trade history are stored only in your browser on this device.')+
 `<div class="split"><div class="card"><div class="section-heading"><h3>Backup your local market workspace</h3></div><p class="smallnote kicker">Export or restore trades, watchlists, alert settings and preferences. Price feeds stay public; personal entries are not uploaded.</p><div class="gap8"><button class="action" id="export">Export JSON</button><label class="action secondary" for="import-file" style="cursor:pointer">Import JSON</label><input type="file" id="import-file" accept="application/json,.json" hidden></div><div class="divider-x"></div><button class="button-link danger" id="clearData">Erase local portfolio / settings</button></div><div class="card"><div class="section-heading"><h3>Public data & limitations</h3></div><div class="item-row"><strong>OSRS Wiki API</strong><a href="https://prices.runescape.wiki/" target="_blank" rel="noopener">Price project ↗</a></div><div class="item-row"><strong>OSRS Wiki</strong><a href="https://oldschool.runescape.wiki/" target="_blank" rel="noopener">Public guides ↗</a></div><div class="item-row"><strong>Source repository</strong><a href="https://github.com/mandecoy/OSRS-Pump" target="_blank" rel="noopener">OSRS Pump ↗</a></div><div class="item-row"><strong>API refresh</strong><strong>Cached 1–2 minutes</strong></div><p class="smallnote">OSRS Wiki real-time API and historical averages, not live buy/sell order depth. The Wiki 24h per-item volume and Jagex's official 7-day Most Traded table use different time windows and should never be displayed as interchangeable. Volume is transaction volume, not available liquidity. App displays heuristic scores, not financial certainty. Local notification checks happen only while the page is open. Not affiliated with Jagex.</p></div></div>`;
 $('#export').addEventListener('click',()=>download(JSON.stringify({app:'OSRS-Pump',version:1,exportedAt:new Date().toISOString(),user},null,2),'osrs-pump-backup.json'));
 $('#import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.app!=='OSRS-Pump'||data.version!==1||!Array.isArray(data.user?.trades)||!Array.isArray(data.user?.watchlist)||!Array.isArray(data.user?.alerts))throw Error('Invalid backup');Object.assign(user,{...defaults,...data.user});save();nav('dashboard');toast('Local backup restored');}catch(err){toast('Import failed: '+err.message);}});
 $('#clearData').addEventListener('click',()=>{if(!confirm('Delete all local OSRS Pump trades, alerts and watchlists? Export first if you want a backup.'))return;localStorage.removeItem(KEY);Object.assign(user,structuredClone(defaults));nav('settings');toast('Local user data erased');});}
document.addEventListener('click',e=>{const node=e.target.closest('[data-page],[data-go],[data-watch],[data-open],[data-delete-alert],[data-delete-trade],[data-preset],[data-alch-more]');if(!node)return;
 if(node.dataset.alchMore){user.alchLimit=(user.alchLimit||10)+10;save();renderMoney();return;}
 if(node.dataset.page){nav(node.dataset.page);return;}if(node.dataset.go){nav(node.dataset.go);return;}
 if(node.dataset.watch){e.stopPropagation();toggleWatch(node.dataset.watch);renderPage();return;}
 if(node.dataset.open){selectItem(Number(node.dataset.open));return;}
 if(node.dataset.deleteAlert){user.alerts=user.alerts.filter(a=>a.alertId!==node.dataset.deleteAlert);save();renderWatchlist();return;}
 if(node.dataset.deleteTrade){if(!confirm('Delete this local journal entry?'))return;user.trades=user.trades.filter(t=>t.tradeId!==node.dataset.deleteTrade);save();renderPortfolio();return;}
 if(node.dataset.preset){const type=node.dataset.preset;user.filter={sort:'score',profitable:true,...(type==='safe'?{minVolume:1000,maxAge:30,minScore:75}:type==='budget'?{maxPrice:100000,minVolume:100,minScore:50}:{minRoi:3,minVolume:100,maxAge:180})};save();renderFlips();return;}
});
$('#refresh').addEventListener('click',loadMarket);
V03.init(v3ctx());DASH.init(()=>v3ctx());$('#pumpBack')?.addEventListener('click',()=>{if(!goBack()&&user.page==='dashboard')toast('Already at Home');});nav(names[user.page]?user.page:'dashboard');loadMarket();
setInterval(()=>{if(!document.hidden)loadMarket();},120_000);

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
