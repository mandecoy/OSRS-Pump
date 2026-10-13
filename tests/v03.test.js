import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGp,validate,applyFilters,decorate,categoryRows,PRESETS} from '../v03.js';
test('K/M/B formatted price filters',()=>{
 assert.equal(parseGp('200k'),200000);assert.equal(parseGp('1.5m'),1500000);
 assert.equal(parseGp('3B'),3000000000);assert.equal(parseGp(''),null);
 assert.ok(Number.isNaN(parseGp('23kk')));
});
test('reject inverted minimum/maximum ranges',()=>{
 assert.ok(validate({minPrice:100,maxPrice:20}));
 assert.equal(validate({minPrice:0,maxPrice:0}),null);
});
const fake=[
 {id:1,name:'Nature rune',buy:200,sell:250,net:45,roi:.225,v1:1000,age:20,limit:18000,score:90,category:'Runes & teleports',members:false},
 {id:2,name:'Abyssal whip',buy:2000000,sell:2050000,net:9000,roi:.0045,v1:50,age:250,limit:70,score:50,category:'Equipment',members:true}
];
test('filters combine max price, min volume, stale limit and membership',()=>{
 assert.deepEqual(applyFilters(fake,{maxPrice:1000,minVolume:100,maxAge:60,members:'f2p'}).map(r=>r.id),[1]);
 assert.deepEqual(applyFilters(fake,{minPrice:1000000,profitable:true}).map(r=>r.id),[2]);
 assert.equal(applyFilters(fake,{minPrice:0,maxPrice:0}).length,0);
});
test('5m and 24h trade counts are independent and absent stays null',()=>{
 const r=decorate(fake,{data:{1:{avgHighPrice:220,avgLowPrice:200}}},{data:{1:{highPriceVolume:10,lowPriceVolume:20}}},{data:{1:{avgHighPrice:210,avgLowPrice:200,highPriceVolume:500,lowPriceVolume:200}}});
 assert.equal(r[0].fiveVol,30);assert.equal(r[0].dayVol,700);
 assert.equal(r[1].fiveVol,null);assert.equal(r[1].dayVol,null);
});
test('category selectors return real priced items, not invented results',()=>{
 assert.deepEqual(categoryRows(fake,'lowcash').map(x=>x.id),[1]);
 assert.deepEqual(categoryRows(fake,'volume1').map(x=>x.id),[1,2]);
 assert.equal(categoryRows(fake,'herbs').length,0);
 assert.ok(PRESETS.liquid.minVolume>0);
});
