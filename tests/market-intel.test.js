import test from 'node:test';
import assert from 'node:assert/strict';
import {alertValue,alertDisplay,riskBadge,sizingCard,watchCard} from '../market-intel.js';

const now=Date.now()/1000;
const item={id:4151,name:'Abyssal whip',icon:'Abyssal whip.png',buy:1000,sell:1200,limit:70,net:176,roi:.176,v1:500,dayVol:5000,age:4};
test('sizer card shows cash cap, four-hour limit and after-tax potential',()=>{
 const html=sizingCard(item,5000);
 assert.match(html,/Trade-size calculator/);
 assert.match(html,/Units affordable/);
 assert.match(html,/4h GE buy limit/);
 assert.match(html,/880 gp/);
});
test('smart watchlist exposes sampled highs lows change and volume',()=>{
 const html=watchCard(item,{summary:{low:950,high:1320,changePct:2.5}},5000);
 assert.match(html,/24h low/);assert.match(html,/950 gp/);
 assert.match(html,/1,320 gp/);assert.match(html,/\+2\.50%/);
 assert.match(html,/5,000/);assert.match(html,/880 gp/);
});
test('market alerts choose configured metric and skip stale quotes',()=>{
 const h={summary:{changePct:-3.5,updatedAt:now}};
 assert.equal(alertValue({metric:'volume24'},item,h),5000);
 assert.equal(alertValue({metric:'net'},item,h),176);
 assert.equal(alertValue({metric:'change24'},item,h),-3.5);
 assert.equal(alertValue({metric:'buy'}, {...item,age:450},h),null);
 assert.equal(alertValue({metric:'change24'},item,{summary:{changePct:-3.5,updatedAt:now-14000}}),null);
 assert.match(alertDisplay({metric:'change24',rule:'below',target:-3}),/-3\.00%/);
});
test('risk badge warns on stale or unusual margins',()=>{
 const risk=riskBadge({...item,age:300,roi:.4});
 assert.match(risk,/Stale quotes/);assert.match(risk,/Unusual margin/);
});
