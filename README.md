# OSRS Pump — Hardcore Worlds Flipping

**Android v0.5.0-beta.1 — flipping only.** All prices and volume come from the public Hardcore Worlds Wiki market API. The app is independent of Jagex and the Wiki.

[Android APK releases](https://github.com/mandecoy/OSRS-Pump/releases) · [Hardcore Worlds prices](https://prices.runescape.wiki/osrs-hc)

## Features

- **Home:** GP budget, highest-ranked observed flipping ideas, watchlist and trade journal. Optional Market Movers and calculator widgets.
- **Flip Finder:** Search items by name or ID, including inexpensive runes. No arbitrary minimum GP/item, ROI, market volume or batch-profit requirement. Every item with paired observed low/high transactions is discoverable.
- **Markets:** Item categories, after-tax margins, ROI and 5-minute, 1-hour, 24-hour volume. 'All', 'Active 24h' and 'Active 1h' filters are explicitly selectable.
- **Item details:** Observed instant-sell and instant-buy transaction prices, GE sale tax, charts for 1 day/7 days/30 days/90 days and tap-to-inspect bucket prices and volume. Direct HC Wiki item link.
- **Trade sizing:** A hypothetical quantity is capped by budget, known four-hour GE buy limits and a small share of two-sided historical traded volume. A zero-volume estimate does not hide an observed profit margin.
- **Portfolio and watchlist:** Locally stored trades, price alerts, JSON export/import. HC data are separated from regular-world data.

**All Money Making, High Alchemy, Processing, jewelry crafting and teleport-tablet features are removed.** This is a flipping-only market app.

## Why 1-GP margins matter

An item bought at 4 GP and sold at 5 GP has a 1 GP margin and 25% ROI if its sale tax is zero. At 3 GP and 5 GP, that is 2 GP/item and about 66.7% ROI. These are illustrative quotes, not guarantees. With sufficient real trading volume, small margins can be more useful than a huge spread between isolated trades. OSRS Pump therefore shows these items rather than banning low margins.

Rankings weigh after-tax ROI, plausible GP-budget/volume-capped batch profit and completed-trade activity. Quiet and stale items stay searchable, with activity information shown rather than an unexplained "unreliable" label. Actual fillable bids and asks are unknown—Wiki prices are **completed transactions, not a standing order book**. Always check margins manually before placing large trades.

## Data

Hardcore API root: https://prices.runescape.wiki/api/v2/osrs-hc

Uses latest, mapping, 5m, 1h, 24h, and the v2 timeseries lookback endpoint. Volumes are completed trade units, not the number currently available to buy or sell. Jagex's separate Most Traded page uses a different reporting window and isn't mixed into the 24-hour feed.

The app stores personal HC data on your device only, not online, and has no account login or paid API keys. Export a JSON backup before uninstalling a debug-signed APK; Android builds may have different signing keys.

## Local development

Requires Node.js 22+. Run 'npm test', 'npm run check', then 'npm start' and open http://localhost:8765.

GitHub Actions builds the debug-signed Android APK and publishes a release. Reliable install-over-install updates require a permanent private signing key, never committed to this repository.

## License

MIT license for original code. Jagex and Wiki media/data retain their own applicable terms. Not affiliated with or endorsed by Jagex.
