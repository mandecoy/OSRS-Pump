# OSRS Pump

**Free, open-source, local-first Grand Exchange market intelligence for Old School RuneScape.**

> Status: **Android v0.3.1-beta.1 source updates submitted for an automated APK build**, featuring a themed mobile market dashboard, Markets discovery categories and advanced filter drawer. Background Android notifications and order-book analytics are not implemented. Beta APKs are debug-signed and may require reinstalling for future updates.

OSRS Pump is an independent community project. Not affiliated with or endorsed by Jagex or the OSRS Wiki. Old School RuneScape and RuneScape are trademarks of their respective owners.

## v0.3 redesign blueprint (planning documents)

The [v0.3 product blueprint](docs/v0.3/README.md) includes all four requested developer specifications: [screen-by-screen OSRS redesign](docs/v0.3/01-SCREENS.md), [prioritized feature backlog](docs/v0.3/02-BACKLOG.md), [UI/component architecture](docs/v0.3/03-COMPONENTS.md) and [advanced market filters/formulas](docs/v0.3/04-FILTERS-AND-FORMULAS.md). **The v0.3 beta implements its theme, Markets discovery categories, item cards and advanced filtering; more advanced analytics, specialty calculators and background notifications remain planned.**

## v0.4.0 Beta 1 — Home, Processing Methods and Back Navigation

- **Android back gesture/button:** navigates through the app's own screen history, restores previous item/category and approximate scroll position, closes open filter sheets, and asks before exiting on Home.
- **Configurable Home:** eight hideable/reorderable sections for budget-flips, top market opportunities, market movers, watchlists, portfolio, trade-size calculator, money-making highlights and reliability indicators. GP budget and layout are saved locally.
- **Processing Methods:** 30 public Wiki-defined recipes covering herb cleaning and unfinished potion creation, each with its own skill requirement and Wiki source.
- **Live processing math:** conservative input costs use recent instant-buy observations; output proceeds use recent instant-sell observations after per-item GE sales tax. The tool includes 24h output volume, ROI, budget-limited capacity, buy-limit constraints when known, and editable *hypothetical* actions/hour.
- **Filters:** recipe group, minimum net profit, profitable-only and net-profit/ROI/volume rankings. Unavailable prices do not become fictional profits.
- **Download:** [v0.4.0 beta APK](https://github.com/mandecoy/OSRS-Pump/releases/download/v0.4.0-beta.1/OSRS-Pump-v0.4.0-beta.1.apk) after GitHub Actions completes. Export the existing portfolio JSON backup before uninstalling an older debug-signed beta.
- **Limitations:** Public Wiki market data shows *completed trades* rather than standing offers. Future fills, investment returns and processing/hour scenarios are not guaranteed. A full device smoke test is still needed.

## Android APK (Beta)

**v0.3.2 Beta 1:** Interactive history chart with GP price labels, touch/keyboard sample inspection showing instant-buy and instant-sell averages plus both trade-volume sides, 1-day/7-day/30-day/90-day views, item image next to the name, and direct OSRS Wiki prices link. Prices are bucket averages of public completed trades. The latest beta is built by GitHub Actions; verify successful release before downloading. Export JSON before replacing debug-signed beta APKs.


**[OSRS Pump Android releases](https://github.com/mandecoy/OSRS-Pump/releases)** — choose v0.3.1-beta.1 after its GitHub Actions build publishes the APK. The prior [v0.3.0-beta.1 release](https://github.com/mandecoy/OSRS-Pump/releases/tag/v0.3.0-beta.1) remains available.

This APK runs the local app UI inside an Android WebView. Native Java code fetches public Wiki prices using an identifiable User-Agent with short-lived caching; it does **not** require running Node.js on the phone. Portfolio, trade journal, watchlists and alert rules remain stored on your device. Export a JSON backup before uninstalling or upgrading beta builds.

On Android, open the downloaded APK and approve **Install unknown apps** for the app used to open it when prompted. Only install files from this official repository release. This early APK has passed the GitHub build and JavaScript unit tests, but has **not** yet been confirmed on a physical device. The beta is debug-signed, meaning subsequent beta builds may not install over it without uninstalling first.

The APK currently evaluates price alerts **only while open**; it does not provide background notifications or automation of in-game trades.

### Building another APK

The [Android APK GitHub Actions workflow](.github/workflows/android-apk.yml) packages the web assets, verifies the Node.js tests, compiles the Android app with Gradle and uploads the compiled APK as a build artifact. It creates the initial tagged beta GitHub release once. To build newer versions, increment the app version, package name/versionCode as needed and create a new release tag and asset. For stable upgradable releases, use a securely stored permanent release-signing key (never commit it).

### Changes in v0.3.1 Beta 1

- Category filters no longer silently impose a three-hour age cutoff or positive-margin restriction on unrelated views.
- Market subcategories and Flip Finder start with **10 results** and load **10 more** per tap.
- High Margin and High ROI discovery includes all observed positive margins without arbitrary fixed volume/age exclusion, with user-selected filters still available.
- High Alchemy scans every mapped item with a current instant-buy trade, even when no instant-sell trade exists. Estimated profit = high-alch coins - last instant-buy price - current nature rune instant-buy price; **no GE selling tax applies to the alch spell**.
- Individual Home/Markets/Flip Finder item cards show available **24-hour traded-unit volume**, plus hourly volume, freshness and after-tax GE flip estimates.
- Watchlist alerts and portfolio trades accept item names through a searchable dropdown, retaining numeric IDs only as internal identifiers.
- Added filter/alchemy regression tests. Prices are observed trades rather than guaranteed buy/sell offers.
- This source revision is not a claim of successful APK publication or physical-device testing; verify the GitHub release before installing.

### What's new in v0.3.0-beta.1

- Original OSRS-inspired dark stone and bronze/gold mobile styling.
- Redesigned Home with market summary cards and actual Wiki price-feed observations.
- Markets tab with 23 item-discovery views grouped by Trending, Flipping, Volume, Money Making, and Item Types.
- Mobile-friendly item cards showing icons, observed low/high, net profit after tax, 1h volume, freshness and estimated ROI.
- Advanced filter drawer: price min/max, net profit, ROI, budget, buy limit, 5m/1h/24h volume, freshness and membership.
- Presets for liquid flips, under-100K flips, higher margin, ROI and big-ticket items.
- Uses the public OSRS Wiki 24h aggregate feed to compare recent prices with the daily average; **not** a true end-to-end 24h percentage price change.
- Existing local trades and watchlist kept in the same local-storage namespace. For safety, **export your JSON backup before removing any old beta**.
- New feature calculations are covered by JavaScript tests; the Android APK passed GitHub Actions build checks. It has not yet been tested on your specific phone.

### Updating from previous debug beta

Android debug signing may differ between GitHub CI runs. If Android says the new app cannot be installed as an update, **first open the old OSRS Pump → Settings → Export JSON**, save your backup outside the app, then uninstall the old beta, install the new APK and import that JSON. Uninstalling without a backup clears local data.

See [v0.3 release notes](docs/releases/v0.3.0-beta.1.md). Background push notifications, full historical ATH/ATL, Death's Coffer sourcing, and a curated recipe database are **not yet implemented**.

## Available now

- **Market overview:** latest public transaction prices, high-level statistics, profitable-looking recent margins, and a watchlist.
- **Flip Finder:** min/max buy price, min/max estimated net profit, min/max ROI, min/max hourly trade volume, membership, item categories, budget, max quote age, and quality score; presets for liquid, inexpensive, or high-ROI flips.
- **Item intelligence:** item-specific trade history, 24-hour min/max of *aggregated average* prices, quartile-based historical entry/exit zones, trading volume and quality warnings.
- **Portfolio:** record actual buy prices, purchased quantity, sold quantity, sold prices, realize profit after GE sale tax and estimate open-position P/L against latest instant-sell price.
- **Watchlist and alerts:** unlimited device-local watchlist and threshold rules, evaluated during active app sessions (foreground only).
- **Money-making:** high-alchemy profitability using public high-alch and nature-rune values; configurable processing/crafting calculator.
- **Privacy:** no account, no paid key, no telemetry and no cloud database; JSON export/import for local journal data.
- **Checks:** built-in Node.js unit tests and GitHub Actions.

## Get started

Requirements: **Node.js 22 or newer** and an Internet connection for public prices.

```bash
cd OSRS-Pump
npm start
```

Open **http://localhost:8765** in a browser. You can run the site on a trusted home network using your computer's LAN IP and port 8765 (do not expose this local server directly to the public Internet).

```bash
npm test
npm run check
```

No `npm install` required. The starter uses only built-in Node.js modules.

### Configure API identification

The local server sends a descriptive `User-Agent` to the community API. Optionally set `OSRS_PUMP_CONTACT` to a contact method before launching. For example:

```bash
OSRS_PUMP_CONTACT='GitHub: mandecoy/OSRS-Pump' npm start
```

The application batches public market fetches, applies caching and does not request a fresh history series for every market item. API use should follow the OSRS Wiki's [acceptable-use guidance](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices).

## Public data — no subscription feeds

| Endpoint | Role |
| --- | --- |
| `https://prices.runescape.wiki/api/v1/osrs/mapping` | Public item IDs, names, GE buy limits and high-alchemy values |
| `https://prices.runescape.wiki/api/v1/osrs/latest` | Latest observed instant-buy and instant-sell trades, each with timestamps |
| `https://prices.runescape.wiki/api/v1/osrs/1h` | Recent hourly average prices and transaction volume |
| `https://prices.runescape.wiki/api/v1/osrs/5m` | Recent five-minute average prices and transaction volume |
| `https://prices.runescape.wiki/api/v1/osrs/timeseries?id=4151&timestep=1h` | Historical averages/volume per item |

### Interpreting prices correctly

OSRS Wiki's `low` is the most recent **instant-sell** trade, a price a patient flipper *might* buy at; `high` is the most recent **instant-buy** trade, a price a patient flipper *might* sell at. These are **observations**, not firm orders or guaranteed executions.

The 24-hour high and low displays are extrema **of historical interval averages**, not exact individual-trade highs/lows, since exact extrema are not published in the data we use. All volume values represent recorded traded quantity, **not** resting bid/ask depth. Quotes can be stale, including for expensive or illiquid items.

As of October 2026, the OSRS Grand Exchange sale tax is **2% per item, rounded down and capped at 5 million gp per item**, subject to exemptions. Purchase tax is zero. App calculations account for the listed exemptions, but check game updates before relying on them: [OSRS Wiki Grand Exchange](https://oldschool.runescape.wiki/w/Grand_Exchange).

Our confidence score is a transparent heuristic derived from trade age, hourly volume, observed spread and positive/negative margins. **It is not a forecast**.

## Keep your personal data local

The browser's `localStorage` contains only user-entered trade history, selected items, filter settings, watchlist and alert rules. The public market data comes from the local proxy; **there is no hosted user backend**. Export settings to JSON before clearing browser storage or replacing devices. The export contains your private trading details — treat it as personal information.

## GitHub repository setup

1. Open [New GitHub repository](https://github.com/new).
2. Owner: **`mandecoy`**; repository: **`OSRS-Pump`**; description:
   `Free, open-source OSRS Grand Exchange market analyzer, flipping tracker, price alerts, and money-making toolkit for Android.`
3. Choose **Public**, **README = off**, **.gitignore = None**, and **License = None**, **if uploading all files from this ZIP directly**. (If you've already initialized with README, `.gitignore`, or MIT, you can instead upload and overwrite matching files.)
4. Upload all files **inside** this folder using GitHub's **Add file → Upload files**; keep the directory structure and commit to `main`.
5. In **About**, add topics: `osrs`, `old-school-runescape`, `grand-exchange`, `flipping`, `market-tracker`, `android`, `runescape`, `open-source`, `money-making`.
6. Check **Actions** for automated unit tests. Set **Settings → General → Features** as preferred; turn on **Issues** for a development backlog.
7. Under **Settings → Branches**, protect `main` when collaborators join; require passing tests before merging.

Repository URL after you create it: `https://github.com/mandecoy/OSRS-Pump`.

### Upload using Git (alternative)

```bash
git init
git add .
git commit -m "Initialize OSRS Pump market analyzer"
git branch -M main
git remote add origin https://github.com/mandecoy/OSRS-Pump.git
git push -u origin main
```

Create an empty remote repository first, and run commands from this folder. If you initialize the remote with a README, use an ordinary pull/merge workflow instead of forcibly overwriting it.

## Android roadmap

The development server is **not** an Android APK. Production priorities:

1. Test the native Android WebView beta on actual devices; address WebView bugs and make navigation/file import/export more robust.
2. On-device SQLite history, proper watchlist/portfolio database and data migrations. No external backend required for personal state.
3. WorkManager-based scheduled checks and local Android notifications, honoring background execution and minimum periodic intervals. Exact-to-the-minute notifications cannot be guaranteed without a persistent external service.
4. Daily stored public market snapshots to allow locally calculated trends, historical screening, backtesting and volatility analytics without a paid service.
5. Accurate recipe definitions based on sourced public wiki methods, with requirements, buy limits, yield, processing speed and profit/hour.
6. Move from the existing GitHub Actions debug-signed APK build to stable release signing. Never commit signing keys or private credentials.

## License

MIT licensed **original app code**. OSRS Wiki data, branding, article content and third-party images have their own terms; the MIT code license **does not relicense their content**. UI avoids packaging third-party icons or copying proprietary competitor implementations.
