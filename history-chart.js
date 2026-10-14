/* Public OSRS Wiki /timeseries chart: bucket averages and completed transaction volume.
 * Never call these averages individual-trade extremes or a live order book. */
export const WINDOWS=Object.freeze({
  day:{label:'1 Day',title:'24h',seconds:86400,step:'5m'},
  week:{label:'7 Days',title:'7d',seconds:7*86400,step:'1h'},
  month:{label:'30 Days',title:'30d',seconds:30*86400,step:'6h'},
  quarter:{label:'90 Days',title:'90d',seconds:90*86400,step:'24h'}
});
const WIDTH=640,HEIGHT=252,PAD=12;
const valid=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n))&&Number(n)>0;
const safeNum=n=>valid(n)?Number(n):null;
const plain=n=>Number.isFinite(n)?Math.round(n).toLocaleString('en-US'):'—';
const short=n=>!Number.isFinite(n)?'—':Math.abs(n)>=1e9?(n/1e9).toFixed(2)+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(2)+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1)+'K':plain(n);
export function selectWindow(points,range='day',now=Math.floor(Date.now()/1000)){
 const secs=(WINDOWS[range]||WINDOWS.day).seconds;
 return (Array.isArray(points)?points:[])
   .filter(p=>Number.isFinite(Number(p.timestamp))&&Number(p.timestamp)>=now-secs&&Number(p.timestamp)<=now+300&&(valid(p.avgHighPrice)||valid(p.avgLowPrice)))
   .slice().sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
}
export function measure(points){
 const prices=points.flatMap(p=>[safeNum(p.avgHighPrice),safeNum(p.avgLowPrice)]).filter(x=>x!==null);
 if(!prices.length)return null;
 const minimum=Math.min(...prices),maximum=Math.max(...prices);
 const spread=Math.max(1,maximum-minimum);
 const low=Math.max(0,minimum-spread*.08),high=maximum+spread*.08;
 return {low,high,first:Number(points[0].timestamp),last:Number(points[points.length-1].timestamp)};
}
export function pointXY(point,bounds){
 const tRange=Math.max(1,bounds.last-bounds.first),pRange=Math.max(1,bounds.high-bounds.low);
 return {
   x:PAD+((Number(point.timestamp)-bounds.first)/tRange)*(WIDTH-PAD*2),
   high:valid(point.avgHighPrice)?HEIGHT-PAD-(Number(point.avgHighPrice)-bounds.low)/pRange*(HEIGHT-PAD*2):null,
   low:valid(point.avgLowPrice)?HEIGHT-PAD-(Number(point.avgLowPrice)-bounds.low)/pRange*(HEIGHT-PAD*2):null
 };
}
function dateLabel(timestamp,range,verbose=false){
 const config=verbose?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:range==='day'?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric'};
 return new Date(Number(timestamp)*1000).toLocaleString('en-US',config);
}
function volume(value){return value===null||value===undefined?'—':plain(Number(value));}
function numberOrDash(value){return valid(value)?plain(Number(value))+' gp':'—';}
export function detailsHTML(point,range){
 if(!point)return '<p>No historical sample selected.</p>';
 const a=point.highPriceVolume,b=point.lowPriceVolume;
 const total=a==null&&b==null?'—':volume((Number(a)||0)+(Number(b)||0));
 return '<div class="pump-chart-detail-time">'+dateLabel(point.timestamp,range,true)+' · '+(WINDOWS[range]||WINDOWS.day).step+' sample</div>'+
 '<div class="pump-chart-detail-grid">'+
 '<span><small>Instant-buy avg (high)</small><strong class="pump-price-high">'+numberOrDash(point.avgHighPrice)+'</strong></span>'+
 '<span><small>Instant-sell avg (low)</small><strong class="pump-price-low">'+numberOrDash(point.avgLowPrice)+'</strong></span>'+
 '<span><small>High-side units</small><strong>'+volume(a)+'</strong></span>'+
 '<span><small>Low-side units</small><strong>'+volume(b)+'</strong></span>'+
 '<span><small>Combined traded units</small><strong>'+total+'</strong></span>'+
 '</div>';
}
export function renderHistoryChart(points,range='day'){
 const bounds=measure(points);
 if(!bounds||points.length<2)return '<div class="pump-chart-no-data">Not enough price observations within this time window. Select a longer period.</div>';
 const yTicks=[0,1,2,3,4].map(i=>bounds.high-(bounds.high-bounds.low)*i/4);
 const grid=yTicks.map((_,i)=>'<line x1="'+PAD+'" x2="'+(WIDTH-PAD)+'" y1="'+(PAD+(HEIGHT-2*PAD)*i/4)+'" y2="'+(PAD+(HEIGHT-2*PAD)*i/4)+'" stroke="#74664e" stroke-opacity=".22" stroke-dasharray="4 6"/>').join('');
 const poly=key=>points.filter(p=>valid(p[key])).map(p=>{const pos=pointXY(p,bounds);return pos.x.toFixed(2)+','+pos[key==='avgHighPrice'?'high':'low'].toFixed(2);}).join(' ');
 const labels=yTicks.map(v=>'<span>'+short(v)+' gp</span>').join('');
 const middle=(bounds.first+bounds.last)/2;
 const last=points[points.length-1];
 return '<div class="pump-chart-layout">'+
 '<div class="pump-chart-ylabels" aria-label="Price in GP">'+labels+'</div>'+
 '<div class="pump-chart-main"><svg id="pumpChartPlot" viewBox="0 0 '+WIDTH+' '+HEIGHT+'" preserveAspectRatio="none" role="img" tabindex="0" aria-label="OSRS price history. Tap a point or use left and right arrow keys to inspect GP prices and completed-trade volumes.">'+
 grid+
 '<polyline points="'+poly('avgHighPrice')+'" fill="none" stroke="#f2b877" stroke-width="3" vector-effect="non-scaling-stroke"/>'+
 '<polyline points="'+poly('avgLowPrice')+'" fill="none" stroke="#65d0ab" stroke-width="3" vector-effect="non-scaling-stroke"/>'+
 '<line id="pumpChartCursor" x1="0" x2="0" y1="0" y2="'+HEIGHT+'" stroke="#f5dfb0" stroke-opacity=".9" stroke-dasharray="4 4" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
 '<circle id="pumpChartHighDot" cx="0" cy="0" r="5" fill="#f2b877" stroke="#1a1711" stroke-width="2"/>'+
 '<circle id="pumpChartLowDot" cx="0" cy="0" r="5" fill="#65d0ab" stroke="#1a1711" stroke-width="2"/>'+
 '<rect width="'+WIDTH+'" height="'+HEIGHT+'" fill="transparent" style="cursor:crosshair"/>'+
 '</svg><div class="pump-chart-xlabels"><span>'+dateLabel(bounds.first,range)+'</span><span>'+dateLabel(middle,range)+'</span><span>'+dateLabel(bounds.last,range)+'</span></div></div></div>'+
 '<div class="pump-chart-legend"><span><b class="pump-dot-high">●</b> Instant-buy avg (high)</span><span><b class="pump-dot-low">●</b> Instant-sell avg (low)</span></div>'+
 '<p class="pump-chart-hint">Tap the graph to inspect exact bucket averages and volumes. Values are completed-trade averages, not pending GE offers.</p>'+
 '<div id="pumpPointDetails" class="pump-chart-details" aria-live="polite">'+detailsHTML(last,range)+'</div>';
}
export function bindHistoryChart(points,range='day'){
 const svg=document.querySelector('#pumpChartPlot'),panel=document.querySelector('#pumpPointDetails');
 if(!svg||!panel||points.length<2)return;
 const bounds=measure(points);let selected=points.length-1;
 const cursor=svg.querySelector('#pumpChartCursor'),highDot=svg.querySelector('#pumpChartHighDot'),lowDot=svg.querySelector('#pumpChartLowDot');
 function show(index){
  selected=Math.max(0,Math.min(points.length-1,index));
  const p=points[selected],xy=pointXY(p,bounds);
  cursor.setAttribute('x1',String(xy.x));cursor.setAttribute('x2',String(xy.x));
  for(const [dot,y] of [[highDot,xy.high],[lowDot,xy.low]]){
   if(y===null){dot.setAttribute('visibility','hidden');}
   else {dot.setAttribute('visibility','visible');dot.setAttribute('cx',String(xy.x));dot.setAttribute('cy',String(y));}
  }
  panel.innerHTML=detailsHTML(p,range);
 }
 svg.addEventListener('pointerdown',e=>{
  const rect=svg.getBoundingClientRect();if(!rect.width)return;
  const ratio=Math.max(0,Math.min(1,((e.clientX-rect.left)/rect.width*WIDTH-PAD)/(WIDTH-2*PAD)));
  const t=bounds.first+ratio*(bounds.last-bounds.first);
  let index=0,dist=Infinity;
  for(let i=0;i<points.length;i++){const d=Math.abs(Number(points[i].timestamp)-t);if(d<dist){dist=d;index=i;}}
  show(index);
 });
 svg.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
   e.preventDefault();show(e.key==='Home'?0:e.key==='End'?points.length-1:selected+(e.key==='ArrowLeft'?-1:1));
  }
 });
 show(selected);
}
