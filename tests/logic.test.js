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

import {tradeSize,historical24h,riskSignals} from '../logic.js';
test('trade size respects cash, 4h limit, floor tax and 5m GE tax cap',()=>{
 const x=tradeSize(5000,1000,1200,'Abyssal whip',3);
 assert.equal(x.affordable,5);assert.equal(x.quantity,3);assert.equal(x.taxEach,24);
 assert.equal(x.profit,528);assert.equal(x.spend,3000);assert.equal(x.unused,2000);
 const y=tradeSize(2_000_000_000,100_000_000,500_000_000,'Twisted bow',2);
 assert.equal(y.taxEach,5_000_000);assert.equal(y.quantity,2);
 assert.equal(tradeSize(2000,1000,1200,'Old school bond',null).taxEach,0);
 assert.equal(tradeSize(200,0,100),null);
 assert.equal(tradeSize(-1,100,120),null);
 assert.equal(tradeSize(1000,100,120,'Test').limitKnown,false);
});
test('sampled 24h lows/highs and midpoint percentage change use time cutoff',()=>{
 const now=1_800_000_000_000, sec=now/1000;
 const h=historical24h([
 {timestamp:sec-90000,avgLowPrice:1,avgHighPrice:2},
 {timestamp:sec-3600,avgLowPrice:100,avgHighPrice:120},
 {timestamp:sec-100,avgLowPrice:130,avgHighPrice:150}
 ],now);
 assert.equal(h.samples,2);assert.equal(h.low,100);assert.equal(h.high,150);
 assert.ok(Math.abs(h.changePct-(140/110-1)*100)<1e-9);
 assert.equal(historical24h([],now).changePct,null);
});
test('reliability flags identify stale, thin and unusual flips',()=>{
 const r={age:250,v1:5,dayVol:50,roi:.4,buy:100,sell:145,net:38};
 const flags=riskSignals(r);assert.equal(flags.level,'high');
 assert.ok(flags.flags.includes('Stale quotes'));assert.ok(flags.flags.includes('Unusual margin'));
 assert.equal(riskSignals({age:10,v1:100,dayVol:1000,roi:.04,buy:100,sell:106,net:4}).level,'normal');
});
