import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFlip,assessMarket,readyFlip,rerankMarket,recommended} from '../flip-scanner.js';
import {applyFilters,DEFAULT_FILTER,categoryRows,flips,markets,CATEGORIES} from '../v03.js';
const now=1_800_000_000_000,t=Math.floor(now/1000);
const sample=(changes={})=>({id:558,name:'Mind rune',buy:3,sell:5,net:2,roi:2/3,limit:13000,
 highTime:t-60,lowTime:t-80,v1:1200,dayVol:28000,age:2,category:'Runes & teleports',
 members:false,...changes});
const hour={highPriceVolume:400,lowPriceVolume:600};
const five={highPriceVolume:20,lowPriceVolume:30};
const day={highPriceVolume:10000,lowPriceVolume:18000};
const run=(row=sample(),d=day,budget=1000000)=>readyFlip(assessFlip(row,hour,five,d,now),budget);
test('Mind rune 3-to-5 aftertax spread and volume-sized profitability shown',()=>{
 const r=run();
 assert.equal(r.flipBuy,3);assert.equal(r.flipSell,5);
 assert.equal(r.flipTax,0);assert.equal(r.flipNet,2);
 assert.equal(r.flipRoi,2/3);assert.equal(r.flipUnits,1000);
 assert.equal(r.flipBatchProfit,2000);
 assert.ok(r.flipRank>0);assert.equal(r.flipRecommended,true);
});
test('even a 1gp-per-item flip must remain visible',()=>{
 const r=run(sample({buy:4,net:1,roi:.25}),{highPriceVolume:20,lowPriceVolume:20});
 assert.equal(r.flipNet,1);assert.equal(r.flipUnits,2);
 assert.equal(r.flipRecommended,true);
 assert.equal(applyFilters([r],DEFAULT_FILTER).length,1);
 assert.equal(categoryRows([r],'roi').length,1);
});
test('quiet market and older quotes remain searchable, not hidden',()=>{
 const r=run(sample({highTime:t-400000,lowTime:t-400000}),null);
 assert.equal(r.flipUnits,100);assert.equal(r.flipGrade,'No 24h trades');
 assert.equal(r.flipRecommended,true); // hourly two-sided trades can still support sizing
 assert.equal(applyFilters([r],DEFAULT_FILTER).length,1);
 assert.equal(applyFilters([r],{...DEFAULT_FILTER,search:'mind rune'}).length,1);
});
test('activity is an optional filter, not a default exclusion',()=>{
 const live=run(),quiet=run(sample({id:999,name:'Quiet sword'}),null);
 assert.equal(applyFilters([quiet,live],DEFAULT_FILTER).length,2);
 assert.deepEqual(applyFilters([quiet,live],{...DEFAULT_FILTER,activity:'two-sided'}).map(r=>r.id),[558]);
});
test('ranking rewards feasible GP profit and two-sided activity, without hard dollar gates',()=>{
 const active=run(),quiet=run(sample({id:555,name:'One sale item',buy:100,sell:1000,net:882,roi:8.82}),{highPriceVolume:1,lowPriceVolume:1});
 assert.ok(active.flipRank>quiet.flipRank);
 assert.deepEqual(recommended([quiet,active]).map(r=>r.id),[558,555]);
});
test('re-ranking for a smaller budget changes sized profit, not raw margin',()=>{
 const item=run();
 const next=rerankMarket([item],3)[0];
 assert.equal(next.flipNet,2);assert.equal(next.flipUnits,1);
 assert.equal(next.flipBatchProfit,2);
});
test('Hardcore data 1h,5m,24h is used and no regular world fallback',()=>{
 const rows=assessMarket([sample()],{data:{558:hour}},{data:{558:five}},{data:{558:day}},1000000,now);
 assert.equal(rows[0].flipDayHighVolume,10000);
 assert.equal(rows[0].flipDayLowVolume,18000);
 assert.equal(rows[0].flipHourHighVolume,400);
 assert.equal(rows[0].flipFiveVolume,50);
});
test('Money Making and Alchemy categories are removed',()=>{
 assert.equal(CATEGORIES.some(c=>c.group==='Money Making'||c.id==='alch'||c.id==='processing'),false);
});
