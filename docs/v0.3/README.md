# OSRS Pump v0.3 — Product Blueprint

**Status:** Design and implementation specification. This folder does NOT imply that v0.3 has been coded, compiled, or released.

A major Android-first redesign inspired by the depth of GE market apps, while retaining an original OSRS Pump identity and using lawful public data. Screenshots supplied by the owner are *feature references*, not a license to copy UI assets or private datasets.

## Deliverables (all four)

1. [01 — Screen-by-screen redesign](01-SCREENS.md)
2. [02 — Prioritized feature backlog and acceptance criteria](02-BACKLOG.md)
3. [03 — Component and UI architecture](03-COMPONENTS.md)
4. [04 — Advanced filter specifications and tested formulas](04-FILTERS-AND-FORMULAS.md)

## Product principles

- Free and open-source, no subscription locks, no required account.
- Android-first; predictable desktop and tablet adaptation.
- Every numerical market observation is attributable to a source and timestamp.
- The OSRS Wiki public completed-trade feed does **not** reveal pending GE orders, live order depth, exact future fills, actual per-account prices, or real-time global GP totals.
- No invented player counts, news stories, turnover, estimated tax revenue, investment opportunities, price forecasts or historical data. Hide unavailable cards.
- Keep portfolio, alert rules, ignored-item list and saved filters private/on-device by default; provide export/import with schema migration.
- Maintain clear provenance and permissions for OSRS Wiki images/item icons, Jagex trademarks, and any other art. Make an original OSRS-inspired theme rather than cloning GE Watcher.
- Preserve compatibility with the existing published v0.2.0 beta until migration and signing are handled; this is only the plan.

## Priority delivery slices

- v0.3.0 alpha: theme/tokens + mobile shell, Market categories, reusable item cards, search & category navigation, and filter drawer.
- v0.3.0 beta: correct tax/price math, configurable and saved advanced filters, history charts, freshness/volume/low-liquidity warnings, and screen-reader/keyboard testing.
- v0.3.0 stable candidate: portfolio, alerts, money-making and robust device tests; repeatable signed builds. Native background alerts are a separate milestone.

## Public source references

- Wiki price feed: https://prices.runescape.wiki/api/v1/osrs/mapping and https://prices.runescape.wiki/api/v1/osrs/latest
- API and required User-Agent: https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices
- GE tax: https://oldschool.runescape.wiki/w/Grand_Exchange#Convenience_fee_and_item_sink
- Death's Coffer: https://oldschool.runescape.wiki/w/Death%27s_Coffer
- High Alchemy: https://oldschool.runescape.wiki/w/High_Level_Alchemy
- Existing source: https://github.com/mandecoy/OSRS-Pump

Sources and thresholds must be revalidated when implementation starts; do not treat examples as live prices.
