/* UI components for tax-aware trade sizing and transparent market signals. */
import {riskSignals} from './logic.js';
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gp=n=>Number.isFinite(Number(n))?Math.round(Number(n)).toLocaleString('en-US')+' gp':'—';
const units=n=>Number.isFinite(Number(n))?Math.round(Number(n)).toLocaleString('en-US'):'—';
const pc=n=>Number.isFinite(Number(n))?(n>0?'+':'')+Number(n).toFixed(2)+'%':'—';
const tile=(label,value)=>'<div class="pump-watch-cell"><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(value)+'</strong></div>';
export const ALERT_METRICS={
  buy:'Instant-sell price (low)',sell:'Instant-buy price (high)',
  net:'After-tax margin / item',volume24:'24h trade volume',
  change24:'24h sampled midpoint change (%)'
};
export function riskBadge(row){
 const s=riskSignals(row),details=s.flags.length?s.flags.join(' · '):'No major flags in the latest observed data';
 return '<span class="pump-risk pump-risk-'+s.level+'" title="'+escapeHtml(details)+'">'+
   (s.flags.length?'⚠ '+escapeHtml(s.flags.join(' · ')):'✓ No major flags')+'</span>';
}
export function sizingCard(row,budget){
 const cash=Math.max(0,Number(budget)||0),buy=Number(row.buy),sell=Number(row.sell);
 const tax=Number(row.flipTax)||0,qty=Number(row.flipUnits)||0;
 const limit=Number(row.limit)>0?Math.floor(Number(row.limit)):null;
 return '<div class="card" style="margin-top:16px"><div class="section-heading"><h3>Flip size & volume</h3><span class="tag">Hardcore GE</span></div>'+
 '<form id="sizerForm" class="form-inline"><div class="field"><label for="sizerAvailable">Your GP budget</label>'+
 '<input id="sizerAvailable" type="number" name="available" min="0" inputmode="numeric" value="'+Math.floor(cash)+'"></div>'+
 '<button type="submit" class="action">Calculate</button></form>'+
 '<div class="pump-sizer">'+
 tile('Observed low (buy target)',gp(buy))+tile('Observed high (sell target)',gp(sell))+
 tile('After-tax margin / item',gp(sell-buy-tax))+tile('24h high-side units',units(row.flipDayHighVolume))+
 tile('24h low-side units',units(row.flipDayLowVolume))+tile('4h GE buy limit',limit===null?'Not listed':units(limit))+
 tile('Budget affordable',buy>0?units(Math.floor(cash/buy)):'—')+
 tile('Volume-capped units',units(qty))+tile('Potential batch profit',qty>0?gp(row.flipBatchProfit):'No two-sided volume estimate')+
 '</div><p class="smallnote">These are completed trades, not standing GE offers. The quantity scenario is capped by GP, buy limits when known, and a small fraction of two-sided traded volume. A valid observed spread can exist even if volume is too low to estimate a fillable batch. Check offers before trading.</p></div>';
}
export function watchCard(row,history,budget){
 const s=history?.summary,loading=!history,hasPrice=Number(row.buy)>0&&Number(row.sell)>0;
 const t=row.flipModel?row:null;
 const img=row.icon?'https://oldschool.runescape.wiki/images/'+encodeURIComponent(row.icon.replace(/ /g,'_')):null;
 const historic=v=>v==null?(loading?'Loading…':'—'):gp(v);
 const change=s?.changePct!=null?pc(s.changePct):(loading?'Loading…':'—');
 return '<div class="pump-watch-card"><div class="pump-watch-head"><div class="pump-watch-name">'+
 (img?'<img loading="lazy" src="'+escapeHtml(img)+'" alt="">':'<span>◆</span>')+
 '<strong>'+escapeHtml(row.name)+'</strong></div><div class="pump-watch-actions"><button class="action secondary minor" data-open="'+row.id+'">Details / sizing</button>'+
 '<button class="button-link danger" data-watch="'+row.id+'">Remove</button></div></div>'+
 '<p class="pump-watch-sub">Buy '+(hasPrice?gp(row.buy):'—')+' · Sell '+(hasPrice?gp(row.sell):'—')+
 ' · 4h buy limit '+(row.limit>0?units(row.limit):'Not listed')+'</p>'+
 '<div class="pump-watch-grid">'+tile('24h low (5m avg)',historic(s?.low))+
 tile('24h high (5m avg)',historic(s?.high))+
 tile('24h change (sample midpoint)',change)+
 tile('24h trade volume',row.dayVol==null?'—':units(row.dayVol))+
 tile('Net margin / item',hasPrice?gp(row.net):'—')+
 tile('Volume-capped scenario',t&&t.flipUnits>0?gp(t.flipBatchProfit):'No sizing estimate')+
 '</div>'+riskBadge(hasPrice?row:null)+
 '<p class="smallnote" style="margin-top:8px">24h highs/lows are the extremes of available 5-minute averaged trades, not actual tick highs/lows. Sizing is based on recently completed two-sided volume when available. Every observed spread remains visible.</p></div>';
}
export function alertValue(alert,row,history){
 if(!row)return null;
 const metric=alert.metric||alert.side||'buy';
 if(metric==='volume24')return row.dayVol==null?null:Number(row.dayVol);
 if(metric==='change24'){
  const s=history?.summary;
  if(!s||!Number.isFinite(s.changePct)||!s.updatedAt||Date.now()/1000-s.updatedAt>10800)return null;
  return s.changePct;
 }
 if(!Number.isFinite(Number(row.age))||Number(row.age)>180)return null;
 const value=metric==='buy'?row.buy:metric==='sell'?row.sell:metric==='net'?row.net:null;
 return Number.isFinite(Number(value))?Number(value):null;
}
export function alertDisplay(alert){
 const metric=alert.metric||alert.side||'buy',value=Number(alert.target);
 return (ALERT_METRICS[metric]||metric)+' '+(alert.rule==='above'?'≥ ':'≤ ')+
 (metric==='change24'?pc(value):metric==='volume24'?units(value):gp(value));
}
