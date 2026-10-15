/* OSRS Pump customizable home widgets. Public price observations, local-only preferences. */
import {tradeSize,journalMetrics,riskSignals} from './logic.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Math.round(Number(v)).toLocaleString('en-US');
const abr=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Math.abs(v)>1e9?(v/1e9).toFixed(2)+'B':Math.abs(v)>=1e6?(v/1e6).toFixed(2)+'M':Math.abs(v)>=1e3?(v/1e3).toFixed(1)+'K':fmt(v);
const gp=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':fmt(v)+' gp';
export const HOME_WIDGETS=[
 {id:'budget',title:'Flips for Your GP',icon:'◈',desc:'Budget-sized after-tax opportunities'},
 {id:'top',title:'Top Flip Opportunities',icon:'◆',desc:'High margin, ROI and volume'},
 {id:'movers',title:'Market Movers',icon:'↗',desc:'Compared with daily average'},
 {id:'watch',title:'Watchlist Snapshot',icon:'☆',desc:'Your favorite items'},
 {id:'portfolio',title:'Portfolio Performance',icon:'▣',desc:'Profit and open positions'},
 {id:'calculator',title:'Quick Flip Calculator',icon:'⊞',desc:'Cash and buy-limit sized estimate'},
 {id:'methods',title:'Money-Making Highlights',icon:'⚒',desc:'Alchemy and recipe processing'},
 {id:'risks',title:'Market Reliability',icon:'⚠',desc:'Alerts and potential quote issues'}
];
export function normalizedOrder(order){
 const ids=HOME_WIDGETS.map(w=>w.id);
 if(!Array.isArray(order))return ids;
 return [...new Set(order.filter(id=>ids.includes(id)))].concat(ids.filter(id=>!order.includes(id)));
}
function itemCard(r){
 const vol=r.dayVol==null?'—':abr(r.dayVol);
 return '<button class="pump-home-item" type="button" data-open="'+r.id+'"><span class="pump-home-item-name">'+esc(r.name)+
 '<small>24h '+vol+' units · Age '+(Number.isFinite(r.age)?Math.round(r.age)+'m':'—')+'</small></span>'+
 '<span class="'+(r.net>=0?'pump-up':'pump-down')+'">'+(r.net>0?'+':'')+abr(r.net)+' GP<small>'+(Number.isFinite(r.roi)?(r.roi*100).toFixed(1)+'% ROI':'—')+'</small></span></button>';
}
function section(id,label,content,user){
 const w=HOME_WIDGETS.find(x=>x.id===id);
 return '<section class="pump-home-widget" data-home-widget="'+id+'"><div class="pump-home-widget-title"><h3>'+w.icon+' '+label+'</h3>'+
 (user.homeCustomize?'<div><button type="button" data-home-move="'+id+':up" aria-label="Move '+id+' up">↑</button><button type="button" data-home-move="'+id+':down" aria-label="Move '+id+' down">↓</button><button type="button" data-home-hide="'+id+'" aria-label="Hide '+id+'">✕</button></div>':'')+
 '</div>'+content+'</section>';
}
const note=s=>'<p class="pump-caption">'+s+'</p>';
const empty=s=>'<div class="pump-empty">'+esc(s)+'</div>';
function renderWidget(id,ctx){
 const u=ctx.user,rows=ctx.rows||[], budget=Number(u.tradingGp)||0;
 const valid=rows.filter(x=>x.net>0&&x.buy>0&&x.age<=180&&x.v1>=20);
 const best=valid.filter(x=>x.buy<=budget).map(x=>({...x,trade:tradeSize(budget,x.buy,x.sell,x.name,x.limit)}))
   .filter(x=>x.trade&&x.trade.quantity>0).sort((a,b)=>b.trade.profit-a.trade.profit);
 const candidates=valid.slice().sort((a,b)=>b.net-a.net);
 const limit=u.homeLoad||5;
 switch(id){
 case 'budget':return section(id,'Flips for Your GP',note('Estimated full trade-size profit for '+gp(budget)+'. Buy limits cap quantities when published; estimated profit is not a guaranteed fill.')+
  (best.length?best.slice(0,limit).map(r=>itemCard(r)).join('')+note('Best-sized example: '+esc(best[0].name)+' · '+fmt(best[0].trade.quantity)+' units · '+gp(best[0].trade.profit)+' estimated net.') :empty('Enter a larger GP budget or wait for recent liquid opportunities.'))+
  '<button class="pump-text-action" data-go="flips">Explore all flips →</button>',u);
 case 'top':{
  const choice=u.homeRank||'net';
  const sorted=valid.slice().sort((a,b)=>choice==='roi'?b.roi-a.roi:choice==='volume'?b.v1-a.v1:b.net-a.net);
  const tabs=[['net','High Profit'],['roi','High ROI'],['volume','High Volume']].map(([k,n])=>'<button class="'+(choice===k?'active':'')+'" data-home-rank="'+k+'">'+n+'</button>').join('');
  return section(id,'Top Flip Opportunities','<div class="pump-widget-tabs">'+tabs+'</div>'+(sorted.length?sorted.slice(0,limit).map(itemCard).join(''):empty('No liquid after-tax opportunities in this snapshot.'))+
    '<button class="pump-text-action" data-home-load="1">Show more ↓</button>',u);
 }
 case 'movers':{
  const ups=rows.filter(r=>r.dayGapPct!==null&&r.dayGapPct>0).sort((a,b)=>b.dayGapPct-a.dayGapPct).slice(0,3);
  const downs=rows.filter(r=>r.dayGapPct!==null&&r.dayGapPct<0).sort((a,b)=>a.dayGapPct-b.dayGapPct).slice(0,3);
  const movers=(arr,sym)=>arr.map(x=>'<button class="pump-home-item" data-open="'+x.id+'">'+sym+' '+esc(x.name)+' <strong class="'+(x.dayGapPct>=0?'pump-up':'pump-down')+'">'+(x.dayGapPct>0?'+':'')+x.dayGapPct.toFixed(1)+'%</strong></button>').join('');
  return section(id,'Market Movers',note('Hourly bucket-average price compared with the latest 24-hour bucket average, not a true 24h closing-price change.')+
    '<div class="pump-home-two"><div><strong>Above average</strong>'+movers(ups,'↗')+'</div><div><strong>Below average</strong>'+movers(downs,'↘')+'</div></div>'+
    '<button class="pump-text-action" data-go="markets">Browse market trends →</button>',u);
 }
 case 'watch':{
  const watch=u.watchlist.map(id=>rows.find(x=>x.id===id)).filter(Boolean);
  return section(id,'Watchlist Snapshot',(watch.length?watch.slice(0,limit).map(itemCard).join(''):empty('Star items in Markets to add them to your watchlist.'))+
    '<button class="pump-text-action" data-go="watchlist">Watchlists & alerts →</button>',u);
 }
 case 'portfolio':{
  const m=journalMetrics(u.trades||[],Object.fromEntries(rows.map(x=>[x.id,x])));
  return section(id,'Portfolio Performance','<div class="pump-overview">'+
    [['Invested',gp(m.locked)],['Realized P/L',gp(m.realized)],['Unrealized estimate',gp(m.unrealized)],['Open positions',fmt(m.open)]]
     .map(([a,b])=>'<div class="pump-metric"><small>'+a+'</small><strong>'+b+'</strong></div>').join('')+'</div>'+
    '<button class="pump-text-action" data-go="portfolio">Open trade journal →</button>',u);
 }
 case 'calculator':{
  const e=rows.find(x=>x.id===Number(u.homeCalcId))||best[0]||candidates[0];
  const t=e?tradeSize(budget,e.buy,e.sell,e.name,e.limit):null;
  return section(id,'Quick Flip Calculator','<div class="pump-home-controlrow"><label>Item <select id="pumpCalcItem">'+
    (candidates.slice(0,150).map(r=>'<option value="'+r.id+'"'+(e&&e.id===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join(''))+
    '</select></label></div>'+(t?'<div class="pump-calculator-stats">'+[['Affordable',fmt(t.affordable)],['4h limit',t.limitKnown?fmt(t.limit):'Unknown'],
    ['Estimated quantity',fmt(t.quantity)],['Total spent',gp(t.spend)],['GE sale tax / item',gp(t.taxEach)],['Estimated profit',gp(t.profit)]]
    .map(([l,v])=>'<span>'+l+' <b>'+v+'</b></span>').join('')+'</div>'+note('Conservative quantity uses your budget and the known 4h buy limit. Actual order filling is not guaranteed.'):
    empty('Select an item once market data loads.'))+
    '<button class="pump-text-action" data-go="flips">Open full Flip Finder →</button>',u);
 }
 case 'methods':{
  const alch=(ctx.alchRows||[]).slice(0,3);
  const recipes=(ctx.recipes||[]).filter(x=>x.net>0&&x.olderTradeMinutes<=180).sort((a,b)=>b.net-a.net).slice(0,3);
  return section(id,'Money-Making Highlights','<h4>High Alchemy</h4>'+ (alch.length?alch.map(x=>'<div class="pump-home-mini">'+esc(x.name)+' <strong class="pump-up">+'+gp(x.net)+'/alch</strong></div>').join(''):empty('Alchemy quotes unavailable.'))+
    '<h4>Processing</h4>'+(recipes.length?recipes.map(x=>'<div class="pump-home-mini">'+esc(x.output)+' <strong class="pump-up">+'+gp(x.net)+'/action</strong></div>').join(''):empty('No fresh profitable processing method in the available quotes.'))+
    '<button class="pump-text-action" data-go="money">Open Processing & Money Making →</button>',u);
 }
 case 'risks':{
  const stale=rows.filter(x=>x.age>180).length;
  const thin=rows.filter(x=>x.v1<20).length;
  const alerts=(u.alerts||[]).filter(a=>a.triggered).length;
  const risk=rows.filter(x=>x.net>0&&(x.age>180||x.v1<20||x.roi>.2)).slice(0,4);
  return section(id,'Market Reliability','<div class="pump-calculator-stats">'+[['Stale trade pairs',fmt(stale)],
   ['Thin 1h volume',fmt(thin)],['Triggered alerts',fmt(alerts)]].map(([l,v])=>'<span>'+l+' <b>'+v+'</b></span>').join('')+'</div>'+
   note('These are heuristic flags, not market predictions. A wide apparent margin can be unfillable.')+
   risk.map(x=>'<button class="pump-home-item" data-open="'+x.id+'">⚠ '+esc(x.name)+' <small>'+(x.age>180?'Stale quote':x.v1<20?'Low volume':'Unusually high ROI')+'</small></button>').join('')+
   '<button class="pump-text-action" data-go="watchlist">Manage alerts →</button>',u);
 }
 default:return '';
 }
}
export function home(ctx){
 const user=ctx.user,rows=ctx.rows||[];
 const order=normalizedOrder(user.homeWidgets);
 const hidden=Array.isArray(user.homeHidden)?user.homeHidden:[];
 const active=rows.filter(x=>x.v1>0).length,volume=rows.reduce((sum,x)=>sum+(x.dayVol||0),0);
 const summary='<div class="pump-hero"><small>OSRS PUMP · GRAND EXCHANGE</small><h2>Your trading <em>command center.</em></h2><p>Public market observations · After-tax estimates · Local-first tools</p></div>'+
 '<div class="pump-ticker">◆ '+fmt(rows.length)+' price pairs · '+fmt(active)+' items with 1h activity · Completed trades ≠ guaranteed prices</div>'+
 '<div class="pump-overview">'+[['Priced items',fmt(rows.length)],['Active items (1h)',fmt(active)],['24h traded units',abr(volume)],['Watchlist',fmt(user.watchlist.length)]]
  .map(([label,v])=>'<div class="pump-metric"><small>'+label+'</small><strong>'+v+'</strong></div>').join('')+'</div>'+
 '<div class="pump-shortcuts">'+[['flips','⚖','Flip Finder'],['markets','◆','Markets'],['portfolio','▣','Portfolio'],['money','⚒','Processing']]
  .map(([id,ico,label])=>'<button data-go="'+id+'"><b>'+ico+'</b><small>'+label+'</small></button>').join('')+'</div>'+
 '<div class="pump-budget-row"><label for="pumpHomeBudget">Your trading capital (GP)</label><input inputmode="numeric" type="number" min="0" id="pumpHomeBudget" value="'+(Number(user.tradingGp)||0)+'"><button type="button" data-home-save-budget="1">Update</button></div>';
 const toggle= '<div class="pump-home-custombar"><strong>Your dashboard</strong><button type="button" data-home-customize="1">'+(user.homeCustomize?'Done':'Customize widgets')+'</button></div>';
 const edit=user.homeCustomize?'<div class="pump-home-editor">'+HOME_WIDGETS.map(w=>'<label><input type="checkbox" data-home-visibility="'+w.id+'"'+(!hidden.includes(w.id)?' checked':'')+'> '+w.icon+' '+esc(w.title)+'</label>').join('')+
 '<p class="pump-caption">Use ↑ and ↓ to rearrange sections. Hidden widgets remain available in this editor.</p></div>':'';
 const sections=order.filter(id=>!hidden.includes(id)).map(id=>renderWidget(id,ctx)).join('');
 return '<div class="pump-home">'+summary+toggle+edit+sections+'</div>';
}
export function init(getCtx){
 if(window.__pumpHomeReady)return;window.__pumpHomeReady=true;
 const render=()=>{const ctx=getCtx();ctx.save();if(ctx.user.page==='dashboard')ctx.renderPage();else if(ctx.user.page==='money')ctx.renderPage();};
 document.addEventListener('click',e=>{
  const element=e.target.closest('[data-home-customize],[data-home-move],[data-home-hide],[data-home-save-budget],[data-home-rank],[data-home-load]');
  if(!element)return;
  const ctx=getCtx(),u=ctx.user;
  if(element.dataset.homeCustomize!==undefined)u.homeCustomize=!u.homeCustomize;
  if(element.dataset.homeMove){
   const [id,action]=element.dataset.homeMove.split(':'),order=normalizedOrder(u.homeWidgets),i=order.indexOf(id),j=i+(action==='up'?-1:1);
   if(i>=0&&j>=0&&j<order.length){[order[i],order[j]]=[order[j],order[i]];u.homeWidgets=order;}
  }
  if(element.dataset.homeHide){u.homeHidden=[...new Set([...(u.homeHidden||[]),element.dataset.homeHide])];}
  if(element.dataset.homeSaveBudget!==undefined){
   const input=document.querySelector('#pumpHomeBudget'),n=Number(input?.value);
   if(!Number.isFinite(n)||n<0){ctx.toast('Enter a nonnegative GP budget.');return;}
   u.tradingGp=Math.floor(n);
  }
  if(element.dataset.homeRank)u.homeRank=element.dataset.homeRank;
  if(element.dataset.homeLoad)u.homeLoad=Math.min(50,(u.homeLoad||5)+5);
  render();
 });
 document.addEventListener('change',e=>{
  const ctx=getCtx(),u=ctx.user;
  if(e.target.dataset.homeVisibility){
   const id=e.target.dataset.homeVisibility;u.homeHidden=e.target.checked?(u.homeHidden||[]).filter(x=>x!==id):[...new Set([...(u.homeHidden||[]),id])];
   render();
  }
  if(e.target.id==='pumpCalcItem'){u.homeCalcId=Number(e.target.value);render();}
  if(e.target.id==='pumpProcessKind'){u.processKind=e.target.value;u.processLimit=10;render();}
  if(e.target.id==='pumpProcessSort'){u.processSort=e.target.value;render();}
  if(e.target.id==='pumpProcessPositive'){u.processProfitable=!!e.target.checked;render();}
  if(e.target.id==='pumpProcessMin'){u.processMinProfit=e.target.value===''?null:Math.max(0,Number(e.target.value));render();}
  if(e.target.id==='pumpProcessRate'){
   const n=Number(e.target.value);if(Number.isFinite(n)&&n>=1&&n<=15000){u.processRate=Math.floor(n);render();}
  }
 });
 document.addEventListener('click',e=>{
  if(!e.target.closest('[data-pump-method-more]'))return;
  const ctx=getCtx();ctx.user.processLimit=(ctx.user.processLimit||10)+10;render();
 });
}
