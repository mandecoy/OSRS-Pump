import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WINDOWS} from '../history-chart.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=read('server.js'),android=read('android/app/src/main/java/com/mandecoy/osrspump/MainActivity.java');
const app=read('app.js'),dashboard=read('dashboard.js');
test('Android and server proxy Hardcore Worlds only',()=>{
 assert.match(server,/https:\/\/prices\.runescape\.wiki\/api\/v2\/osrs-hc/);
 assert.match(android,/https:\/\/prices\.runescape\.wiki\/api\/v2\/osrs-hc\//);
 assert.doesNotMatch(server,/api\/v1\/osrs(?:['/])/);
 assert.doesNotMatch(android,/api\/v1\/osrs(?:['/])/);
 assert.match(server,/\/api\/24h/);
 assert.match(android,/\/api\/24h/);
});
test('chart range uses Hardcore v2 lookback',()=>{
 assert.match(server,/timeseries\?id=.+lookback=/);
 assert.match(android,/timeseries\?id=.+lookback=/);
 assert.match(app,/timeseries\?id='[\s\S]{0,50}&lookback=/);
 assert.deepEqual(Object.values(WINDOWS).map(w=>w.lookback),['24h','7d','30d','6m']);
});
test('HC portfolio remains isolated from regular game',()=>{
 assert.match(app,/const KEY='osrs-pump-hc-v1'/);
 assert.match(app,/const MARKET='osrs-hc'/);
 assert.match(app,/data\.market!==MARKET/);
 assert.match(dashboard,/HARDCORE WORLDS/);
});
test('flipping-only app contains no money-making functionality',()=>{
 assert.doesNotMatch(app,/PROC\.evaluateRecipes|V03\.alchemyRows|function renderMoney/);
 assert.doesNotMatch(read('index.html'),/data-page="money"/);
 assert.match(app,/SCREEN\.assessMarket/);
 assert.match(app,/fetchJson\('24h'\)/);
});
