/** Hardcore Worlds flipping.
 * Always preserve observable low/high and after-tax net margin; never require
 * arbitrary 5 GP/item, 1,000 GP/batch, or regular-world volume thresholds.
 * Observed prices are not resting offers. Capacity estimates are conservative
 * heuristics drawn from *completed* two-sided transactions, not order depth.
 */
import {geTax} from './logic.js';
const good=x=>x!==undefined&&x!==null&&Number.isFinite(Number(x))&&Number(x)>0;
const qty=(r,k)=>Math.max(0,Number(r?.[k])||0);
const clamp=(x,min=0,max=1)=>Math.min(max,Math.max(min,x));
export const FLIP_POLICY=Object.freeze({dailyParticipation:0.10,hourlyParticipation:0.25,maxHourlyLookbackMinutes:180});
export function assessFlip(row,hour=null,five=null,day=null,now=Date.now()){
 const high=Number(row.sell),low=Number(row.buy),tax=high>0?geTax(high,row.name):0;
 const net=low>0&&high>0?high-low-tax:null;
 const roi=low>0&&net!==null?net/low:null;
 const hHi=qty(hour,'highPriceVolume'),hLo=qty(hour,'lowPriceVolume');
 const dHi=qty(day,'highPriceVolume'),dLo=qty(day,'lowPriceVolume');
 const fHi=qty(five,'highPriceVolume'),fLo=qty(five,'lowPriceVolume');
 const age=good(row.highTime)&&good(row.lowTime)?Math.max(0,(now/1000-Math.min(Number(row.highTime),Number(row.lowTime)))/60):Infinity;
 const dSide=Math.min(dHi,dLo),hSide=Math.min(hHi,hLo);
 const capacity=dSide>0?Math.max(1,Math.floor(dSide*FLIP_POLICY.dailyParticipation)):
   hSide>0?Math.max(1,Math.floor(hSide*FLIP_POLICY.hourlyParticipation)):0;
 const limit=Number(row.limit)>0?Math.floor(Number(row.limit)):null;
 const marketCap=limit===null?capacity:Math.min(capacity,limit);
 const twoSided=dSide>0;
 const volume24=dHi+dLo;
 const activity=twoSided
   ?(dSide>=1000?'Active':dSide>=25?'Trading':'Thin')
   :(volume24>0?'One-sided':'No 24h trades');
 const warnings=[];
 if(!Number.isFinite(age)||age>1440)warnings.push('Older observations');
 if(!twoSided)warnings.push('No completed trades on both sides in 24h');
 if(net!==null&&net<=0)warnings.push('No after-tax margin at observed prices');
 if(net!==null&&low>0&&roi>5)warnings.push('Extreme observed spread: verify offers');
 return {...row,flipBuy:low>0?low:null,flipSell:high>0?high:null,flipTax:tax,
  flipNet:net,flipRoi:roi,flipAge:age,flipHourHighVolume:hHi,flipHourLowVolume:hLo,
  flipDayHighVolume:dHi,flipDayLowVolume:dLo,flipFiveVolume:fHi+fLo,
  flipMarketCapacity:marketCap,flipLimitKnown:limit!==null,flipGrade:activity,
  flipFlags:warnings,flipReasons:warnings,flipEligible:net!==null&&net>0,
  flipModel:'hardcore-activity-v2'};
}
export function sizeFlip(row,budget=1_000_000){
 const cash=Math.max(0,Number(budget)||0),price=row.flipBuy;
 const affordable=price>0?Math.floor(cash/price):0;
 const cap=Math.max(0,Number(row.flipMarketCapacity)||0);
 const units=Math.min(affordable,cap,100_000_000);
 const batch=units*Math.max(0,Number(row.flipNet)||0);
 return {...row,flipUnits:units,flipBatchProfit:batch,flipInvestment:units*(price||0),flipAffordable:affordable};
}
export function executionScore(row){
 const sides=Math.min(row.flipDayHighVolume||0,row.flipDayLowVolume||0);
 const day=clamp(Math.log10(1+sides)/4);
 const h=clamp(Math.log10(1+Math.min(row.flipHourHighVolume||0,row.flipHourLowVolume||0))/3);
 const freshness=Number.isFinite(row.flipAge)?clamp(1-row.flipAge/1440):0;
 return Math.round(100*(.65*day+.20*h+.15*freshness));
}
export function rankFlip(row){
 if(!(row.flipNet>0))return 0;
 const sides=Math.min(row.flipDayHighVolume||0,row.flipDayLowVolume||0);
 const activity=clamp(Math.log10(1+sides)/4);
 const roi=clamp(Math.log1p(Math.max(0,row.flipRoi)*100)/Math.log1p(100));
 const batch=clamp(Math.log1p(Math.max(0,row.flipBatchProfit))/Math.log1p(1_000_000));
 const freshness=Number.isFinite(row.flipAge)?clamp(1-row.flipAge/1440):0;
 const base=.36*roi+.42*batch+.17*activity+.05*freshness;
 return Math.round(100*base*(.2+.8*activity));
}
export function readyFlip(row,budget=1_000_000){
 const sized=sizeFlip(row,budget);
 const score=executionScore(sized),rank=rankFlip(sized);
 return {...sized,executionScore:score,flipRank:rank,
  flipRecommended:sized.flipNet>0&&sized.flipUnits>0,
  flipReasons:[...sized.flipFlags],flipVolumeLabel:sized.flipGrade};
}
export function assessMarket(rows,hour={},five={},day={},budget=1_000_000,now=Date.now()){
 const h=hour?.data||{},f=five?.data||{},d=day?.data||{};
 return rows.map(row=>readyFlip(assessFlip(row,h[row.id],f[row.id],d[row.id],now),budget));
}
export function rerankMarket(rows,budget=1_000_000){
 return rows.map(row=>row.flipModel?readyFlip(row,budget):row);
}
export function recommended(rows){
 return rows.filter(x=>x.flipNet>0&&x.flipUnits>0).sort((a,b)=>b.flipRank-a.flipRank||b.flipBatchProfit-a.flipBatchProfit||b.flipRoi-a.flipRoi);
}
