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
// Recipes below use documented normal-production methods (no free staves, free materials,
// Blast Furnace reductions, optional bonuses or special shop pricing are assumed).
const inp=(name,qty=1)=>({name,qty});
const entry=(kind,level,output,inputs,opts={})=>({
 id:'method-'+kind.toLowerCase().replace(/[^a-z]+/g,'-')+'-'+output.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
 kind,level,output,inputs,outputQty:opts.outputQty||1,
 fee:opts.fee||0,
 skill:opts.skill||'Processing',
 source:opts.source||'https://oldschool.runescape.wiki/w/Money_making_guide',
 note:opts.note||'Prices are indicative; review requirements and fees in the linked Wiki guide.'
});
export const ADDITIONAL_RECIPES=[
 // Standard sawmill conversion: in addition to acquiring logs, coins are consumed.
 ...[
 ['Logs','Plank',100],['Oak logs','Oak plank',250],
 ['Teak logs','Teak plank',500],['Mahogany logs','Mahogany plank',1500]
 ].map(([logs,plank,fee])=>entry('Making planks',1,plank,[inp(logs)],{
  fee,skill:'Sawmill',source:'https://oldschool.runescape.wiki/w/Sawmill_operator',
  note:'Normal sawmill fee is charged on each log; sawmill trips and banking not included.'
 })),
 // Standard furnace recipe. Iron is omitted due to normal furnace failure chance.
 entry('Smelting bars',1,'Bronze bar',[inp('Copper ore'),inp('Tin ore')],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 entry('Smelting bars',20,'Silver bar',[inp('Silver ore')],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 entry('Smelting bars',30,'Steel bar',[inp('Iron ore'),inp('Coal',2)],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 entry('Smelting bars',40,'Gold bar',[inp('Gold ore')],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 entry('Smelting bars',50,'Mithril bar',[inp('Mithril ore'),inp('Coal',4)],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 entry('Smelting bars',70,'Adamantite bar',[inp('Adamantite ore'),inp('Coal',6)],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 entry('Smelting bars',85,'Runite bar',[inp('Runite ore'),inp('Coal',8)],{skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Smithing'}),
 ...[['Bronze bar','Bronze nails',2],['Iron bar','Iron nails',19],['Steel bar','Steel nails',34],['Mithril bar','Mithril nails',54],
 ['Adamantite bar','Adamantite nails',74],['Runite bar','Rune nails',89]].map(([bar,nails,level])=>entry('Smithing products',level,nails,[inp(bar)],{
  outputQty:15,skill:'Smithing',source:'https://oldschool.runescape.wiki/w/Nails',
  note:'One bar produces 15 nails. GE tax applies per nail, not per 15-nail batch.'
 })),
 // All runes (including air/earth/fire) are explicitly priced; no free elemental-staff assumptions.
 ...[
 ['Varrock teleport',25,[inp('Law rune'),inp('Air rune',3),inp('Fire rune')]],
 ['Lumbridge teleport',31,[inp('Law rune'),inp('Air rune',3),inp('Earth rune')]],
 ['Falador teleport',37,[inp('Law rune'),inp('Air rune',3),inp('Water rune')]],
 ['Camelot teleport',45,[inp('Law rune'),inp('Air rune',5)]],
 ['Teleport to house',40,[inp('Law rune'),inp('Air rune'),inp('Earth rune')]]
 ].map(([output,level,runes])=>entry('Teleport tablets',level,output,[inp('Soft clay'),...runes],{
  skill:'Magic',source:'https://oldschool.runescape.wiki/w/Magic_tablet',
  note:'Made at an appropriate POH lectern; spellbook and lectern requirements apply. Rune-saving staves are not assumed.'
 })),
 // Gem jewelry crafted at a furnace from one cut gem and one gold bar, without enchanting.
 ...[
  ['Gold',null,[['Gold ring',5],['Gold necklace',6],['Gold bracelet',7],['Gold amulet (u)',8]]],
  ['Sapphire','Sapphire',[['Sapphire ring',20],['Sapphire necklace',22],['Sapphire bracelet',23],['Sapphire amulet (u)',24]]],
  ['Emerald','Emerald',[['Emerald ring',27],['Emerald necklace',29],['Emerald bracelet',30],['Emerald amulet (u)',31]]],
  ['Ruby','Ruby',[['Ruby ring',34],['Ruby necklace',40],['Ruby bracelet',42],['Ruby amulet (u)',50]]],
  ['Diamond','Diamond',[['Diamond ring',43],['Diamond necklace',56],['Diamond bracelet',58],['Diamond amulet (u)',70]]],
  ['Dragonstone','Dragonstone',[['Dragonstone ring',55],['Dragon necklace',72],['Dragonstone bracelet',74],['Dragonstone amulet (u)',80]]]
 ].flatMap(([tier,gem,outputs])=>outputs.map(([output,level])=>entry('Jewellery crafting',level,output,[inp('Gold bar'),...(gem?[inp(gem)]:[])],{
  skill:'Crafting',source:'https://oldschool.runescape.wiki/w/Crafting',
  note:'Furnace and correct mould required; output is unenchanted, and amulets are unstrung.'
 }))),
 // GE clerks exchange complete matching equipment for a set at no conversion fee.
 // Each assembled armour set is 1 traded output, no discounts or special set bonuses.
 ...[
  ['Rune armour set (lg)','Rune full helm','Rune platebody','Rune platelegs','Rune kiteshield'],
  ['Rune armour set (sk)','Rune full helm','Rune platebody','Rune plateskirt','Rune kiteshield'],
  ['Adamant armour set (lg)','Adamant full helm','Adamant platebody','Adamant platelegs','Adamant kiteshield'],
  ['Adamant armour set (sk)','Adamant full helm','Adamant platebody','Adamant plateskirt','Adamant kiteshield']
 ].map(([output,...items])=>entry('Combining item sets',0,output,items.map(x=>inp(x)),{
  skill:'GE Clerk',source:'https://oldschool.runescape.wiki/w/Item_set',
  note:'Grand Exchange clerk packs the four matching pieces at no fee. Reverse disassembly may also be profitable; compare actual offers.'
 }))
];
RECIPES.push(...ADDITIONAL_RECIPES);
export const METHOD_CATEGORIES=[
 ['Cleaning','✿','Cleaning herbs'],
 ['Unfinished potions','⚗','Unfinished potions'],
 ['Making planks','▰','Making planks'],
 ['Smelting bars','◆','Smelting bars'],
 ['Smithing products','⚒','Smithing products'],
 ['Combining item sets','▦','Combining item sets'],
 ['Teleport tablets','✦','Teleport tablet creation'],
 ['Jewellery crafting','◇','Jewellery crafting']
];
export const OFFICIAL_VOLUME_URL='https://secure.runescape.com/m=itemdb_oldschool/top100?list=0';

export function recipeEvaluation(recipe,mapping=[],latest={},day={}){
 const items=Array.isArray(mapping)?mapping:mapping?.data||[];
 const byName=new Map(items.map(i=>[String(i.name||'').toLowerCase(),i]));
 const prices=latest?.data||latest||{},daily=day?.data||day||{};
 let cost=Number(recipe.fee||0),complete=true,freshestOldest=0,limit=Infinity,knownLimits=0;
 const inputs=recipe.inputs.map(i=>{
  const item=byName.get(i.name.toLowerCase()),p=item?prices[item.id]:null;
  const buy=p?.high>0?Number(p.high):null;
  if(buy===null){complete=false;}
  else {cost+=buy*i.qty;const age=(Date.now()/1000-Number(p.highTime||0))/60;freshestOldest=Math.max(freshestOldest,Number.isFinite(age)?Math.max(0,age):Infinity);}
  if(item?.limit>0){limit=Math.min(limit,Math.floor(Number(item.limit)/i.qty));knownLimits++;}
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
   olderTradeMinutes:complete?freshestOldest:null,limit:Number.isFinite(limit)?limit:null,limitsPartial:knownLimits<recipe.inputs.length,complete,outputExists:!!out};
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
 const rank=u.processSort||'net',profitOnly=!!u.processProfitable;
 const visible=all.filter(x=>(kind==='all'||x.kind===kind)&&
   (threshold===null||x.net!==null&&x.net>=threshold)&&
   (!profitOnly||x.net!==null&&x.net>0));
 const val=x=>rank==='roi'?x.roi:rank==='volume'?x.dayVolume:x.net;
 visible.sort((a,b)=>{
  const aV=val(a),bV=val(b);
  if(aV===null&&bV===null)return 0;
  if(aV===null)return 1;if(bV===null)return -1;
  return bV-aV;
 });
 const limit=u.processLimit||10;
 const categories=METHOD_CATEGORIES.map(([id,icon,label])=>{
  const full=all.filter(x=>x.kind===id),profitable=full.filter(x=>x.net!==null&&x.net>0);
  return '<button class="pump-method-category'+(kind===id?' active':'')+'" data-method-category="'+esc(id)+'"><b>'+icon+'</b>'+
  '<span><strong>'+esc(label)+'</strong><small>'+profitable.length+' profitable of '+full.length+' verified recipes</small></span><span>›</span></button>';
 }).join('');
 const cards=visible.slice(0,limit).map(e=>{
   const c=capacity(e,u.tradingGp,u.processRate||1200);
   const stale=e.olderTradeMinutes>180?' <span class="pump-method-warning">Stale quote</span>':'';
   const unknown=e.limitsPartial?' <span class="pump-method-warning">Some input buy limits unknown</span>':'';
   const desc=e.inputs.map(i=>i.qty+'× '+esc(i.name)).join(' + ')+' → '+e.outputQty+'× '+esc(e.output);
   const fee=e.fee?'<span>Processing fee <b>'+gp(e.fee)+'</b></span>':'';
   return '<article class="pump-method-card"><div class="pump-method-head"><div><strong>'+esc(e.output)+'</strong>'+
   '<small>'+esc(e.kind)+' · '+esc(e.skill||'Herblore')+' '+(e.level||'none')+'</small></div>'+
   '<strong class="'+(e.net>0?'pump-up':'pump-down')+'">'+(e.net>0?'+':'')+gp(e.net)+'</strong></div>'+
   '<p class="pump-method-recipe">'+desc+'</p>'+
   '<div class="pump-method-facts"><span>Buy ingredients + fees <b>'+gp(e.cost)+'</b></span><span>Sell output after GE tax <b>'+gp(e.afterTax)+'</b></span>'+
   fee+'<span>ROI <b>'+(e.roi===null?'—':e.roi.toFixed(2)+'%')+'</b></span>'+
   '<span>24h output traded units <b>'+fmt(e.dayVolume)+'</b></span>'+
   '<span>Capital-sized actions <b>'+fmt(c.maxQty)+'</b></span><span>Scenario batch profit <b>'+gp(c.profit)+'</b></span></div>'+
   '<div class="pump-method-actions"><span>'+stale+unknown+'<small>Custom '+fmt(u.processRate||1200)+' actions/hour: '+gp(c.hourProfit)+'</small></span>'+
   '<a href="'+esc(e.source)+'" target="_blank" rel="noopener noreferrer">Wiki method ↗</a>'+
   (e.outputId?'<button type="button" data-open="'+e.outputId+'">View output</button>':'')+'</div>'+
   '<small class="pump-method-note">'+esc(e.note||'')+'</small></article>';
 }).join('');
 return '<section class="pump-method-lab"><div class="pump-section-heading"><h3>⚒ Processing Methods</h3><span>'+all.length+' recipes</span></div>'+
 '<p class="pump-caveat">Ingredient costs use recent instant-buy trades and output sale prices use recent instant-sell trades, with GE tax. The values shown are not guaranteed fills. Some methods require specific facilities, skill levels, quests or equipment.</p>'+
 '<div class="pump-method-category-grid"><button class="pump-method-category'+(kind==='all'?' active':'')+'" data-method-category="all"><b>▦</b><span><strong>All processing methods</strong><small>'+all.length+' recipes</small></span><span>›</span></button>'+categories+'</div>'+
 '<div class="pump-method-controls">'+
 '<label>Category <select id="pumpProcessKind"><option value="all"'+(kind==='all'?' selected':'')+'>All methods</option>'+
 METHOD_CATEGORIES.map(([k,,label])=>'<option value="'+esc(k)+'"'+(kind===k?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
 '<label>Sort by <select id="pumpProcessSort"><option value="net"'+(rank==='net'?' selected':'')+'>GP per action</option><option value="roi"'+(rank==='roi'?' selected':'')+'>ROI %</option><option value="volume"'+(rank==='volume'?' selected':'')+'>24h Wiki volume</option></select></label>'+
 '<label>Minimum GP profit <input type="number" min="0" id="pumpProcessMin" value="'+(u.processMinProfit??'')+'" placeholder="Any"></label>'+
 '<label>Actions/hour scenario <input type="number" min="1" max="15000" id="pumpProcessRate" value="'+(u.processRate||1200)+'"></label>'+
 '<label class="pump-method-check"><input type="checkbox" id="pumpProcessPositive"'+(profitOnly?' checked':'')+'> Profitable only</label>'+
 '</div><p class="pump-caption">'+visible.length+' matching · Budget '+gp(u.tradingGp)+' · Observed 24h Wiki volume shown separately from official Jagex 7-day counts.</p>'+
 '<div class="pump-method-results">'+(cards||'<div class="pump-empty">No results for these filters. Try showing all methods, including incomplete quotes.</div>')+'</div>'+
 (visible.length>limit?'<button class="pump-more" type="button" data-pump-method-more="1">Load 10 more ('+(visible.length-limit)+' remaining)</button>':'')+
 '<p class="pump-caveat">GP/hour is only a hypothetical scenario at your chosen action rate, not a verified achievable rate. GE buy limits are shown when known. Daily trading quantity is not order-book liquidity. <a href="'+OFFICIAL_VOLUME_URL+'" target="_blank" rel="noopener noreferrer">Check Jagex official Most Traded (7 days) ↗</a></p></section>';
}
