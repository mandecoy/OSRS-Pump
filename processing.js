/* Publicly documented OSRS Herblore processing recipes. No private or paid price feeds.
 * Input cost uses latest instant-buy (high); output liquidation uses latest instant-sell (low).
 * These are observed transactions, not guaranteed executable offers. */
import {geTax} from './logic.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export const HERBS=[
 ['Guam leaf',3,3,'Guam potion (unf)'],
 ['Marrentill',5,5,'Marrentill potion (unf)'],
 ['Tarromin',11,12,'Tarromin potion (unf)'],
 ['Harralander',20,22,'Harralander potion (unf)'],
 ['Ranarr weed',25,30,'Ranarr potion (unf)'],
 ['Toadflax',30,34,'Toadflax potion (unf)'],
 ['Irit leaf',40,45,'Irit potion (unf)'],
 ['Avantoe',48,50,'Avantoe potion (unf)'],
 ['Kwuarm',54,55,'Kwuarm potion (unf)'],
 ['Huasca',58,58,'Huasca potion (unf)'],
 ['Snapdragon',59,63,'Snapdragon potion (unf)'],
 ['Cadantine',65,66,'Cadantine potion (unf)'],
 ['Lantadyme',67,69,'Lantadyme potion (unf)'],
 ['Dwarf weed',70,72,'Dwarf weed potion (unf)'],
 ['Torstol',75,78,'Torstol potion (unf)']
];
export const SOURCE_HERBS='https://oldschool.runescape.wiki/w/Herblore';
export const SOURCE_UNF='https://oldschool.runescape.wiki/w/Module:Unfinished_potion_creation_calculator';
export const RECIPES=HERBS.flatMap(([herb,cleanLevel,unfLevel,potion])=>[
 {id:'clean-'+herb.toLowerCase().replace(/[^a-z]+/g,'-'),kind:'Cleaning',level:cleanLevel,output:herb,inputs:[{name:'Grimy '+herb,qty:1}],outputQty:1,source:SOURCE_HERBS,note:'One grimy herb becomes one clean herb. Requires Druidic Ritual.'},
 {id:'unf-'+herb.toLowerCase().replace(/[^a-z]+/g,'-'),kind:'Unfinished potions',level:unfLevel,output:potion,inputs:[{name:herb,qty:1},{name:'Vial of water',qty:1}],outputQty:1,source:SOURCE_UNF,note:'One clean herb plus one vial of water makes one unfinished potion. Requires Druidic Ritual.'}
]);
export function recipeEvaluation(recipe,mapping=[],latest={},day={}){
 const items=Array.isArray(mapping)?mapping:mapping?.data||[];
 const byName=new Map(items.map(i=>[String(i.name||'').toLowerCase(),i]));
 const prices=latest?.data||latest||{},daily=day?.data||day||{};
 let cost=0,complete=true,freshestOldest=0,limit=Infinity;
 const inputs=recipe.inputs.map(i=>{
  const item=byName.get(i.name.toLowerCase()),p=item?prices[item.id]:null;
  const buy=p?.high>0?Number(p.high):null;
  if(buy===null){complete=false;}
  else {cost+=buy*i.qty;const age=(Date.now()/1000-Number(p.highTime||0))/60;freshestOldest=Math.max(freshestOldest,Number.isFinite(age)?Math.max(0,age):Infinity);}
  if(item?.limit>0)limit=Math.min(limit,Math.floor(Number(item.limit)/i.qty));
  return {name:i.name,qty:i.qty,buy,id:item?.id??null};
 });
 const out=byName.get(recipe.output.toLowerCase()),outTrade=out?prices[out.id]:null;
 const sell=outTrade?.low>0?Number(outTrade.low):null;
 if(sell===null)complete=false;
 else {const age=(Date.now()/1000-Number(outTrade.lowTime||0))/60;freshestOldest=Math.max(freshestOldest,Number.isFinite(age)?Math.max(0,age):Infinity);}
 const rev=sell===null?null:(sell-geTax(sell,out?.name||recipe.output))*recipe.outputQty;
 const net=complete?rev-cost:null,roi=complete&&cost>0?100*net/cost:null;
 const d=out?daily[out.id]:null,vol=d?(Number(d.highPriceVolume)||0)+(Number(d.lowPriceVolume)||0):null;
 return {...recipe,outputId:out?.id??null,inputs,cost:complete?cost:null,sell,afterTax:rev,net,roi,dayVolume:vol,
   olderTradeMinutes:complete?freshestOldest:null,limit:Number.isFinite(limit)?limit:null,complete,outputExists:!!out};
}
export function evaluateRecipes(mapping,latest,day){
 return RECIPES.map(r=>recipeEvaluation(r,mapping,latest,day));
}
export function capacity(e,budget,rate){
 const cash=Number(budget),actions=Number(rate);
 const maxByCash=e.cost>0&&Number.isFinite(cash)&&cash>=0?Math.floor(cash/e.cost):0;
 const maxByLimit=e.limit==null?null:e.limit;
 const maxQty=maxByLimit==null?maxByCash:Math.min(maxByCash,maxByLimit);
 return {maxQty,totalCost:e.cost===null?null:e.cost*maxQty,profit:e.net===null?null:e.net*maxQty,
   hourProfit:e.net===null||!Number.isFinite(actions)||actions<0?null:e.net*actions, maxByLimit};
}
const fmt=x=>x==null||!Number.isFinite(x)?'—':Math.round(x).toLocaleString('en-US');
const gp=x=>x==null||!Number.isFinite(x)?'—':fmt(x)+' gp';
export function renderProcessing(ctx){
 const u=ctx.user,all=ctx.recipes||[];
 const kind=u.processKind||'all';
 const threshold=u.processMinProfit==null||u.processMinProfit===''?null:(Number.isFinite(Number(u.processMinProfit))?Number(u.processMinProfit):null);
 const rank=u.processSort||'net';
 const visible=all.filter(x=>(kind==='all'||x.kind===kind)&&
   (threshold===null||x.net!==null&&x.net>=threshold)&&
   (!u.processProfitable||x.net!==null&&x.net>0));
 visible.sort((a,b)=>{
  const val=x=>rank==='roi'?x.roi:rank==='volume'?x.dayVolume:x.net;
  const ax=val(a),bx=val(b);
  return (bx===null?-Infinity:bx)-(ax===null?-Infinity:ax);
 });
 const limit=u.processLimit||10;
 const cards=visible.slice(0,limit).map(e=>{
   const c=capacity(e,u.tradingGp,u.processRate||1200);
   const flag=e.olderTradeMinutes>180?' <span class="pump-method-warning">Stale quote</span>':'';
   const desc=e.inputs.map(i=>i.qty+'× '+esc(i.name)).join(' + ')+' → '+e.outputQty+'× '+esc(e.output);
   return '<article class="pump-method-card"><div class="pump-method-head"><div><strong>'+esc(e.output)+'</strong>'+
   '<small>'+esc(e.kind)+' · Herblore '+e.level+'</small></div><strong class="'+(e.net>0?'pump-up':'pump-down')+'">'+(e.net>0?'+':'')+gp(e.net)+'</strong></div>'+
   '<p class="pump-method-recipe">'+desc+'</p>'+
   '<div class="pump-method-facts"><span>Buy inputs <b>'+gp(e.cost)+'</b></span><span>Sell output after tax <b>'+gp(e.afterTax)+'</b></span>'+
   '<span>ROI <b>'+ (e.roi===null?'—':e.roi.toFixed(2)+'%')+'</b></span><span>24h output units <b>'+fmt(e.dayVolume)+'</b></span>'+
   '<span>Budget capacity <b>'+fmt(c.maxQty)+'</b></span><span>Capacity profit <b>'+gp(c.profit)+'</b></span></div>'+
   '<div class="pump-method-actions"><span>'+flag+' <small>Scenario '+fmt(u.processRate||1200)+'/hour: '+gp(c.hourProfit)+'</small></span>'+
   '<a href="'+e.source+'" target="_blank" rel="noopener noreferrer">Wiki recipe ↗</a>'+
   (e.outputId?'<button type="button" data-open="'+e.outputId+'">View item</button>':'')+'</div></article>';
 }).join('');
 return '<section class="pump-method-lab"><div class="pump-section-heading"><h3>⚒ Processing Methods</h3><span>Verified public recipes</span></div>'+
 '<p class="pump-caveat">Prices use recent instant-buy costs and instant-sell proceeds, after per-item GE tax. They do not guarantee fills, completion times, or GP/hour. Rates below are your own scenarios.</p>'+
 '<div class="pump-method-controls">'+
 '<label>Recipe type <select id="pumpProcessKind"><option value="all"'+(kind==='all'?' selected':'')+'>All methods</option>'+
 ['Cleaning','Unfinished potions'].map(k=>'<option value="'+k+'"'+(kind===k?' selected':'')+'>'+k+'</option>').join('')+'</select></label>'+
 '<label>Sort by <select id="pumpProcessSort"><option value="net"'+(rank==='net'?' selected':'')+'>GP per action</option><option value="roi"'+(rank==='roi'?' selected':'')+'>ROI %</option><option value="volume"'+(rank==='volume'?' selected':'')+'>24h volume</option></select></label>'+
 '<label>Minimum GP profit <input type="number" min="0" id="pumpProcessMin" value="'+(u.processMinProfit??'')+'" placeholder="Any"></label>'+
 '<label>Actions/hour scenario <input type="number" min="1" max="15000" id="pumpProcessRate" value="'+(u.processRate||1200)+'"></label>'+
 '<label class="pump-method-check"><input type="checkbox" id="pumpProcessPositive"'+(u.processProfitable?' checked':'')+'> Profitable only</label>'+
 '</div><p class="pump-caption">'+visible.length+' matching recipes · Budget '+gp(u.tradingGp)+' · 4h buy limits applied when known. Unknown limits are not assumed unlimited.</p>'+
 '<div class="pump-method-results">'+(cards||'<div class="pump-empty">No recipes match these filters. Clear the minimum profit or profitable-only setting.</div>')+'</div>'+
 (visible.length>limit?'<button class="pump-more" type="button" data-pump-method-more="1">Load 10 more ('+(visible.length-limit)+' remaining)</button>':'')+
 '<p class="pump-caveat">Prerequisite: Druidic Ritual. Level requirements and ingredient ratios come from the OSRS Wiki. Cleaning rates vary greatly by play style; the hourly setting is a user-defined what-if calculation.</p></section>';
}
