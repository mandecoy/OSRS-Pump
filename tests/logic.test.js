import test from 'node:test';import assert from 'node:assert/strict';
import {geTax,flip,analyzeHistory,filterMarket,journalMetrics,tradeSize,historical24h,riskSignals} from '../logic.js';
import {DEFAULT_FILTER,applyFilters,categoryRows} from '../v03.js';
test('GE sale tax floors to zero on small GP values and 5m cap',()=>{
 assert.equal(geTax(5,'Mind rune'),0);assert.equal(geTax(49,'Abyssal whip'),0);
 assert.equal(geTax(1000,'Abyssal whip'),20);assert.equal(geTax(500000000,'Twisted bow'),5000000);
});
test('A 1 GP flip remains after-tax profitable',()=>{
 const result=flip(4,5,'Mind rune');
 assert.equal(result.net,1);assert.equal(result.roi,.25);
});
test('no valid flip for missing price',()=>{
 assert.equal(flip(null,1200),null);assert.equal(flip(0,100),null);
});
test('market lists include low-volume items without hard cutoffs',()=>{
 const rows=Array.from({length:25},(_,i)=>({id:i+1,name:'Item '+i,buy:50000,net:1,roi:.00002,
  v1:0,age:600,dayVol:0,members:false,flipRank:0}));
 assert.equal(applyFilters(rows,DEFAULT_FILTER).length,25);
 assert.equal(categoryRows(rows,'margins').length,25);
 assert.equal(applyFilters(rows,{...DEFAULT_FILTER,maxPrice:1000}).length,0);
});
test('journal tracks partial sales and correct tax',()=>{
 const a=journalMetrics([{id:1,name:'Whip',qty:10,soldQty:5,buyPrice:1000,sellPrice:1200}],{1:{buy:1100}});
 assert.equal(a.realized,880);assert.equal(a.locked,5000);assert.equal(a.unrealized,390);
});
test('historical quartiles and volume are computed from samples',()=>{
 const h=analyzeHistory([{timestamp:1,avgLowPrice:100,avgHighPrice:180,highPriceVolume:2,lowPriceVolume:3},
  {timestamp:2,avgLowPrice:200,avgHighPrice:280,highPriceVolume:4,lowPriceVolume:6}],'Mind rune');
 assert.equal(h.low24,100);assert.equal(h.high24,280);assert.equal(h.volume,15);
});
test('trade size respects budget and published buy limit',()=>{
 const x=tradeSize(5000,1000,1200,'Abyssal whip',3);
 assert.equal(x.quantity,3);assert.equal(x.taxEach,24);assert.equal(x.profit,528);
 assert.equal(tradeSize(200,0,100),null);
});
test('sampled historical 24h high and low',()=>{
 const now=1_800_000_000_000,sec=now/1000;
 const h=historical24h([{timestamp:sec-3600,avgLowPrice:100,avgHighPrice:120},
  {timestamp:sec-100,avgLowPrice:130,avgHighPrice:150}],now);
 assert.equal(h.low,100);assert.equal(h.high,150);
});
test('riskSignals flags are advisory, never default filter requirements',()=>{
 const r={age:300,v1:5,dayVol:0,roi:.4,buy:4,sell:5,net:1};
 assert.ok(riskSignals(r).flags.length>0);
 assert.equal(applyFilters([{id:1,name:'Mind rune',...r}],DEFAULT_FILTER).length,1);
});
