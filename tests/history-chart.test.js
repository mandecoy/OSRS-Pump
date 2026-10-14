import test from 'node:test';
import assert from 'node:assert/strict';
import {WINDOWS,selectWindow,measure,pointXY,detailsHTML,renderHistoryChart} from '../history-chart.js';
const now=1_780_000_000;
const p=(offset,h,l,v1=0,v2=0)=>({timestamp:now-offset,avgHighPrice:h,avgLowPrice:l,highPriceVolume:v1,lowPriceVolume:v2});
test('day/week/month/quarter use real publicly available Wiki bucket intervals',()=>{
 assert.deepEqual(Object.values(WINDOWS).map(w=>w.step),['5m','1h','6h','24h']);
 assert.deepEqual(Object.values(WINDOWS).map(w=>w.seconds),[86400,604800,2592000,7776000]);
});
test('range selection sorts observations, handles sparse data, enforces lookback',()=>{
 const data=[p(8*86400,400,380),p(200,200,180),p(3*86400,250,230),p(30*86400+1000,900,850)];
 assert.deepEqual(selectWindow(data,'day',now).map(x=>x.avgHighPrice),[200]);
 assert.deepEqual(selectWindow(data,'week',now).map(x=>x.avgHighPrice),[250,200]);
 assert.deepEqual(selectWindow(data,'month',now).map(x=>x.avgHighPrice),[400,250,200]);
});
test('GP chart coordinates and axis bounds match available source values',()=>{
 const pts=[p(1000,1300,1100),p(0,1500,1200)];
 const bounds=measure(pts),a=pointXY(pts[0],bounds),b=pointXY(pts[1],bounds);
 assert.ok(bounds.high>1500&&bounds.low<1100);
 assert.ok(a.x<b.x&&b.high<a.low);
});
test('tap detail shows interval price averages and both volume sides',()=>{
 const html=detailsHTML(p(0,1200,1100,27,18),'day');
 assert.match(html,/1,200 gp/);
 assert.match(html,/1,100 gp/);
 assert.match(html,/45/);
 assert.match(html,/High-side units/);
 assert.match(html,/Low-side units/);
});
test('render chart includes GP labels, accessibility, and selectable cursor',()=>{
 const html=renderHistoryChart([p(3600,2000,1800,50,12),p(0,2200,1900,40,10)],'week');
 assert.match(html,/gp/);
 assert.match(html,/pumpChartPlot/);
 assert.match(html,/pumpChartCursor/);
 assert.match(html,/pumpPointDetails/);
});
test('invalid and missing values are not shown as zero GP',()=>{
 const html=detailsHTML({timestamp:now,avgHighPrice:null,avgLowPrice:100,highPriceVolume:null,lowPriceVolume:null},'day');
 assert.match(html,/—/);
 assert.doesNotMatch(html,/0 gp/);
});
