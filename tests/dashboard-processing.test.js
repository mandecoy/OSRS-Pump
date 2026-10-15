import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HERBS,RECIPES,recipeEvaluation,evaluateRecipes,capacity} from '../processing.js';
import {HOME_WIDGETS,normalizedOrder,home} from '../dashboard.js';

const now=Math.floor(Date.now()/1000);
const mapping=[
 {id:1,name:'Grimy guam leaf',limit:10000},
 {id:2,name:'Guam leaf',limit:12000},
 {id:3,name:'Vial of water',limit:30000},
 {id:4,name:'Guam potion (unf)',limit:2000}
];
const latest={data:{
 1:{high:100,low:80,highTime:now,lowTime:now},
 2:{high:140,low:138,highTime:now,lowTime:now},
 3:{high:6,low:4,highTime:now,lowTime:now},
 4:{high:210,low:190,highTime:now,lowTime:now}
}};
const day={data:{4:{highPriceVolume:1350,lowPriceVolume:650}}};
test('30 verified public recipes, including two-input unfinished potions',()=>{
 assert.equal(HERBS.length,15);assert.ok(RECIPES.length>=80);
 assert.equal(RECIPES.filter(r=>r.kind==='Cleaning').length,15);
 assert.equal(RECIPES.filter(r=>r.kind==='Unfinished potions').length,15);
 assert.ok(RECIPES.every(r=>r.source.startsWith('https://oldschool.runescape.wiki/w/')));
});
test('clean herb processing: instant-buy inputs, low-side output, sale tax',()=>{
 const r=RECIPES.find(x=>x.output==='Guam leaf'&&x.kind==='Cleaning');
 const v=recipeEvaluation(r,mapping,latest,day);
 assert.equal(v.cost,100);assert.equal(v.afterTax,136);assert.equal(v.net,36);
 assert.equal(v.limit,10000);assert.equal(v.roi,36);assert.equal(v.complete,true);
});
test('unfinished potion: two ingredient costs and output tax, 24h units',()=>{
 const r=RECIPES.find(x=>x.output==='Guam potion (unf)');
 const v=recipeEvaluation(r,mapping,latest,day);
 assert.equal(v.cost,146);assert.equal(v.afterTax,187);assert.equal(v.net,41);
 assert.equal(v.dayVolume,2000);
 assert.equal(capacity(v,1000,1500).maxQty,6);
 assert.equal(capacity(v,1000,1500).hourProfit,61500);
});
test('missing quote never treated as free input or guaranteed GP profit',()=>{
 const r=RECIPES.find(x=>x.output==='Guam potion (unf)');
 const v=recipeEvaluation(r,mapping,{data:{4:latest.data[4]}},day);
 assert.equal(v.complete,false);assert.equal(v.net,null);assert.equal(v.cost,null);
});
test('eight unique customizable home widgets with stable reorder',()=>{
 assert.equal(HOME_WIDGETS.length,8);
 assert.equal(new Set(HOME_WIDGETS.map(x=>x.id)).size,8);
 const order=normalizedOrder(['watch','budget','watch','unknown']);
 assert.deepEqual(order.slice(0,2),['watch','budget']);
 assert.equal(order.length,8);
});
test('dashboard HTML renders budget and all eight widgets by default',()=>{
 const user={homeWidgets:normalizedOrder(),homeHidden:[],homeRank:'net',homeLoad:5,
 tradingGp:10000,homeCustomize:false,watchlist:[],alerts:[],trades:[]};
 const h=home({rows:[],user,alchRows:[],recipes:[]});
 assert.match(h,/Your trading capital/);
 assert.match(h,/Processing/);
 assert.equal((h.match(/data-home-widget=/g)||[]).length,8);
});
test('native Android back button uses SPA history and exit confirmation',()=>{
 const native=readFileSync(new URL('../android/app/src/main/java/com/mandecoy/osrspump/MainActivity.java',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(native,/OSRSPumpNavigateBack/);
 assert.match(native,/Exit OSRS Pump/);
 assert.match(browser,/function goBack\(/);
 assert.match(browser,/routeStack\.pop\(\)/);
});

import {METHOD_CATEGORIES,ADDITIONAL_RECIPES,OFFICIAL_VOLUME_URL} from '../processing.js';
test('additional recipe categories cover planks, smelting, smithing, sets, tablets, jewellery',()=>{
 const expected=['Making planks','Smelting bars','Smithing products','Combining item sets','Teleport tablets','Jewellery crafting'];
 for(const type of expected)assert.ok(ADDITIONAL_RECIPES.some(r=>r.kind===type),type);
 assert.equal(new Set(METHOD_CATEGORIES.map(x=>x[0])).size,8);
 assert.ok(OFFICIAL_VOLUME_URL.startsWith('https://secure.runescape.com/m=itemdb_oldschool'));
});
test('plank sawmill fee correctly added to input cost without double-tax',()=>{
 const method=ADDITIONAL_RECIPES.find(x=>x.output==='Oak plank');
 const t=Math.floor(Date.now()/1000);
 const mapping=[{id:101,name:'Oak logs'},{id:102,name:'Oak plank'}];
 const latest={data:{101:{high:60,highTime:t},102:{low:400,lowTime:t}}};
 const result=recipeEvaluation(method,mapping,latest);
 assert.equal(result.cost,310);assert.equal(result.afterTax,392);assert.equal(result.net,82);
});
test('15 nails output tax applies per item, not per batch',()=>{
 const method=ADDITIONAL_RECIPES.find(x=>x.output==='Steel nails');
 const t=Math.floor(Date.now()/1000);
 const result=recipeEvaluation(method,[{id:1,name:'Steel bar'},{id:2,name:'Steel nails'}],{data:{1:{high:200,highTime:t},2:{low:100,lowTime:t}}});
 assert.equal(result.afterTax,1470);assert.equal(result.net,1270);assert.equal(result.cost,200);
});
test('recipes with no public quote cannot invent profit or total cash',()=>{
 const method=ADDITIONAL_RECIPES.find(x=>x.output==='Varrock teleport');
 const result=recipeEvaluation(method,[],{data:{}});
 assert.equal(result.net,null);assert.equal(result.complete,false);
});
