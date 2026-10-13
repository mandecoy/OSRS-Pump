# 04 — Exact filters, formulas, data provenance, edge cases

This is the authoritative engineering math spec for v0.3. Apply as pure reusable functions with unit tests. None of the estimates below guarantees an actual GE fill.

## 1. Public API and price definitions

Base: https://prices.runescape.wiki/api/v1/osrs

- /mapping: item ID, name, members, buy limit, item icon name, alch values and **ordinary item value**. Do not confuse mapping.value with current Jagex GE guide price.
- /latest: latest **completed instant buy** high and latest **completed instant sell** low, with independent highTime and lowTime (Unix seconds). These are separate transactions, not standing bid/ask order-book snapshots.
- /5m, /1h, /6h, /24h: aggregate average high/low prices and highPriceVolume/lowPriceVolume per item. Treat quantities as observed traded item counts.
- /timeseries?id=ITEM_ID&timestep=5m|1h|6h|24h: historical bucketed averages and volumes, max samples dependent on endpoint/version.
- Explicitly pin API **v1**. v2 timeseries uses another parameter contract and must be implemented separately if migrated.
- Use identifying User-Agent, caching and resilient partial errors. Independent timestamps should not be replaced by the time of the last refresh.

### Ground truth about highs and lows

The Wiki's high is what the most recent instant buyer paid; low is what the most recent instant seller received. A patient flipper might submit a buy near the observed low and a sell near the observed high, but neither offer is guaranteed to fill. High and low can be older than each other or even cross. UI labels: **“Observed instant buy”**, **“Observed instant sell”**, **“Indicative passive flip profit”**.

## 2. Tax and flip formulas

Let B = intended passive buy entry GP/item (normally observed low), S = intended passive sell exit GP/item (normally observed high), q = quantity, T(S,item) = per-item GE sale tax.

- T = 0 for currently exempt items; otherwise min(5,000,000, floor(0.02 * S)).
- Gross spread/item = S - B.
- Net margin/item = S - B - T.
- Net ROI (%) = 100 * (S - B - T) / B, valid only if B > 0.
- Total invested = q * B.
- Estimated revenue after tax = q * (S - T).
- Estimated total profit = q * (S - B - T).
- Breakeven target sale is the smallest whole GP S such that S - T(S,item) >= B.
- Tax cap is **per item**, not applied once to the total stack.
- All prices GP integer. Use integer-safe mathematics for money; avoid falsy fallbacks that turn missing prices into 0.
- Realized profit uses actual buy, sale, sold qty and any actual optional fees, never hypothetical historic low/high.
- Quantity must be positive integer; max q = min(floor(budget / B), known 4h buy limit, user desired quantity, optional conservative liquidity cap). If buy limit absent, show Unknown and don't imply “unlimited.”
- Commission rounding: floor per item **before** multiplication by q; 2% applies only to a sale, not to a purchase.
- Do not infer GP/hour from this formula. Without fill-time data, report “potential per 4-hour buy-limit window” and optionally show a user-selected *scenario*.

**Illustrative example, not current item price:** B=1,000,000; S=1,050,000; T=floor(21,000)=21,000; gross 50,000; net 29,000 GP/unit; ROI=2.9%; q=10 -> 290,000 GP estimated net if fully filled. A zero/highly stale side disables opportunity ranking.

Important: exemptions (bonds, selected common items) can change. Keep a tested, versioned ID-based exemption list, supported by Wiki references; avoid only name-matching tax exceptions.

## 3. Volume, freshness and movement

- V5 = /5m highPriceVolume + lowPriceVolume.
- V1h = /1h highPriceVolume + lowPriceVolume.
- V24h = /24h highPriceVolume + lowPriceVolume.
- Source can have one-sided, missing or unreported volume. **Unknown is not zero**. Null means unavailable, zero means reported no trades.
- Oldest-leg age minutes = max((now - highTime)/60, (now - lowTime)/60); if either missing, mark incomplete. Optionally display both ages separately.
- Default flags: Fresh: older leg <=15 min; Recent: 15–60 min; Caution: 60–180 min; Stale: >180 min. Thresholds are suggestions and user-configurable.
- Crossed data: high < low -> suppress passive-profit candidate or flag invalid/temporally mismatched, not an opportunity. Also flag unusually large divergence or high-side and low-side ages vastly different.
- 24h movement % = 100*(current comparable price - historical comparable price)/historical comparable price. Compare same price definition/side (e.g., 1h averaged mid vs 1h averaged mid) and specify intervals. If insufficient comparable samples, mark unavailable.
- Side-average mid estimate M(t) = (avgHighPrice(t)+avgLowPrice(t))/2 if both valid. This is a convenience midpoint of *observed transactions*, **not** the standing GE midpoint.
- Relative volume spike = current 5m units / median of preceding comparable 5m intervals; set threshold e.g., >=3x with minimum historical samples and absolute floor, otherwise no signal.
- 24h historical sampled low = min(valid avgLowPrice in the 24h interval).
- 24h historical sampled high = max(valid avgHighPrice in the 24h interval).
- Label above extrema **“24h bucket-average range”**; they are not literal individual-trade high/low.
- “All time” requires full historical coverage from an archive. Without one, use **“Highest/lowest in available history”** and state lookback/coverage.

## 4. Filtering contract

All min/max bounds inclusive; blanks = disabled; 0 is a valid threshold; null facts never pass a required numeric threshold. Reject min > max inline, rather than silently swapping values. Search case-insensitive with whitespace normalization. Persist sort, membership mode and presets, but never apply unrelated saved filters to category browsing without showing them.

| Group | Minimum/maximum filters | Required field |
| --- | --- | --- |
| Price | candidate buy GP, observed instant buy GP, observed instant sell GP | B/high/low |
| Spread | raw GP/unit, raw % of entry | high - low |
| Profit | net GP/unit, total projected GP at capped q | net margin + q |
| ROI | net ROI % after GE tax | B, S, T |
| Volume | min/max 5m units, 1h units, 24h units | V5, V1h, V24h |
| Buy limit | min/max 4-hour GE buy limit | mapping.limit |
| Budget | total GP available, desired quantity, preferred GE slot count | B, buyLimit |
| Age | max oldest-leg age; minimum first/last observation coverage | highTime, lowTime |
| Risk | min/max risk score, flags exclude crossed/stale/low-volume | risk model |
| Price movement | min/max 1h/24h/7d %, positive/negative streak | aligned historic samples |
| Range | proximity to 24h available historical low/high | history |
| Profile | members/F2P, category, favorites, owned, ignored items | mapping + local state |
| Money making | min alch profit, min transformation profit, coffer eligibility | alch+recipes+guide |
| Custom | filter within saved folder, price bracket preset, sort ascending/descending | local user configuration |

Suggested quick presets (all editable):
- **Low Cash:** buy <=100k, positive net, V1h>=100, older leg <=60m.
- **Quick Flips:** V1h>=1,000, positive after-tax net, <=30m older-leg age.
- **Safe-ish Liquidity:** V24h>=10,000, both price sides <=15m, avoid crossed quotes; not a safety guarantee.
- **High ROI:** net ROI>=3%, V1h>=50, age<=60m, cap max spread anomaly.
- **Big Ticket:** B>=10m, positive net, explicit volume/freshness flags.
- **High Alch:** alch profit>0 after nature rune cost, positive V24h, buy limit known.

Controls: collapsible sections, range numeric fields with k/m suffix and correct parsing, searchable categories, active chips, sort, Save Preset, Reset, Apply. A change to one filter must affect results immediately after Apply on every discovery list. User-defined min/max price AND min/max volume must be available as requested.

## 5. Category idea formulas / definitions

- **High Margins** = rank by net margin/unit, show trade age and V1h; require net > 0.
- **High ROI** = rank by 100 * net/B, minimum V1h filter to reduce illiquid traps.
- **Fast / Liquid** = rank by V1h or V5 with positive net and two recent price observations.
- **Low-Cash** = budget <= user cap with positive net, reasonable volume and known price.
- **Fire Sale Candidate** = comparable current price >=10% below a specified historical median, recent enough and minimum history; **not** guaranteed undervalued.
- **Recovery Candidate** = recently down versus lookback average but now has 2+ successive rising comparable buckets; label heuristic.
- **Gainers/Losers** = comparable price delta or % over precise 24h or 7d lookback, exclude missing samples.
- **Hot/Cold streak** = successive comparable closing bucket averages rising/falling, n >= threshold; not retroactively guaranteed.
- **Asleep** = V1h=0 reported or no transaction within a documented time threshold; distinguish “not recorded” versus 0.
- **Breakout** = current comparable price above max of last N completed comparable historical buckets, minimum volume.
- **High Volume** = descending V24h or V1h; distinct tabs/filters.
- **Range Near Low** = (M_now - minHistoricalBucket) / (maxHistoricalBucket - minHistoricalBucket) <= threshold; no signal if zero/unknown range.
- **Potential Max Profit per 4h** = net margin * capped q; does not imply 4h sell-through or in-game orders.
- **Most Taxed** = potential T(S) * observed sale-side volume over interval, clearly labelled **estimate**, not Jagex tax collections.
- **Buy Limit Potential** = sort by positive net margin * limit if limit known; do not equate with guaranteed capacity.

## 6. Example transparent scoring (not a prediction)

Prefer several clearly separate gauges:
- Freshness score 0–100 from oldest leg age.
- Liquidity score 0–100 based on log-scaled V1h and optional V24h.
- Consistency score 0–100 based on count of available history buckets, crossed/outlier flags and variation.
- Illustrative confidence score = round(0.40*Freshness + 0.40*Liquidity + 0.20*Consistency), clamped 0–100.
- Risk score = 100 - confidence; user sees contributing values and no guaranteed returns.
- Never score an item with missing price legs as “low-risk.” Show “unrated.”
- Liquidity does not measure executable order-book depth; it is only historical activity.

## 7. Money-making formulas

### High Alchemy

**Alch profit/unit = item.highalch - intended buy price - nature rune cost - other consumed rune costs.** If using a staff that supplies fire runes, fire rune cost=0. If casting without staff, add 5 fire rune cost unless another supply is selected. No GE sale tax on coins obtained from alching. Acquisition remains subject to buy limits. GP/hour is only a manually selected action-rate scenario (up to about 1,200 casts/hour under ideal conditions) with capped supply.

### Processing / conversions

**Profit per batch = sum(outputQty_i * outputExitPrice_i - outputQty_i * tax_i) - sum(inputQty_j * inputBuyPrice_j) - consumables - fees.**
**Profit/hour scenario = profit per batch * user-entered batches/hour**, capped if input supplies are limited. Only include Wiki-verified recipes and skill/quest requirements; don't auto-invent input/output ratios. Include reason for unavailable prices.

### Death's Coffer

**Credit GP-equivalent = floor_or_game_round(1.05 * verified GE guide price)** according to verified current game rounding; **do not assume exact rounding without validation**. **Credit edge = coffer credit - acquisition cost**, but this is **restricted death-fee credit, not sellable coins or realized GP profit**. Each eligible item must meet the relevant 10,000 GP guide requirement, and some item classes/new releases are excluded. The Wiki mapping.value is not the appropriate official GE guide value. Until a public and reliable guide-price source is integrated and verified, require a user-entered guide-price field and show “estimate.”

## 8. Portfolio / partial-sale calculations

For individual trade lot q bought at actual B each, sold portions (n_k) at actual S_k, total n <= q:
- Realized GP = sum_k n_k*(S_k - B - T(S_k,item)).
- Remaining quantity = q - sum_k n_k.
- Locked GP = remaining * B.
- Unrealized estimated GP = remaining * (latest low-side liquidation GP - T(low,item) - B), if observation recent; null when unavailable.
- ROI on realized sales = realized GP / sum_k(n_k * B) if denominator positive.
- Weighted average basis for multiple lots depends on selected FIFO or weighted-average policy, prominently documented. Do not silently blend lots.
- Total lifetime earned = realized GP, not combined unclosed unrealized and realized figures. Present separate estimated total P/L if requested.

## 9. Required unit tests / edge cases

1. Non-exempt sale for 49gp -> 0 tax; 50gp -> 1; 1,050,000gp -> 21,000.
2. At 250,000,000gp sale -> 5m cap; 500,000,000gp remains 5m cap per item.
3. Exempt items pay 0 only if validated by item ID/list.
4. Profit and ROI with the illustrative B=1m/S=1.05m example -> 29k and 2.9%.
5. Sale quantity 10 taxes 210k total, not tax on total at 5m cap.
6. Null price/time excluded from required freshness/positive profit filters.
7. high < low or stale side flagged, never advertised as a fresh fill.
8. V5/V1h/V24h sum both sides exactly; missing != 0.
9. min > max validation; 0 accepted; k/m parsing rejects ambiguous strings.
10. 24h range only from buckets within specified time, distinct from all-time highs.
11. Budget/known buy limit cap q correctly; unknown limit labeled unknown.
12. Partial fills at multiple sale prices return correct realized and locked amount.
13. Alch staff/no staff correctly includes nature/fire runes.
14. Coffer does not claim market GP return; guide value required; ineligible item blocked.
15. Test item search dropdown with Android soft keyboard plus persisted filters on back navigation.

## 10. References

- https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices
- https://oldschool.runescape.wiki/w/Grand_Exchange#Convenience_fee_and_item_sink
- https://oldschool.runescape.wiki/w/High_Level_Alchemy
- https://oldschool.runescape.wiki/w/Death%27s_Coffer
- https://github.com/mandecoy/OSRS-Pump

All thresholds are **design defaults**; they must be adjustable, justified and retested with live API shape before shipping. No reverse engineering of proprietary subscription APIs is required.
