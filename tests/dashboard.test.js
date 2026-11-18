import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOME_WIDGETS,normalizedOrder,home} from '../dashboard.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('dashboard is six flipping-only widgets with no processing methods',()=>{
 assert.equal(HOME_WIDGETS.length,6);
 assert.equal(HOME_WIDGETS.some(w=>/methods|money|process|alchemy/i.test(w.id+' '+w.title)),false);
 const a=normalizedOrder(['watch','top','watch','unknown']);
 assert.equal(a.length,6);assert.deepEqual(a.slice(0,2),['watch','top']);
});
test('dashboard renders observed 1GP rune spreads, ROI and four primary sections',()=>{
 const row={id:558,name:'Mind rune',buy:4,sell:5,net:1,roi:.25,v1:100,dayVol:3000,
  flipGrade:'Trading',flipDayHighVolume:1100,flipDayLowVolume:1900,flipUnits:20,flipRank:40,
  flipBatchProfit:20};
 const user={page:'dashboard',homeWidgets:normalizedOrder(),homeHidden:['movers','calculator'],
  tradingGp:1000,homeCustomize:false,homeRank:'net',homeLoad:5,watchlist:[558],trades:[]};
 const html=home({rows:[row],user});
 assert.match(html,/Mind rune/);assert.match(html,/\+1 gp/);assert.match(html,/25\.0% ROI/);
 assert.equal((html.match(/data-home-widget=/g)||[]).length,4);
 assert.doesNotMatch(html,/Alchemy|Processing|Money.Making/);
});
test('Android back button still navigates back, not straight to exit',()=>{
 const native=read('android/app/src/main/java/com/mandecoy/osrspump/MainActivity.java');
 const app=read('app.js');
 assert.match(native,/OSRSPumpNavigateBack/);
 assert.match(native,/Exit OSRS Pump/);
 assert.match(app,/function goBack\(/);
});
test('Money Making code and menu are removed',()=>{
 assert.doesNotMatch(read('index.html'),/data-page="money"/);
 assert.doesNotMatch(read('app.js'),/renderMoney\(|evaluateRecipes\(|alchemyRows\(/);
 assert.doesNotMatch(read('dashboard.js'),/data-go="money"|case 'methods'/);
});
