# 01 — Screen-by-screen product and visual redesign

## Design goals

Visual concept: **Grand Exchange trading desk built inside Old School RuneScape**. Combine a dark-stone OSRS mood with crisp modern financial typography. No copies of GE Watcher's protected screen assets or branding. Keep real OSRS item art when permitted and credited, with a fallback icon.

### Theme tokens, initial proposed palette

| Token | Value | Purpose |
| --- | --- | --- |
| background | #151511 | dark stone background |
| surface | #22221B | cards |
| surfaceRaised | #2D2A20 | sheets, popovers |
| border | #514836 | beveled stone/brass divider |
| gold | #E6BA55 | primary interactive accent |
| parchment | #EFE1BE | headings and important text |
| muted | #A8A08B | captions and metadata |
| success | #46B47A | profitable values, positive movement |
| danger | #E16A68 | losses and negative movement |
| informational | #62A8C6 | volumes, data freshness |
| violet | #AC8BD8 | specialty methods, coffer |

Use numbers in readable tabular lining numerals. Restrict rune/pixel display font (with a compatible license) to app masthead and small section labels; all data stays in a high-legibility sans serif. Use a subtle 1px/2px bevel, 12–16px radius, 44px+ touch targets. Never depend on color alone: explicit +/- and words such as Stale, Risky, Sold.

### Information architecture

**Five fixed bottom tabs:** Home | Markets | Search | Watchlist | Alerts. Header provides search and settings. Portfolio and Money Making launch from Home quick tools and Markets. Item Detail and Category Result are pushed screens with a back button. Phones show one data column and filter bottom sheet; tablets widen cards; desktop shows tables and persistent rail.

### Home

Header: OSRS PUMP wordmark, quick search, notification badge, settings. Below: compact market activity strip with verified source-labelled observations only.

Market Overview 2 x 2 cards:
- Items with recent trades (observed 5m sample), active item count.
- 5m tracked traded units, **not** active players.
- 24h traded units in available Wiki data; label methodology.
- Opportunities matching saved Flip Finder preset and freshness criteria.

Optional estimated GP volume uses high-side average x high-side volume plus low-side average x low-side volume, with explicit “estimated from completed trades” label and ability to hide. Do not show global users online, GP traded or tax collected without a suitable public verified source.

Quick tools: Portfolio, Flip Finder, Money Making, My Presets.
Horizontal sections (3–5 item rows each): Trending Up, Trending Down, High Margins, High Liquidity, High Alch Profit, My Watchlist Movers. Cards show item icon, name, recent high/low observations, estimated net margin, 1h/24h volume, age; unavailable values show dash with explanation. “See all” takes user to category results with filter carried forward.

### Markets hub

Browseable tappable category tiles organized under section headers:
- **Trending**: Trending Up, Trending Down, Biggest GP Gainers, Biggest GP Losers, Hot Streaks, Cold Streaks.
- **Flipping**: Highest Net Margin, High ROI, High Liquidity, Low Cash, High Ticket, Safe-ish (transparent heuristic; NOT a guarantee), Fire Sale Candidates, Recovery Candidates.
- **Volume**: Most Traded (5m, 1h, 24h), Liquidity Improving, Quiet or Asleep (low recent activity).
- **Specialty**: High Alch Profit, Death's Coffer Credit Estimate, Recently Added Items, Recent Sample Highs/Lows, Buy Limit Potential, Potential Conversions.
- **Items**: Runes, Herbs, Potions, Seeds, Ores, Bars, Logs, Planks, Food, Fishing, Ranged Ammo, Weapons, Armour, Raids/PvM, Clue Items, Teleports, Misc.

Each tile shows a computed matching-item count *only when the data for that count exists*. Tiles explain their rule on entry; “all-time high/low” requires a persisted full-history archive and otherwise must be titled “High/low within available history.” “Fire Sale” means an observed drop against a documented lookback median, **not** proof of a bargain.

### Category results / advanced screener

Sticky search field; active filter count chip; sort dropdown (relevance, net profit/unit, ROI, 1h/24h volume, freshness, 24h movement, budget-fit, estimated gross capacity); view toggle dense rows/large cards. Filter bottom sheet has sticky Apply / Reset / Save preset and clear each chip. Reuse the same filter engine for all categories.

Item row shows image, full name, membership marker, observed low (possible passive buy reference), high (possible passive sell reference), after-tax margin, ROI, latest trade age for *both* legs, 1h/24h volume, 4h buy limit and risk/freshness badges. Tap to detail; star to watch. Paginate or window long lists so 4,000+ results remain responsive.

Preset examples: Quick 100k–1m, Low-Cash Fast Trades, Conservative 10m, High Volume, Big Ticket, High Alch. Presets are editable and not hidden paid features.

### Search

Search name and known item ID with keyboard-aware autocomplete; icon + member status in results; most recent searches stored locally. Prevent covered input/dropdown when Android keyboard is up (resize viewport and allow list scroll). Always show “No results” separately from “API failed.”

### Item detail

Image/name/ID; members/F2P; official OSRS Wiki links. Headline: observed high and low and independent highTime/lowTime timestamps; after-tax passive flip estimate; buy limit; 5m/1h/24h volume, where available. Range: 5m / 1h / 6h / 24h aggregated bucket selection with 24h / 7d / 30d / max lookback that the available data supports; display actual available range and sample count.

Charts: two labelled price series, volume bars if possible, optional moving averages and median. No false candlesticks: API provides average high/low per bucket, **not** candle OHLC. Historical “suggested buy” and “suggested sell” are percentile scenarios and always labelled historical, not predicted best fills. Actions: Watch, Alert, Add trade, Add note. Also show explicit stale/low-volume warnings, item category and related items.

### Watchlist / portfolio

Watchlists can be named/grouped (e.g., runes, consumables, expensive flips), sorted and filtered. Portfolio has cash invested, unsold quantity, realized GP, unrealized *estimated liquidation* GP with the low-side observed sale and per-unit tax, and transaction journal. Partial sales maintain correct cost basis and fee accounting. Distinguish inventory from a separate wishlist. Import/export with schema validation and user confirmation; do not silently overwrite existing trades.

### Alerts

Rule list: price above/below, margin above, ROI above, trading-volume spike, % movement over window, stale quote recovery. Show rule, threshold, item, last checked and last fired. v0.3 foreground alerts only unless background Worker/notification permission is actually implemented. Debounce/cooldown and persist acknowledgement. Avoid claiming “push” when not supported.

### Money Making

Tabs: High Alchemy (staff setting and nature-rune cost), Processing/Conversions (curated input/output recipes), GE-Only Flips, Death's Coffer Estimate (requires **verified Jagex GE guide price** or a user-supplied guide price). Explain required levels/time and whether money can be redeemed as GP. Coffer **credit is not spendable GP**, and not all tradeable items are eligible.

### Settings and cross-cutting behavior

Source attribution, refresh interval and rate-limit guidance, last sync vs last observed trade, stale threshold preference, membership/F2P, cash budget, user chosen GE slot count (3/8), font size, reduced motion, chart defaults, data export/import, local delete confirmation, notification settings with status, version, community disclaimer. Required states: skeleton, loading, partial data, empty, stale, error, offline, long list, 2GB+ item price formatting, keyboard displayed, no history.

## Screen acceptance checklist

- 360dp Android portrait works without horizontal scrolling.
- Keyboard never obscures search autocomplete or filter Apply.
- Data used in the dashboard is derived and timestamped; unavailable metrics hidden.
- Buttons and category tiles have working targets and back navigation.
- Labels expose data freshness on both trade sides.
- Landscape/tablet and accessibility large-font modes preserve usability.
