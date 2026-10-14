import test from 'node:test'; import assert from 'node:assert/strict';
import {geTax,flip,analyzeHistory,filterMarket,journalMetrics,volumeOf} from '../logic.js';
test('OSRS 2% GE tax, floor and per-item cap',()=>{assert.equal(geTax(49,'Abyssal whip'),0);assert.equal(geTax(1000,'Abyssal whip'),20);assert.equal(geTax(500_000_000,'Twisted bow'),5_000_000);});
test('tax exempt list applies',()=>{assert.equal(geTax(15000000,'Old school bond'),0);assert.equal(geTax(1000,'Mind rune'),0);});
test('tax-adjusted theoretical flipping profit',()=>{assert.deepEqual(flip(1000,1200,'Abyssal whip'),{buy:1000,sell:1200,tax:24,net:176,roi:.176,spread:200});});
test('no valid flip for missing price',()=>{assert.equal(flip(null,1200),null);assert.equal(flip(0,100),null);});
test('historical quartiles and independent price bounds',()=>{const h=analyzeHistory([{timestamp:1,avgLowPrice:100,avgHighPrice:180,highPriceVolume:2,lowPriceVolume:3},{timestamp:2,avgLowPrice:200,avgHighPrice:280,highPriceVolume:4,lowPriceVolume:6}],'Abyssal whip');assert.equal(h.low24,100);assert.equal(h.high24,280);assert.equal(h.volume,15);});
test('filter min and max price / volume and profitable',()=>{const r=[{name:'A',buy:100,net:20,roi:.2,v1:200,age:10,score:80,category:'Other',members:false},{name:'B',buy:200,net:20,roi:.1,v1:20,age:10,score:80,category:'Other',members:false}];assert.equal(filterMarket(r,{minPrice:50,maxPrice:150,minVolume:100,profitable:true}).length,1);});
test('journal tracks partial sales and 2% GE tax',()=>{const a=journalMetrics([{id:1,name:'Whip',qty:10,soldQty:5,buyPrice:1000,sellPrice:1200}],{1:{low:1100}});assert.equal(a.realized,880);assert.equal(a.locked,5000);assert.equal(a.unrealized,390);const b=journalMetrics([{id:1,name:'Whip',qty:10,soldQty:5,buyPrice:1000,sellPrice:1200}],{1:{buy:1100}});assert.equal(b.unrealized,390);});

import {DEFAULT_FILTER,applyFilters,categoryRows,alchemyRows} from '../v03.js';
test('market discovery defaults do not hide older or low-volume items',()=>{
 assert.equal(DEFAULT_FILTER.maxAge,undefined);
 assert.equal(DEFAULT_FILTER.profitable,false);
 const rows=Array.from({length:25},(_,i)=>({id:i+1,name:'Item '+i,buy:50000,net:200+i,roi:.03,v1:0,age:600,score:50,dayVol:2,dayGapPct:1,dayGapGp:10,members:false}));
 assert.equal(categoryRows(rows,'margins').length,25);
 assert.equal(applyFilters(categoryRows(rows,'margins'),DEFAULT_FILTER).length,25);
 assert.equal(applyFilters(rows,{...DEFAULT_FILTER,maxPrice:100000}).length,25);
 assert.equal(applyFilters(rows,{...DEFAULT_FILTER,maxPrice:1000}).length,0);
});
test('alchemy includes items without low trade, costs nature rune and does not charge GE sale tax',()=>{
 const now=Math.floor(Date.now()/1000);
 const mapping=[{id:1,name:'Nature rune'},{id:2,name:'Alch item',highalch:1000,limit:70},{id:3,name:'Too expensive',highalch:200}];
 const latest={data:{1:{high:100,highTime:now},2:{high:500,highTime:now},3:{high:300,highTime:now}}};
 const day={data:{2:{highPriceVolume:120,lowPriceVolume:15}}};
 const result=alchemyRows(mapping,latest,{data:{}},{data:{}},day);
 assert.equal(result.length,1);assert.equal(result[0].name,'Alch item');
 assert.equal(result[0].net,400);assert.equal(result[0].natureCost,100);
 assert.equal(result[0].dayVol,135);assert.equal(result[0].alchMode,true);
});
