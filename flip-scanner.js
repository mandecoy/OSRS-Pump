/** Conservative GE flip discovery from publicly observed Wiki transactions.
 * This is an opportunity SCREEN, never a guarantee of fillable bid/ask prices.
 * Raw latest observations remain unchanged for item intelligence/watchlists.
 */
import {geTax} from './logic.js';
export const FLIP_POLICY=Object.freeze({
  maxQuoteAgeMinutes:45,
  maxQuoteSeparationMinutes:35,
  minHourlyEachSide:5,
  minDailyEachSide:30,
  minDailyTotal:300,
  minFiveMinuteTotal:2,
  minNetPerItemGp:5,
  minNetRoi:0.01,
  minBatchProfitGp:1000,
  maxRawRoi:0.18,
  maxQuoteDeviation:0.12,
  hourlyParticipation:0.12,
  dailyParticipation:0.01
});
const present=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>0;
const count=(r,k)=>Math.max(0,Number(r?.[k])||0);
const ageMinutes=(ts,now)=>present(ts)?Math.max(0,(now/1000-Number(ts))/60):Infinity;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function assessFlip(row,hour=null,five=null,day=null,now=Date.now()){
 const f=FLIP_POLICY,flags=[];
 const highAge=ageMinutes(row.highTime,now),lowAge=ageMinutes(row.lowTime,now);
 const quoteAge=Math.max(highAge,lowAge);
 const quoteSeparation=present(row.highTime)&&present(row.lowTime)?Math.abs(row.highTime-row.lowTime)/60:Infinity;
 const hHi=count(hour,'highPriceVolume'),hLo=count(hour,'lowPriceVolume'),
       dHi=count(day,'highPriceVolume'),dLo=count(day,'lowPriceVolume'),
       fiveTotal=count(five,'highPriceVolume')+count(five,'lowPriceVolume');
 const fiveHourBoth=present(hour?.avgLowPrice)&&present(hour?.avgHighPrice)&&
                    present(five?.avgLowPrice)&&present(five?.avgHighPrice);
 const latestBuy=Number(row.buy),latestSell=Number(row.sell);
 const rawRoi=latestBuy>0?(latestSell-latestBuy-geTax(latestSell,row.name))/latestBuy:Infinity;
 if(quoteAge>f.maxQuoteAgeMinutes)flags.push('Stale quote');
 if(quoteSeparation>f.maxQuoteSeparationMinutes)flags.push('Trades too far apart');
 if(hHi<f.minHourlyEachSide||hLo<f.minHourlyEachSide)flags.push('Insufficient two-sided 1h trades');
 if(dHi<f.minDailyEachSide||dLo<f.minDailyEachSide||dHi+dLo<f.minDailyTotal)flags.push('Insufficient 24h trades');
 if(fiveTotal<f.minFiveMinuteTotal)flags.push('No meaningful 5m activity');
 if(!fiveHourBoth)flags.push('Missing recent paired averages');
 if(rawRoi>f.maxRawRoi)flags.push('Unusual observed spread');
 const devBuy=fiveHourBoth?Math.abs(latestBuy/Number(hour.avgLowPrice)-1):Infinity;
 const devSell=fiveHourBoth?Math.abs(latestSell/Number(hour.avgHighPrice)-1):Infinity;
 if(fiveHourBoth&&(devBuy>f.maxQuoteDeviation||devSell>f.maxQuoteDeviation))flags.push('Latest quote differs from hourly norm');
 // Latest completed low/high aren't actual resting buy/sell orders. Cap entry at
 // the more expensive observed recent averages and exit at the lower of recent prices.
 const entry=fiveHourBoth?Math.max(latestBuy,Number(hour.avgLowPrice),Number(five.avgLowPrice)):null;
 const exit=fiveHourBoth?Math.min(latestSell,Number(hour.avgHighPrice),Number(five.avgHighPrice)):null;
 const theoreticalGap=entry!==null&&exit!==null?Math.max(0,exit-entry):0;
 const slippage=theoreticalGap>0?Math.max(1,Math.ceil(theoreticalGap*0.10)):0;
 const candidateBuy=entry!==null?Math.round(entry+Math.floor(slippage/2)):null;
 const candidateSell=exit!==null?Math.round(exit-Math.ceil(slippage/2)):null;
 const flipTax=candidateSell>0?geTax(candidateSell,row.name):null;
 const net=candidateBuy>0&&candidateSell>0?candidateSell-candidateBuy-flipTax:null;
 const roi=net!==null?net/candidateBuy:null;
 if(net===null||net<f.minNetPerItemGp)flags.push('Trivial after-tax margin');
 if(roi===null||roi<f.minNetRoi)flags.push('Low after-tax ROI');
 // Even large 24h unit volume is not evidence of order depth. Size is intentionally
 // capped at a tiny fraction of the lesser of bought and sold units.
 const trafficCap=Math.floor(Math.min(
   hHi*f.hourlyParticipation,hLo*f.hourlyParticipation,
   dHi*f.dailyParticipation,dLo*f.dailyParticipation
 ));
 const limitKnown=Number(row.limit)>0;
 const limit=limitKnown?Math.floor(Number(row.limit)):null;
 const marketCapacity=limitKnown?Math.min(trafficCap,limit):trafficCap;
 if(marketCapacity<1)flags.push('No plausible trade capacity');
 return {...row,flipBuy:candidateBuy,flipSell:candidateSell,flipTax,flipNet:net,flipRoi:roi,
   flipFlags:flags,flipEligible:flags.length===0,flipHourHighVolume:hHi,flipHourLowVolume:hLo,
   flipDayHighVolume:dHi,flipDayLowVolume:dLo,flipFiveVolume:fiveTotal,
   flipAge:quoteAge,flipQuoteGap:quoteSeparation,flipMarketCapacity:Math.max(0,marketCapacity),
   flipLimitKnown:limitKnown,flipDeviation:Math.max(devBuy,devSell),flipModel:'recent-conservative-v1'};
}
export function sizeFlip(row,budget=1_000_000){
 const cash=Math.max(0,Number(budget)||0);
 const affordable=row.flipBuy>0?Math.floor(cash/row.flipBuy):0;
 const units=clamp(Math.min(affordable,row.flipMarketCapacity||0),0,1e8);
 const profit=units*(Number(row.flipNet)||0);
 return {...row,flipUnits:units,flipBatchProfit:profit,flipInvestment:units*(row.flipBuy||0)};
}
export function executionScore(row){
 if(!row.flipEligible||row.flipUnits<=0)return 0;
 const f=FLIP_POLICY;
 // Transparent heuristic: execution evidence, not a probability of completing a trade.
 const activity=clamp(Math.log10(1+Math.min(row.flipDayHighVolume,row.flipDayLowVolume))/4,0,1);
 const freshness=clamp(1-row.flipAge/f.maxQuoteAgeMinutes,0,1);
 const consistency=clamp(1-row.flipDeviation/f.maxQuoteDeviation,0,1);
 const capacity=clamp(Math.log10(1+row.flipUnits)/3,0,1);
 return Math.round(100*(0.40*activity+0.25*freshness+0.20*consistency+0.15*capacity));
}
export function rankFlip(row){
 if(!row.flipEligible||row.flipBatchProfit<FLIP_POLICY.minBatchProfitGp)return 0;
 // Preference: after-tax ROI + feasible GP per fill, while recent two-sided
 // trade activity and quote consistency are prerequisites to ranking.
 const roi=clamp((row.flipRoi-FLIP_POLICY.minNetRoi)/0.08,0,1);
 const total=clamp(Math.log10(1+Math.max(0,row.flipBatchProfit))/6,0,1);
 return Math.round(100*(0.45*roi+0.35*total+0.20*(executionScore(row)/100)));
}
export function readyFlip(row,budget=1_000_000){
 const sized=sizeFlip(row,budget);
 const execution=executionScore(sized);
 const rank=rankFlip(sized);
 const flags=[...row.flipFlags];
 if(sized.flipBatchProfit<FLIP_POLICY.minBatchProfitGp)flags.push('Insufficient budget-sized profit');
 return {...sized,executionScore:execution,flipRank:rank,flipRecommended:row.flipEligible&&rank>0,
   flipReasons:flags};
}
export function assessMarket(rows,hour={},five={},day={},budget=1_000_000,now=Date.now()){
 const h=hour?.data||{},f=five?.data||{},d=day?.data||{};
 return rows.map(row=>readyFlip(assessFlip(row,h[row.id],f[row.id],d[row.id],now),budget));
}
export function rerankMarket(rows,budget=1_000_000){
 return rows.map(row=>row.flipModel?readyFlip(row,budget):row);
}
export function recommended(rows){
 return rows.filter(x=>x.flipRecommended).sort((a,b)=>b.flipRank-a.flipRank||b.flipBatchProfit-a.flipBatchProfit||b.flipRoi-a.flipRoi);
}
