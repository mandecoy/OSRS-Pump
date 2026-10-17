import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFlip,assessMarket,readyFlip,recommended,rerankMarket,FLIP_POLICY} from '../flip-scanner.js';
import {applyFilters,DEFAULT_FILTER,categoryRows} from '../v03.js';

const now=1_800_000_000_000;
const ts=Math.floor(now/1000);
function healthy(overrides={}){
 const row={id:1,name:'Test armour',buy:1000,sell:1200,highTime:ts-40,lowTime:ts-70,limit:1000,age:1,net:176,roi:.176,
 v1:2000,dayVol:6000,...overrides};
 const H={avgHighPrice:1200,avgLowPrice:1000,highPriceVolume:1000,lowPriceVolume:1000};
 const F={avgHighPrice:1200,avgLowPrice:1000,highPriceVolume:25,lowPriceVolume:25};
 const D={avgHighPrice:1200,avgLowPrice:1000,highPriceVolume:3000,lowPriceVolume:3000};
 return {row,H,F,D};
}
function evaluated({row,H,F,D}=healthy(),budget=1000000){return readyFlip(assessFlip(row,H,F,D,now),budget);}
test('conservative estimate has lower net than raw and is taxed',()=>{
 const x=evaluated();
 assert.equal(x.flipEligible,true);
 assert.equal(x.flipRecommended,true);
 assert.equal(x.flipBuy,1010);
 assert.equal(x.flipSell,1190);
 assert.equal(x.flipNet,157);
 assert.ok(x.flipRoi>.01&&x.flipRoi<.18);
 assert.equal(x.flipUnits,30);
 assert.equal(x.flipBatchProfit,4710);
 assert.ok(x.flipRank>0);
 assert.ok(x.executionScore>0&&x.executionScore<=100);
});
test('one-gp after-tax profit must not surface in recommended flips',()=>{
 const x=healthy({buy:1000,sell:1001,name:'Mind rune'});
 x.H.avgHighPrice=1001;x.F.avgHighPrice=1001;
 const out=evaluated(x);
 assert.equal(out.flipRecommended,false);
 assert.ok(out.flipReasons.includes('Trivial after-tax margin'));
});
test('thin markets rejected even with apparently huge profitable price gap',()=>{
 const x=healthy();x.H.highPriceVolume=1;x.H.lowPriceVolume=0;x.D.highPriceVolume=12;x.D.lowPriceVolume=1;
 const out=evaluated(x);
 assert.equal(out.flipRecommended,false);
 assert.ok(out.flipReasons.includes('Insufficient two-sided 1h trades'));
 assert.ok(out.flipReasons.includes('Insufficient 24h trades'));
});
test('anomalous high spread rejected independently of net profit',()=>{
 const x=healthy({sell:4000});x.H.avgHighPrice=4000;x.F.avgHighPrice=4000;
 const out=evaluated(x);
 assert.equal(out.flipRecommended,false);
 assert.ok(out.flipReasons.includes('Unusual observed spread'));
});
test('quotes far apart or stale or missing paired averages not recommended',()=>{
 const stale=healthy({lowTime:ts-7200});const old=evaluated(stale);
 assert.equal(old.flipRecommended,false);
 assert.ok(old.flipReasons.includes('Stale quote'));
 const sep=healthy({lowTime:ts-2000});
 assert.ok(evaluated(sep).flipReasons.includes('Trades too far apart'));
 const data=healthy();delete data.H.avgLowPrice;
 assert.ok(evaluated(data).flipReasons.includes('Missing recent paired averages'));
});
test('minimum meaningful trade size protects against false tiny flips',()=>{
 const x=evaluated(healthy(),1000);assert.equal(x.flipRecommended,false);
 assert.ok(x.flipReasons.includes('Insufficient budget-sized profit'));
});
test('default filter only surfaces recommended candidates, risk research opt-in',()=>{
 const good=evaluated(healthy());
 const bad=evaluated(healthy({highTime:ts-40000,lowTime:ts-40000}));
 assert.equal(applyFilters([good,bad],DEFAULT_FILTER).length,1);
 assert.equal(categoryRows([good,bad],'margins').length,1);
 assert.equal(applyFilters([good,bad],{...DEFAULT_FILTER,showRisky:true}).length,2);
});
test('ranked results prioritize feasible after-tax ROI and trade capacity',()=>{
 const good=evaluated(healthy());
 const smaller=healthy({id:2,sell:1160,net:128,roi:.128});
 smaller.H.avgHighPrice=1160;smaller.F.avgHighPrice=1160;
 const other=evaluated(smaller);
 const result=recommended([other,good]);
 assert.equal(result[0].id,good.id);
 assert.ok(result[0].flipRoi>result[1].flipRoi);
});
test('budget re-ranking reduces plausible profit and does not keep stale scores',()=>{
 const g=evaluated(healthy());
 const reranked=rerankMarket([g],500);
 assert.equal(reranked[0].flipRecommended,false);
 assert.equal(reranked[0].flipBatchProfit,0);
 assert.ok(FLIP_POLICY.minNetPerItemGp>=5);
});
