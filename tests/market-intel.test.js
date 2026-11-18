import test from 'node:test';
import assert from 'node:assert/strict';
import {alertValue,alertDisplay,sizingCard,watchCard} from '../market-intel.js';
const now=Date.now()/1000;
const mind={id:558,name:'Mind rune',icon:'Mind rune.png',buy:4,sell:5,limit:13000,net:1,roi:.25,
 v1:200,dayVol:3000,age:4,flipModel:'hardcore-activity-v2',flipRecommended:true,
 flipBuy:4,flipSell:5,flipNet:1,flipRoi:.25,flipTax:0,flipUnits:20,flipBatchProfit:20,
 flipInvestment:80,flipLimitKnown:true,flipDayHighVolume:1000,flipDayLowVolume:2000,flipFlags:[]};
test('sizer displays 1 GP rune flips, real volume and budget',()=>{
 const h=sizingCard(mind,1000);
 assert.match(h,/Flip size & volume/);
 assert.match(h,/After-tax margin/);
 assert.match(h,/1 gp/);
 assert.match(h,/Volume-capped units/);
 assert.match(h,/20 gp/);
});
test('watchlist displays observed margin, volume and history',()=>{
 const h=watchCard(mind,{summary:{low:3,high:5,changePct:2.5}},1000);
 assert.match(h,/Mind rune/);assert.match(h,/24h low/);
 assert.match(h,/24h trade volume/);assert.match(h,/3,000/);
 assert.match(h,/Net margin/);assert.match(h,/1 gp/);
});
test('alerts use configured data and skip stale quote alerts',()=>{
 const hs={summary:{changePct:-3.5,updatedAt:now}};
 assert.equal(alertValue({metric:'volume24'},mind,hs),3000);
 assert.equal(alertValue({metric:'net'},mind,hs),1);
 assert.equal(alertValue({metric:'change24'},mind,hs),-3.5);
 assert.equal(alertValue({metric:'buy'},{...mind,age:450},hs),null);
 assert.match(alertDisplay({metric:'change24',rule:'below',target:-3}),/-3\.00%/);
});
