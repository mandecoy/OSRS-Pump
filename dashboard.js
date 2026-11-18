/* OSRS Pump Hardcore Worlds: flipping-only dashboard.
 * Every priced item remains accessible. The dashboard prioritizes plausible
 * budget-sized opportunities and keeps the old complex widgets optional.
 */
import {journalMetrics} from './logic.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const gp=x=>x==null||!Number.isFinite(Number(x))?'—':Math.round(Number(x)).toLocaleString('en-US')+' gp';
const n=x=>x==null||!Number.isFinite(Number(x))?'—':Math.round(Number(x)).toLocaleString('en-US');
const small=x=>x==null||!Number.isFinite(Number(x))?'—':Math.abs(x)>=1e9?(x/1e9).toFixed(2)+'B':Math.abs(x)>=1e6?(x/1e6).toFixed(2)+'M':Math.abs(x)>=1e3?(x/1e3).toFixed(1)+'K':n(x);
export const HOME_WIDGETS=[
 {id:'top',title:'Top Flip Ideas',icon:'◆'},
 {id:'budget',title:'Ideas for Your GP',icon:'◈'},
 {id:'watch',title:'Watchlist',icon:'☆'},
 {id:'portfolio',title:'Portfolio',icon:'▣'},
 {id:'movers',title:'Market Movers',icon:'↗'},
 {id:'calculator',title:'Trade Size Calculator',icon:'⊞'}
];
export function normalizedOrder(order){
 const ids=HOME_WIDGETS.map(w=>w.id);
 if(!Array.isArray(order))return ids;
 return [...new Set(order.filter(id=>ids.includes(id)))].concat(ids.filter(id=>!order.includes(id)));
}
const note=s=>'<p class="pump-caption">'+s+'</p>';
const empty=s=>'<div class="pump-empty">'+esc(s)+'</div>';
function itemCard(r){
 const margin=Number(r.net)||0,activity=r.flipGrade||'No recent volume';
 const visible24=r.dayVol==null?'—':small(r.dayVol);
 return '<button class="pump-home-item" data-open="'+r.id+'"><span class="pump-home-item-name">'+esc(r.name)+
 '<small>Buy '+n(r.buy)+' · Sell '+n(r.sell)+' · 24h '+visible24+' · '+esc(activity)+'</small></span>'+
 '<span class="'+(margin>0?'pump-up':'pump-down')+'">'+(margin>0?'+':'')+gp(margin)+
 '<small>'+(Number.isFinite(r.roi)?(r.roi*100).toFixed(1)+'% ROI':'—')+'</small></span></button>';
}
function section(id,title,inner,user){
 return '<section class="pump-home-widget" data-home-widget="'+id+'"><div class="pump-home-widget-title"><h3>'+title+'</h3>'+
 (user.homeCustomize?'<div><button data-home-move="'+id+':up" aria-label="Move up">↑</button><button data-home-move="'+id+':down" aria-label="Move down">↓</button><button data-home-hide="'+id+'" aria-label="Hide widget">✕</button></div>':'')+
 '</div>'+inner+'</section>';
}
function renderWidget(id,ctx){
 const u=ctx.user,rows=ctx.rows||[],budget=Math.max(0,Number(u.tradingGp)||0),count=u.homeLoad||5;
 const profitable=rows.filter(r=>r.net>0).sort((a,b)=>b.flipRank-a.flipRank||b.flipBatchProfit-a.flipBatchProfit);
 const sized=profitable.filter(r=>r.flipUnits>0).sort((a,b)=>b.flipRank-a.flipRank||b.flipBatchProfit-a.flipBatchProfit);
 switch(id){
 case 'top':{
  const choice=u.homeRank||'net';
  const ranked=[...profitable].sort((a,b)=>choice==='roi'?b.roi-a.roi:
    choice==='volume'?(b.dayVol||0)-(a.dayVol||0):b.flipRank-a.flipRank);
  const tabs=[['net','Best Overall'],['roi','Highest ROI'],['volume','24h Volume']].map(([k,l])=>
    '<button class="'+(choice===k?'active':'')+'" data-home-rank="'+k+'">'+l+'</button>').join('');
  return section(id,'◆ Top Flip Ideas','<div class="pump-widget-tabs">'+tabs+'</div>'+
   (ranked.length?ranked.slice(0,count).map(itemCard).join(''):empty('No positive observed spreads yet. All items remain available in Flip Finder.'))+
   '<button class="pump-text-action" data-go="flips">View every item →</button>',u);
 }
 case 'budget':return section(id,'◈ Flips for '+gp(budget),
  note('Quantity scenario uses a share of both-sided completed-trade volume and your 4h GE limit. Not live available orders.')+
  (sized.length?sized.slice(0,count).map(itemCard).join('')+
    note('Top scenario: '+esc(sized[0].name)+' · '+n(sized[0].flipUnits)+' units · '+gp(sized[0].flipBatchProfit)+' potential, if filled.'):
    empty('No two-sided volume and affordable quantity estimate yet. Browse all items and compare observed spreads instead.'))+
  '<button class="pump-text-action" data-go="flips">See all margins →</button>',u);
 case 'watch':{
  const watch=(u.watchlist||[]).map(id=>rows.find(r=>r.id===id)).filter(Boolean);
  return section(id,'☆ Your Watchlist',(watch.length?watch.slice(0,count).map(itemCard).join(''):
   empty('Star a rune or item in the Flip Finder to monitor it here.'))+
   '<button class="pump-text-action" data-go="watchlist">Open watchlist →</button>',u);
 }
 case 'portfolio':{
  const m=journalMetrics(u.trades||[],Object.fromEntries(rows.map(r=>[r.id,r])));
  const stats=[['GP invested',gp(m.locked)],['Realized profit',gp(m.realized)],
   ['Unrealized estimate',gp(m.unrealized)],['Open flips',n(m.open)]];
  return section(id,'▣ Portfolio','<div class="pump-overview">'+stats.map(([l,v])=>
   '<div class="pump-metric"><small>'+l+'</small><strong>'+v+'</strong></div>').join('')+'</div>'+
   '<button class="pump-text-action" data-go="portfolio">Open trade journal →</button>',u);
 }
 case 'movers':{
  const up=rows.filter(r=>r.dayGapPct!==null&&r.dayGapPct>0).sort((a,b)=>b.dayGapPct-a.dayGapPct).slice(0,3);
  const down=rows.filter(r=>r.dayGapPct!==null&&r.dayGapPct<0).sort((a,b)=>a.dayGapPct-b.dayGapPct).slice(0,3);
  const table=(arr)=>arr.map(r=>'<button data-open="'+r.id+'" class="pump-home-item">'+esc(r.name)+
    '<b class="'+(r.dayGapPct>0?'pump-up':'pump-down')+'">'+r.dayGapPct.toFixed(1)+'%</b></button>').join('');
  return section(id,'↗ Market Movers',note('Hourly average compared with the 24h average; not a daily closing-price change.')+
   '<div class="pump-home-two"><div><strong>Above average</strong>'+table(up)+'</div><div><strong>Below average</strong>'+table(down)+'</div></div>',u);
 }
 case 'calculator':{
  const item=rows.find(r=>r.id===Number(u.homeCalcId))||sized[0]||profitable[0];
  const options=profitable.slice(0,150).map(r=>'<option value="'+r.id+'"'+(item?.id===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  const values=item?[
   ['Buy',gp(item.buy)],['Sell',gp(item.sell)],['Margin after tax',gp(item.net)],
   ['ROI',Number.isFinite(item.roi)?(item.roi*100).toFixed(1)+'%':'—'],
   ['Affordable units',n(Math.floor(budget/item.buy))],['Volume-capped units',n(item.flipUnits)],
   ['Estimated batch profit',gp(item.flipBatchProfit)]
  ].map(([l,v])=>'<span>'+l+'<b>'+v+'</b></span>').join(''):'';
  return section(id,'⊞ Quick Trade Calculator','<div class="pump-home-controlrow"><label>Item<select id="pumpCalcItem">'+options+
   '</select></label></div>'+(item?'<div class="pump-calculator-stats">'+values+'</div>':empty('No item quotes available.'))+
   note('Past traded volume cannot guarantee the same number of future fills.'),u);
 }
 default:return '';
 }
}
export function home(ctx){
 const u=ctx.user,rows=ctx.rows||[],order=normalizedOrder(u.homeWidgets);
 const hidden=Array.isArray(u.homeHidden)?u.homeHidden:[];
 const active=rows.filter(r=>r.flipDayHighVolume>0&&r.flipDayLowVolume>0).length;
 const total=rows.reduce((sum,r)=>sum+(r.dayVol||0),0);
 const positive=rows.filter(r=>r.net>0).length;
 const head='<div class="pump-hero"><small>OSRS PUMP · HARDCORE WORLDS</small><h2>Find your next <em>flip.</em></h2>'+
 '<p>Actual Wiki transaction prices · No hidden minimum-profit cutoff</p></div>'+
 '<div class="pump-overview">'+[['Priced items',n(rows.length)],['Positive net spreads',n(positive)],
 ['Two-sided trades (24h)',n(active)],['24h traded units',small(total)]].map(([label,val])=>
  '<div class="pump-metric"><small>'+label+'</small><strong>'+val+'</strong></div>').join('')+'</div>'+
 '<div class="pump-shortcuts">'+[['flips','⌕','Find Flips'],['markets','◆','Markets'],
  ['watchlist','☆','Watchlist'],['portfolio','▣','Portfolio']].map(([id,symbol,label])=>
  '<button data-go="'+id+'"><b>'+symbol+'</b><small>'+label+'</small></button>').join('')+'</div>'+
 '<div class="pump-budget-row"><label for="pumpHomeBudget">Your cash stack (GP)</label>'+
 '<input type="number" min="0" inputmode="numeric" id="pumpHomeBudget" value="'+(Number(u.tradingGp)||0)+'">'+
 '<button data-home-save-budget="1">Update</button></div>'+
 '<div class="pump-home-custombar"><strong>Flipping dashboard</strong><button data-home-customize="1">'+(u.homeCustomize?'Done':'Customize')+'</button></div>';
 const editor=u.homeCustomize?'<div class="pump-home-editor">'+HOME_WIDGETS.map(w=>
  '<label><input type="checkbox" data-home-visibility="'+w.id+'"'+(!hidden.includes(w.id)?' checked':'')+'>'+esc(w.title)+'</label>').join('')+
  '<p class="pump-caption">Move sections with ↑ and ↓ or hide extras.</p></div>':'';
 return '<div class="pump-home">'+head+editor+order.filter(id=>!hidden.includes(id)).map(id=>renderWidget(id,ctx)).join('')+'</div>';
}
export function init(getCtx){
 if(window.__pumpHomeReady)return;window.__pumpHomeReady=true;
 const render=()=>{const c=getCtx();c.save();if(c.user.page==='dashboard')c.renderPage();};
 document.addEventListener('click',e=>{
  const el=e.target.closest('[data-home-customize],[data-home-move],[data-home-hide],[data-home-save-budget],[data-home-rank],[data-home-load]');
  if(!el)return;
  const ctx=getCtx(),u=ctx.user;
  if(el.dataset.homeCustomize!==undefined)u.homeCustomize=!u.homeCustomize;
  if(el.dataset.homeMove){const [id,move]=el.dataset.homeMove.split(':');const arr=normalizedOrder(u.homeWidgets),i=arr.indexOf(id),j=i+(move==='up'?-1:1);
    if(i>=0&&j>=0&&j<arr.length){[arr[i],arr[j]]=[arr[j],arr[i]];u.homeWidgets=arr;}
  }
  if(el.dataset.homeHide)u.homeHidden=[...new Set([...(u.homeHidden||[]),el.dataset.homeHide])];
  if(el.dataset.homeSaveBudget!==undefined){
   const num=Number(document.querySelector('#pumpHomeBudget')?.value);
   if(!Number.isFinite(num)||num<0){ctx.toast('Enter a valid GP amount.');return;}
   u.tradingGp=Math.floor(num);
  }
  if(el.dataset.homeRank)u.homeRank=el.dataset.homeRank;
  if(el.dataset.homeLoad)u.homeLoad=Math.min(50,(u.homeLoad||5)+5);
  render();
 });
 document.addEventListener('change',e=>{
  const ctx=getCtx(),u=ctx.user;
  if(e.target.dataset.homeVisibility){
   const id=e.target.dataset.homeVisibility;
   u.homeHidden=e.target.checked?(u.homeHidden||[]).filter(x=>x!==id):[...new Set([...(u.homeHidden||[]),id])];
   render();
  }
  if(e.target.id==='pumpCalcItem'){u.homeCalcId=Number(e.target.value);render();}
 });
}
