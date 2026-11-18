import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGp,validate,applyFilters,decorate,categoryRows,PRESETS,CATEGORIES} from '../v03.js';
test('K/M/B formatted price filters',()=>{
 assert.equal(parseGp('200k'),200000);
 assert.equal(parseGp('1.5m'),1500000);
 assert.equal(parseGp('3B'),3000000000);
 assert.equal(parseGp(''),null);
 assert.ok(Number.isNaN(parseGp('23kk')));
});
test('reject inverted min-max filters',()=>{assert.ok(validate({minPrice:100,maxPrice:20}));assert.equal(validate({minPrice:0,maxPrice:0}),null);});
const fake=[
 {id:558,name:'Mind rune',buy:4,sell:5,net:1,roi:.25,v1:1200,dayVol:10000,age:20,limit:13000,flipRank:68,
  flipDayHighVolume:5000,flipDayLowVolume:5000,flipHourHighVolume:200,flipHourLowVolume:400,category:'Runes & teleports',members:false},
 {id:4151,name:'Abyssal whip',buy:2000000,sell:2050000,net:9000,roi:.0045,v1:0,dayVol:1,age:400,limit:70,flipRank:2,
  flipDayHighVolume:1,flipDayLowVolume:0,category:'Equipment',members:true}
];
test('search works for low-margin runes',()=>{
 assert.deepEqual(applyFilters(fake,{search:'mind rune'}).map(x=>x.id),[558]);
 assert.deepEqual(categoryRows(fake,'runes').map(x=>x.id),[558]);
});
test('filters combine max price, minimum volume, age and membership',()=>{
 assert.deepEqual(applyFilters(fake,{maxPrice:1000,minVolume:100,maxAge:60,members:'f2p'}).map(x=>x.id),[558]);
 assert.deepEqual(applyFilters(fake,{minPrice:1000000,profitable:true}).map(x=>x.id),[4151]);
 assert.equal(applyFilters(fake,{activity:'two-sided'}).length,1);
});
test('24-hour aggregate volumes are distinct from five-minute volumes',()=>{
 const d=decorate(fake,{data:{}},{data:{558:{highPriceVolume:5,lowPriceVolume:10}}},
  {data:{558:{highPriceVolume:3000,lowPriceVolume:4000}}});
 assert.equal(d[0].fiveVol,15);assert.equal(d[0].dayVol,7000);
 assert.equal(d[1].fiveVol,null);assert.equal(d[1].dayVol,null);
});
test('all categories contain no money making and presets permit all items',()=>{
 assert.equal(CATEGORIES.some(c=>c.group==='Money Making'),false);
 assert.deepEqual(categoryRows(fake,'all').map(x=>x.id),[558,4151]);
 assert.equal(PRESETS.all.activity,'all');
});
