# 02 — Prioritized implementation backlog

**This is a feature plan, not a release changelog.** Explicit criteria distinguish completed work from planned work. Each ticket should get unit and UI/device tests before being marked done.

## Priority 0 — correctness + app usability (blockers)

| ID | Work item | Acceptance criteria |
| --- | --- | --- |
| P0-01 | Fix market price semantics and labeling | Wiki /latest high = recent instant buy, low = recent instant sell; each side displays its own timestamp; passive-flip estimate uses low as candidate entry and high as candidate exit, is explicitly indicative. |
| P0-02 | Audit 2% per-item GE sale tax | Floor integer, cap 5m per item, exempt list checked against official Wiki; quantity profit calculated per item before multiplying. Add boundary/unit tests. |
| P0-03 | No invented public metrics | Do not show live players, exact tax collected, exact global GP flow, guaranteed yields, live pending order-book depth or exact all-time records unless supported by a cited public feed. |
| P0-04 | OSRS mobile theme and five-tab shell | New design tokens, proper touch targets, readable 360dp layout, no text clipping or overlaid keyboard. |
| P0-05 | Filter engine on mapped source data | Same filters and sort calculations shared by Markets, Flip Finder, Search results and Watchlist. Null fields exclude from threshold filters, not silently 0. |
| P0-06 | Data freshness, cache, loading and offline states | Freshness age per high/low, 5m/1h/24h explicit source and fetch timestamps, visible retry and stale warning, native cache honors endpoint limit. |
| P0-07 | Persistent local data migration | Upgrade existing key osrs-pump-v1 without losing trades/watchlist/alerts; JSON export/import roundtrip and uninstall warning. |
| P0-08 | APK smoke tests on real devices | Test Android 16 and smaller phones, rotate, keyboard resize, file backup/restore, navigation, network disconnected, no crash. |

## Priority 1 — major visible redesign (v0.3 alpha)

| ID | Work item | Acceptance criteria |
| --- | --- | --- |
| P1-01 | Home dashboard + activity strip | Four real/derivable overview cards; at least four working discovery sections; fake counts excluded. |
| P1-02 | Markets hub + categories | 15+ discoverable market views with real deterministic rules, descriptions, count and working result routing. |
| P1-03 | Item list card + genuine item icon | Displays members flag, timestamps, net margin, volume; falls back on missing art; icon source attributable. |
| P1-04 | Filter drawer and active chips | Sticky Apply, Reset, Save, cancel without losing current filters; searchable, keyboard-friendly and returns correct count. |
| P1-05 | Advanced sort and presets | Multiple sort keys, ascending/descending, 5 useful presets persisted on device, edit/delete possible. |
| P1-06 | Item search autocomplete | Debounced name/id search, clickable result, no keyboard obstruction; recent items. |
| P1-07 | Item deep dive redesign | Complete summary, history, tax calculation breakdown, 4h buy limit, links and risk labels. |
| P1-08 | Categories/tags | Deterministic curated mapping plus documented fallback, no hidden paid-category datasets. |

## Priority 2 — market analytics, portfolio, and specialty sections (v0.3 beta)

| ID | Work item | Acceptance criteria |
| --- | --- | --- |
| P2-01 | 5m, 1h and 24h volume | Correct highPriceVolume + lowPriceVolume; no interchange of units vs GP. |
| P2-02 | History windows and percentile suggestions | Hist data with coverage count; 24h/7d/30d sample-aware ranges; buy/sell percentile bands labelled illustrative. |
| P2-03 | Risk/freshness/liquidity screen | Transparent formula; two-sided freshness, data gaps, volume and spread flags. |
| P2-04 | Low-cash, high-ROI, volume, fire sale and recovery pages | Verified grouping based on published rules and hidden where data insufficient. |
| P2-05 | Price movement/hot-cold streaks | Derived from consistent series with sample count and missing data rules; no all-time claims. |
| P2-06 | Watchlist folders and ignored-items rules | Persisted, fast actions, bulk add/remove, export. |
| P2-07 | Profit/portfolio correctness | Partial fills, multiple lots, tax per sale, realized/unrealized values, buy/sell fees as actually paid. |
| P2-08 | Alchemy and conversions | Price from same market feed, nature rune/staff options, curated recipes + quantities + completion assumptions. |
| P2-09 | Death's Coffer | Verified guide-price input and eligibility; 105% credit and warning it is **not GP**; don't use mapping.value as GE guide price. |
| P2-10 | Alert engine | Foreground rule evaluation, rate limits/debounce/cooldown, meaningful prior vs current comparisons, last fired timestamp. |

## Priority 3 — future differentiated features

| ID | Work item | Acceptance criteria |
| --- | --- | --- |
| P3-01 | Native background price notifications | Battery-aware scheduling, notification permission, offline retry, never promised before implemented and tested. |
| P3-02 | Persistent public historical archive | If user wishes, store periodic snapshots locally or via opt-in publicly sourced service; data volume, retention, provenance and bandwidth documented. |
| P3-03 | Relative value / correlation / category momentum | Clear historic method and sample size; confidence not overstated. |
| P3-04 | CSV export and user-defined dashboard widgets | Files load on Android, configurable widgets and secure backup. |
| P3-05 | Robust release signing and updates | Stable release key stored in GitHub secrets; version increment, release SHA-256, in-place Android update tested. |
| P3-06 | Accessibility and visual polish | Screen reader labels, high contrast, large fonts, reduced animations, perf profiling on low-end phone. |

## Engineering sequencing / dependency order

1. Data normalizer and tests (P0-01/02/03/05/06).
2. Shared UI tokens, navigation, item/card components (P0-04, P1-03).
3. Markets hub, category registry and filter drawer (P1-02/04/05/08).
4. Home and search (P1-01/06).
5. Item detail + historical metrics (P1-07, P2-01/02/03).
6. Portfolio, watchlist, specialty methods, alerts (P2-06/07/08/09/10).
7. Accessibility + regression/device APK testing (P0-07/08).
8. Real background notifications and reliable signing (P3).

## Definition of Done for each release

- Tests cover tax, zero/null values, stale streams, huge values, precision, max/min range, unknown buy limits, no-data windows and partial fills.
- UI screenshot and manual testing at 360/393/412dp, Android keyboard shown, portrait/landscape.
- No network mocking outside tests. Empty states accurately report lack of source data.
- Build on GitHub Actions passes tests and produces a verifiable versioned APK, **installed on a physical device** before claiming fully tested.
- Any new data source URL, license and timestamp semantics documented.
