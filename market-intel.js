/* UI components for tax-aware trade sizing and transparent market signals. */
import {tradeSize,riskSignals} from './logic.js';
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
 const t=row.flipModel?row:null;
 if(!t||!row.flipRecommended)return '<div class="card"><strong>Research only — not a recommended flip</strong><p class="smallnote">'+escapeHtml((row.flipReasons||['Insufficient recent two-sided trades']).join(' · '))+'</p>Raw high/low observations are not executable orders.</div>';
 return '<div class="card" style="margin-top:16px"><div class="section-heading"><h3>Trade-size calculator</h3><span class="tag">4-hour GE cycle</span></div>'+
 '<form id="sizerForm" class="form-inline"><div class="field"><label for="sizerAvailable">GP available</label>'+
 '<input id="sizerAvailable" type="number" name="available" inputmode="numeric" step="1" min="0" value="'+escapeHtml(Math.floor(Number(budget)||0))+'"></div>'+
 '<button type="submit" class="action">Calculate</button></form>'+
 '<div class="pump-sizer" style="margin-top:13px">'+
 tile('Units affordable',units(Math.floor((Number(budget)||0)/row.flipBuy)))+
 tile('4h GE buy limit',t.flipLimitKnown?units(t.limit):'Not listed')+
 tile('Units to flip',units(t.flipUnits))+
 tile('Total purchase',gp(t.flipInvestment))+
 tile('GE sale tax / item',gp(t.flipTax))+
 tile('Est. total profit after tax',gp(t.flipBatchProfit))+
 '</div><p class="smallnote" style="margin-top:12px">Assumes each unit buys at '+gp(t.flipBuy)+' and sells at '+gp(t.flipSell)+
 '. Actual fills, volume, existing purchases in this four-hour window and price movement can reduce the quantity or profit.'+
 (t.limitKnown?' The GE limit is an item-wide 4h buy cap; enter how many you have already bought separately when planning additional buys.':' No verified 4h limit was listed, so the quantity shown is budget-only.')+
 '</p><div style="margin-top:8px">'+riskBadge(row)+'</div></div>';
}
export function watchCard(row,history,budget){
 const s=history?.summary,loading=!history,hasPrice=Number(row.buy)>0&&Number(row.sell)>0;
 const t=row.flipRecommended?row:null;
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
 tile('Screened margin / item',t?gp(t.flipNet):'Research only')+
 tile('Capacity-capped profit',t?gp(t.flipBatchProfit):'Not feasible')+
 '</div>'+riskBadge(hasPrice?row:null)+
 '<p class="smallnote" style="margin-top:8px">24h highs/lows are the extremes of available 5-minute averaged trades, not actual tick highs/lows. Feasibility depends on two-sided volume, quote consistency and conservative trade capacity.</p></div>';
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
