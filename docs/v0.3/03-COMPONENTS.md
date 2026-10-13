# 03 — UI/component blueprint and developer handoff

## Keep the current stack while improving modularity

The present app is plain HTML/CSS/JS loaded inside Android WebView, with Android's Java API bridge for OSRS Wiki prices. This can be modernized without introducing React or an incompatible API. Separate UI from market normalization/math, adding no mandatory backend. If a framework becomes desirable later, a migration should preserve local data schema and GitHub APK build.

## Proposed module layout (not yet implemented)

~~~
/app
  /theme
    tokens.css           color, spacing, typography, states
    shell.css            layout and bottom tabs
    components.css       cards, badges, sheets, item rows
  /data
    api.js               native/web API adapter + error handling
    normalize.js         mapping + latest + 5m/1h/24h -> typed row
    categories.js        deterministic category rules + source notes
    history.js           sample alignment and coverage
    cache.js             TTL with fetchedAt/observationTime
  /domain
    marketMath.js        tax, ROI, turnover estimates, volume
    filters.js           filtering, sorting, validation, presets
    opportunities.js     market strategy registry and ranking
    moneyMaking.js       alchemy, conversions, coffer
    journal.js           cost basis, partial fills, unrealized GP
    alerts.js            foreground alert rules + cooldown
  /state
    persistence.js       versioned schema, migrations, backup
    store.js             current tab, current results, selected item
  /components
    AppShell.js
    BottomNav.js
    TopBar.js
    MarketTicker.js
    MarketOverviewCard.js
    DiscoverySection.js
    CategoryTile.js
    ItemRow.js
    PriceBadge.js
    FreshnessBadge.js
    FilterSheet.js
    FilterChip.js
    RangeField.js
    SortMenu.js
    PriceChart.js
    ProfitBreakdown.js
    EmptyState.js
    ErrorState.js
    Skeleton.js
  /screens
    Home.js
    Markets.js
    CategoryResults.js
    Search.js
    ItemDetail.js
    Watchlists.js
    Alerts.js
    Portfolio.js
    MoneyMaking.js
    Settings.js
/index.html
/android/...
/tests/...
~~~

Suggested incremental refactor: keep exports from current logic.js and app.js functional, extract pure modules one at a time, and update npm tests accordingly. Do **not** break the Android asset bundling build by moving files without updating .github/workflows/android-apk.yml and the native local asset whitelist.

## Screen/component tree

~~~
AppShell
  TopBar (search, alerts, settings)
  MarketTicker (verified observational facts only)
  RouterOutlet
    Home
      MarketOverviewCard x4
      ToolShortcutStrip
      DiscoverySection x6 (ItemRow)
    Markets
      MarketCategoryGroup (CategoryTile xN)
    CategoryResults
      SearchBar
      ResultsToolbar (FilterChip, SortMenu, ViewToggle)
      FilterSheet (Price, Profit, Volume, Movement, Risk, Item groups)
      VirtualizedItemList (ItemRow)
    Search
      KeyboardSafeSuggestionList
      ItemRow
    ItemDetail
      ItemHero, PriceChart, FreshnessBadge
      ProfitBreakdown, HistoryRange, RelatedItems
      WatchAction, AlertAction, TradeAction
    Watchlists
      WatchlistFolder, ItemRow
    Alerts
      AlertRuleEditor, AlertRuleList
    Portfolio
      PortfolioOverview, OpenPosition, TradeLedger
    MoneyMaking
      AlchTable, ConversionRecipes, CofferCreditCalculator
    Settings
      DataSources, Preferences, BackupRestore
  BottomNav
  Toast + ConfirmDialog + GlobalErrorBoundary
~~~

## Core contracts (TypeScript-style interfaces, descriptive only)

~~~
type MarketRow = {
  id: number;
  name: string;
  members: boolean;
  icon: string | null;
  buyLimit: number | null;
  highInstantBuyGp: number | null;
  highObservedAt: number | null; // Unix seconds
  lowInstantSellGp: number | null;
  lowObservedAt: number | null;  // Unix seconds
  oneHourHighVolume: number | null;
  oneHourLowVolume: number | null;
  dayHighVolume: number | null;
  dayLowVolume: number | null;
  highAlchGp: number | null;
  categoryKeys: string[];
  fetchedAt: number;            // client timestamp in ms
  source: 'osrs-wiki';
};

type FlipEstimate = {
  entryGp: number;       // candidate buy near recent low trade
  exitGp: number;        // candidate sale near recent high trade
  grossGp: number;
  taxGp: number;
  netGp: number;
  roiPct: number;
  buyLimit: number | null;
  selectedQty: number;   // explicitly capped
  capacityGp: number;    // max illustrative profit for selectedQty
  flags: string[];       // stale, low-volume, crossed, missing-data
};

type FilterState = {
  categoryKeys?: string[];
  search?: string;
  minPrice?: number | null; maxPrice?: number | null;
  minProfit?: number | null; maxProfit?: number | null;
  minRoi?: number | null; maxRoi?: number | null;
  minOneHourVolume?: number | null;
  minDayVolume?: number | null;
  minBuyLimit?: number | null;
  maxOlderSideAgeMinutes?: number | null;
  minScore?: number | null;
  memberMode?: 'all'|'f2p'|'members';
  sort?: 'net'|'roi'|'volume1h'|'volume24h'|'freshness'|'score';
  sortDirection?: 'asc'|'desc';
  presetId?: string | null;
};

type DiscoveryCategory = {
  id: string;
  group: 'trending'|'flipping'|'volume'|'specialty'|'items';
  title: string;
  description: string;
  requires: string[];    // price/1h/24h/history
  defaultFilter: FilterState;
  rankingKey: string;
  minimumSamples?: number;
};
~~~

## State and event semantics

- User taps a category -> registry supplies the category rule -> shared filter engine combines category and user filters -> normalized rows -> ranked item list. Category rules are **not** just visual links.
- FilterSheet keeps *draft* values until Apply; Cancel rolls back. Save Preset persists validated canonical numbers. Reset restores category defaults, not unrelated global preferences.
- Item Details loads history lazily by ID/timestep and caches only with accurate fetchedAt. Navigation back returns previous sort/filter and scroll position.
- Visual shell never runs expensive sorting at every keystroke: debounce search and memoize normalized rows by snapshot time. Render first 30–50 records then window/paginate.
- Alert rules read normalized numeric facts, not formatted strings. Alert engine never fires repeatedly for an unchanged condition within cooldown.
- Portfolio state is versioned and separate from market cache. Manual prices and actually filled quantities override observed estimate for realized gain/loss.

## Native Android considerations

- WebView local origin is https://appassets.androidplatform.net/assets/. Local /api/* request bridge maps to price data; any new assets must be embedded and whitelisted.
- App's link policy opens external HTTPS in browser; prevent untrusted pages from accessing native JS interfaces.
- file import/export uses Android document picker; keyboard must use adjustResize and visible viewport.
- Avoid requesting irrelevant permissions. Native notifications and background work require an explicit separate permission/capability change.
- Existing Android beta is debug-signed. Persist old app ID and plan signing/migration before releases so local data isn't silently wiped.

## Design-system behavior

- Cards show a source badge only for verified numbers, two trade timestamps when displaying margins, and dash instead of 0 for absent values.
- Colors are semantic, but icons/text also distinguish gains and losses.
- Accessible icon touch targets at least 44 dp; tab labels visible.
- Horizontal swipe on a row should not remove it accidentally. Destructive changes must confirm.
- Respect prefers-reduced-motion; scrolling ticker must pause for screen readers and user interaction.
