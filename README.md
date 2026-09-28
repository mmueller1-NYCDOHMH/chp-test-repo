# NYC Community Health Profiles — Developer Guide

> **Updating copy, indicators, or data?** See **[CONTENT-GUIDE.md](CONTENT-GUIDE.md)** — the copy deck, the Sections tab, data files, tokens, and worked examples. This file is for developers.

_Last reviewed 2026-09-28 against the code._

---

## Contents

- [Getting started](#getting-started)
- [Architecture in one page](#architecture-in-one-page)
- [How a page renders](#how-a-page-renders)
- [Content pipeline (`npm run copy`)](#content-pipeline-npm-run-copy)
- [Folder and file structure](#folder-and-file-structure)
- [Routes](#routes)
- [Where indicator metadata comes from](#where-indicator-metadata-comes-from)
- [Sections: standard vs. custom](#sections-standard-vs-custom)
- [URL-driven state](#url-driven-state)
- [Window events](#window-events)
- [Indicator flyout](#indicator-flyout)
- [Cross-component hover sync](#cross-component-hover-sync)
- [Scroll and anchors](#scroll-and-anchors)
- [Accessibility conventions](#accessibility-conventions)
- [Colors](#colors)
- [How to add…](#how-to-add)
- [Key constraints](#key-constraints)

---

## Getting started

```bash
npm install
npm run dev        # runs `npm run copy` first (predev), then next dev
```

Open <http://localhost:3000> — the root route redirects to the default neighborhood (`DEFAULT_NEIGHBORHOOD_ID` in `src/lib/utils/constants.js`).

| Script | Does |
|---|---|
| `npm run copy` | Builds the generated copy/structure JSON from the CSVs (see below) |
| `npm run dev` / `npm run build` | Run `copy` first automatically |
| `npm run lint` | ESLint |

**Environment:** `NYC_GEOCLIENT_KEY` (server-only) for the `/api/geocode` address lookup. Set it in `.env.local` locally and in the Netlify dashboard for deploys (see `netlify.toml`).

**Stack:** Next.js 16 (App Router, React Compiler, Turbopack) · React 19 · Tailwind 4 · Vega-Lite via `vega-embed` · Leaflet / `react-leaflet` · `react-markdown`. Deployed on Netlify with `@netlify/plugin-nextjs`.

---

## Architecture in one page

Four layers, each with one job. Components sit underneath and never know which page they're on or where their data came from.

| Layer | Lives in | Owns |
|---|---|---|
| **Data** | `data/indicators/`, `data/metadata/` (data team) | Values per geography; source, time period, methods, unit, decimals |
| **Copy & structure** | `content/copy/measure-copy.csv` + `sections.csv` → generated JSON | Which indicators appear, where, in what order, and all indicator copy |
| **Display presets** | `src/config/presets/` | `indicatorDisplay.js` (delta direction, footnote type, distributions) · `layoutPresets.js` |
| **Page config** | `src/config/pages/`, `src/config/sections/`, registries | How each section renders (standard grid vs. bespoke block) |

Data reading and normalization live only in `src/lib/data/` (server-only). Anything that needs reshaping (ranking, scaling, suppression) should be asked of the data export rather than added as a JS transform.

---

## How a page renders

```
/neighborhood/[id]
  → app/neighborhood/[id]/page.js      validates id (notFound() if unknown), generateMetadata
  → getData({ geography: id })          name, geoId, borough (from public/data/CD.geojson)
  → pageRegistry['neighborhood-profile'] → neighborhoodProfile config
  → CHPBuilder                          loops config.sections
      → SectionWrapper                  applies the section's layout preset
          → Block                       looks up block.type in blockRegistry,
                                        injects cards from the copy deck
              → component               (IndicatorChartGrid, NeighborhoodOverviewHero, …)
```

`src/config/pages/neighborhoodProfile.js` builds the section list from `structure.json` (via `siteNav.js`), so **section order comes from the copy deck**:

1. `neighborhoodOverview` (At a Glance hero)
2. For each category: a `categoryHeader` block (title + intro from the deck), then each section:
   - `CUSTOM_SECTIONS[id]` if it has a bespoke file, otherwise
   - `buildStandardSection(id)` → `sectionHeader` + `indicatorChartGrid`
   - Bespoke sections nested under a parent (e.g. Avertable Deaths under Economic) render as extra cells inside the parent's card grid (`extraBlocks`).

`Block.jsx` fills `indicatorChartGrid` / `neighborhoodOverviewHero` props at render time via `loadSectionIndicators()` — every keyed deck row whose `topic` is that section id, in sheet order.

---

## Content pipeline (`npm run copy`)

`scripts/build-copy.js` reads:

- `content/copy/measure-copy.csv` — the DOHMH copy deck
- `content/copy/sections.csv` — the Sections tab (sheet names → ids, headings, custom sections)
- `src/config/presets/indicatorDisplay.js` — to know which keys are distributions
- `src/config/registries/sectionIds.js` — every id there must exist in `sections.csv`
- `data/indicators/`, `data/metadata/` — existence checks only

and writes (never hand-edit):

| Output | Read by |
|---|---|
| `content/copy/indicatorCopy.json` | `src/config/indicatorCopy.js` → cards, search, narrative, indicator page |
| `content/copy/structure.json` | `siteNav.js`, `neighborhoodProfile.js`, `loadPrintManifest.js` |
| `src/config/content/sectionTitles.json` | Section headers, custom section files, indicator page |

Errors (unknown Section/Subsection, duplicate Key, missing column, stale section id) exit 1 and write nothing. Warnings (missing data/metadata file, blank `type`/`of`, category without intro) print but don't block.

---

## Folder and file structure

```
/
├── content/                     ← editable content (see CONTENT-GUIDE.md)
│   ├── copy/                    ← measure-copy.csv, sections.csv + generated JSON
│   ├── site/                    ← header, footer, about, intro modal, glossary, phrases, messages
│   └── print/printSettings.json
├── data/                        ← data-team exports, read directly
│   ├── indicators/{key}.json
│   └── metadata/{key}-meta.json
├── public/data/CD.geojson       ← community district boundaries (maps + neighborhood list)
├── scripts/build-copy.js        ← content pipeline
├── .github/                     ← manual "Cleanup Unused Files" workflow + scanner
└── src/
    ├── app/
    │   ├── layout.js, globals.css
    │   ├── page.js                       ← redirects / → default neighborhood
    │   ├── neighborhood/[id]/            ← page, layout, loading, not-found
    │   ├── indicator/[key]/              ← standalone indicator page + jumpers + comparison chart
    │   ├── print/                        ← print layout + print.css + neighborhood/[id]/page.js
    │   ├── about/                        ← page + loading
    │   └── api/geocode/route.js          ← server proxy to NYC Geoclient
    │
    ├── components/
    │   ├── core/          CHPBuilder, Block, FlyoutShell (+ flyoutShell/ hooks),
    │   │                  IndicatorFlyoutContent, IntroModal (+ introModal/), MapHoverTooltip
    │   ├── layout/        PageLayout, PageHeader, Footer, Sidebar (+ sidebar/ hooks),
    │   │                  TopicNav (+ topicNav/ hooks), StickyContextBar, StickyOffsetSync,
    │   │                  SectionWrapper, Bone, LanguageToggle, KeyboardShortcutsButton,
    │   │                  ShortcutsToast, RouteAnnouncer, LoadingAnnouncer, MobileCategoryPager
    │   ├── data-display/  IndicatorChartGrid, NeighborhoodOverviewHero,
    │   │                  ComparisonStatTilesClient (+ comparisonStatTiles/),
    │   │                  ComparisonPyramidChart(+Client), PyramidChartSection,
    │   │                  ComparisonBarChart(+Client), PrematureDeathOverviewSection,
    │   │                  PrematureDeathChartsRow, PrematureMortCauseCard,
    │   │                  AvertableDeathsSection, AvertableDeathsChart, CompareToCityToggle,
    │   │                  DistributionStrip, RankDotStrip, AnimatedValue, AnimatedBar,
    │   │                  AtAGlanceTitle, useRovingDots
    │   ├── charts/        ExpandableChartCard (+ expandableChartCard/: modals, embed,
    │   │                  notes, legend, focus trap, domToCanvas), VegaLiteChart
    │   ├── maps/          NeighborhoodMap (+ neighborhoodMap/ hooks), ChoroplethMap, ModalMap
    │   ├── controls/      UnifiedSearch (+ unifiedSearch/), IndicatorSearch, AddressSearch,
    │   │                  ComparisonNeighborhoodSelector, NeighborhoodGroups,
    │   │                  BackToTopButton, ContinueToNextCategoryButton
    │   ├── content/       CategoryHeader, SectionHeader, GlossaryTerm, MarkdownRenderer
    │   └── print/         PrintReportHeader/Footer, PrintLegend, PrintButton,
    │                      PrintCategoryBlock, PrintSubsectionTable, PrintIndicatorRow
    │
    ├── config/
    │   ├── pages/neighborhoodProfile.js   ← section order from the deck; CUSTOM_SECTIONS
    │   ├── sections/                      ← bespoke sections only: neighborhoodOverview,
    │   │                                     healthOutcomes, avertableDeaths
    │   ├── registries/                    ← blockRegistry, pageRegistry, sectionIds
    │   ├── presets/                       ← indicatorDisplay, layoutPresets
    │   ├── layout/resolveLayoutClasses.js
    │   ├── nav/siteNav.js                 ← nav from structure.json
    │   ├── content/sectionTitles.json     ← generated
    │   ├── indicatorCopy.js               ← imports generated indicatorCopy.json
    │   └── searchIndex.js
    │
    └── lib/
        ├── data/      (server-only) loadIndicatorData, loadSectionIndicators, getIndicatorMeta,
        │              normalizeDataMeta, getData, getNeighborhoods, resolveOverviewData,
        │              getIndicatorSummaries, joinDistributionFiles, getCancerRankingData,
        │              getPrematureMortCauseData, getAvertableDeathsFallback, loadPrintManifest
        ├── copy/      getNarrativeCopy, resolveNarrative (token substitution)
        ├── charts/    buildBarChartSpec, chartColors
        ├── context/   ComparisonContext, MobileCategoryContext (experimental)
        ├── geoclient/ geocode (client → /api/geocode)
        ├── glossary.js
        └── utils/     compareIndicator, distributionSegments, scrollToSection, mapTiles,
                       fetchGeoJson, formatGeography, slugify, strings, highlight,
                       resolveProps, resolveTemplate, inertOthers, tablistKeyDown, constants
```

Every source file opens with a `FILE / PURPOSE` header comment — read that first.

---

## Routes

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.js` | Redirects to `/neighborhood/{DEFAULT_NEIGHBORHOOD_ID}` |
| `/neighborhood/[id]` | `app/neighborhood/[id]/page.js` | The profile. `generateMetadata` per neighborhood; unknown id → `not-found.jsx`; `loading.jsx` skeleton |
| `/indicator/[key]?geo=[id]` | `app/indicator/[key]/page.js` | Standalone, citable indicator page (no app shell): indicator + neighborhood pickers, insight, narrative, ranked chart with comparison, methodology, CSV/PNG download. Target of the flyout's "Full page" link. |
| `/print/neighborhood/[id]` | `app/print/neighborhood/[id]/page.js` | Printable/accessible report; own minimal layout + `print.css`; structure from the deck, print-only tweaks from `content/print/printSettings.json` |
| `/about` | `app/about/page.js` | Content from `content/site/about.json` |
| `/api/geocode?address=` | `app/api/geocode/route.js` | Server proxy to NYC Geoclient; keeps `NYC_GEOCLIENT_KEY` off the client |

---

## Where indicator metadata comes from

`getIndicatorMeta(key)` (server-only) merges three sources into one object:

| Source | Fields |
|---|---|
| `data/metadata/{key}-meta.json` (via `normalizeDataMeta.js`) | title/label/subtitle fallbacks, source, timePeriod, methodsNote, unit, decimals, ageAdjustment, denominatorSource |
| `content/copy/indicatorCopy.json` (generated) | title (`Measure`), context, comparison, type, of, detail, units, indicatorDetail, topic, flag |
| `src/config/presets/indicatorDisplay.js` | higherIsBetter, showDelta, dataSource, sourceUrl, kind/segments, dataMetaKey |

`deltaSuffix` (`' pts'`) is derived when the data team's `Unit` is `%`. Distribution indicators (`age-distribution`, `race-ethnicity`) read metadata from a segment file via `dataMetaKey`.

The old `content/indicators/*.meta.json`, `src/config/indicatorMeta.json`, `content/sections/*.json` and `indicatorRegistry` approaches are all **retired** — don't reintroduce them.

---

## Sections: standard vs. custom

Most sections need no code: a row in `sections.csv` + rows in the deck → `buildStandardSection(id)`.

A section needs its own file in `src/config/sections/` only when it renders something other than a card grid:

| File | Why it's custom |
|---|---|
| `neighborhoodOverview.js` | At a Glance hero (stat tiles + pyramid charts) |
| `healthOutcomes.js` | Standard grid **plus** the `prematureDeathOverviewSection` block |
| `avertableDeaths.js` | Dot-distribution chart instead of a bar chart; nested into Economic via a `custom` row in `sections.csv` |

Each custom file uses an id constant from `sectionIds.js`, and `build-copy.js` fails if that id isn't in `sections.csv`.

**Block types** (`blockRegistry.js`): `categoryHeader`, `sectionHeader`, `indicatorChartGrid`, `neighborhoodOverviewHero`, `prematureDeathOverviewSection`, `avertableDeathsSection`.

**Layouts** (`layoutPresets.js`): `stacked`, `stackedNoCard`, `twoColumn`, `hero`, `split`, `cardRow`.

---

## URL-driven state

State that should survive a refresh or a shared link lives in the URL (`history.replaceState` + `URLSearchParams`):

| Param | Owner | Values |
|---|---|---|
| `?compare=` | `ComparisonContext` | `citywide` \| `borough` \| `none` — benchmark reference line |
| `?compareTo=` | `ComparisonContext` | a neighborhood id — second CD highlighted in every chart |
| `?tab=` | `sidebar/useSidebarTabs.js` | `neighborhood` \| `search` |
| `?flyout=` | `FlyoutShell` "Copy link", `EmbedModal` | indicator key. **Written but not yet read on load** — a shared link doesn't reopen the flyout yet. |
| `?geo=` | `/indicator/[key]` | neighborhood id |

---

## Window events

Loosely coupled components talk through `window` `CustomEvent`s (all prefixed `chp:`):

| Event | Fired by → used for |
|---|---|
| `chp:map-hover` `{ geoId, name }` | `NeighborhoodMap` → bar highlight in every `VegaLiteChart` (via a Vega signal, no re-render) and the sidebar `MapHoverTooltip` preview |
| `chp:comparison-changed` `{ geoId }` | `ComparisonContext` → charts/maps outside the React tree |
| `chp:section-activated` | TopicNav scroll-spy → sticky bar breadcrumb, sidebar label |
| `chp:open-intro-modal`, `chp:focus-neighborhood-search`, `chp:open-mobile-sheet` | Keyboard shortcuts / buttons → the matching UI |
| `chp:set-paged-category` | Experimental mobile category pager |
| `chp:all-explored` | Explorer badge easter egg |

---

## Indicator flyout

**Files:** `components/core/FlyoutShell.jsx`, `components/core/IndicatorFlyoutContent.jsx`

"Details →" on any card calls `useFlyout().open({ kind: 'indicator', … })`. The flyout shows the card's own mini bar chart with a rank marker, a choropleth map, the insight sentence (neighborhood vs. citywide, and vs. the comparison neighborhood if set), the flagged-estimate footnote when applicable, the methods note and source, and a "Full page" link to `/indicator/[key]`.

Behavior: `role="dialog"` + `aria-modal`, focus trap, Escape and browser Back close it, focus returns to the trigger (`flyoutShell/useFlyoutA11yEffects.js`, `useFlyoutHistoryBack.js`). On mobile it's a draggable bottom sheet (`flyoutShell/useMobileDragSheet.js`).

---

## Cross-component hover sync

**Choropleth ↔ distribution strip (inside the flyout).** `IndicatorFlyoutContent` holds `mapHoveredGeoId` and `stripHoveredGeoId` and passes each to the other component. `ChoroplethMap` keeps callbacks and hover ids in refs (Leaflet handlers bind once) and restyles imperatively:

```js
useEffect(() => {
  stripHoveredGeoIdRef.current = stripHoveredGeoId;
  geoJsonLayerRef.current?.eachLayer(layer => {
    if (layer.feature) layer.setStyle(featureStyle(layer.feature));
  });
}, [stripHoveredGeoId]);
```

**Sidebar map → every chart.** `NeighborhoodMap` dispatches `chp:map-hover`; `VegaLiteChart` responds with `view.signal('hoverGeoId', geoId).run()` — no spec rebuild.

---

## Scroll and anchors

All programmatic scrolling goes through `lib/utils/scrollToSection.js`, which offsets for the sticky TopicNav + context bar (`StickyOffsetSync` keeps the offset in a CSS variable so focused elements aren't hidden under it).

Anchors: categories `#cat-{id}`, sections `#{section-id}`, cards `#indicator-{key}`. Search scrolls to the card first, falling back to the section. TopicNav restores `location.hash` on external entry.

---

## Accessibility conventions

- Search inputs (`UnifiedSearch`, `IndicatorSearch`, intro modal): ↑/↓ move, Enter selects, Escape clears then closes; `role="combobox"` / `listbox` / `option` with `aria-activedescendant`.
- Tablists use `lib/utils/tablistKeyDown.js` (arrow/Home/End).
- Dot strips use a roving tabindex (`data-display/useRovingDots.js`).
- Modals: focus trap + Escape (`expandableChartCard/useModalFocusTrap.js`); background made inert with `lib/utils/inertOthers.js` (chart modals, stat-tile modal, intro modal, mobile sidebar sheet).
- `RouteAnnouncer` and `LoadingAnnouncer` announce navigation and loading to screen readers.
- Keyboard shortcuts are listed in `KeyboardShortcutsButton.jsx` (`SHORTCUTS`).
- Charts should ship a visually hidden table or text alternative (the pyramid charts do); check new chart types against this.

The latest accessibility audit outputs live in `Claude outputs/` (checklist CSV + axe results).

---

## Colors

`src/lib/charts/chartColors.js` is the source of truth for chart/map hex values; `src/app/globals.css` mirrors the ones UI needs as CSS variables. **Keep them in sync by hand** — especially `COMPARISON` ↔ `--color-comparison` (`#C94D18`) and `SELECTED` (`#5646F5`). Full tables in CONTENT-GUIDE.md §12.

---

## How to add…

**An indicator** — no code. Data files + one deck row + `npm run copy`. Optionally a line in `indicatorDisplay.js`. See CONTENT-GUIDE.md Example A.

**A standard section or category** — no code. `sections.csv` + deck rows. CONTENT-GUIDE.md Examples F–G.

**A custom section**
1. Add a row to `sections.csv` (`section`, or `custom` with `Keys` if it nests inside another section).
2. Add an id constant to `src/config/registries/sectionIds.js`.
3. Create `src/config/sections/{name}.js` exporting `{ id, layout, children: [ …blocks ] }` (copy `avertableDeaths.js`).
4. Register it in `CUSTOM_SECTIONS` in `src/config/pages/neighborhoodProfile.js`.
5. `npm run copy`.

**A block type**
1. Build the component under `src/components/data-display/` (server component by default; data reads via `src/lib/data/`).
2. Register it in `src/config/registries/blockRegistry.js`:
   ```js
   import MyBlock from '@/components/data-display/MyBlock';
   export const BlockRegistry = { …, myBlock: MyBlock };
   ```
3. Use it in a section config: `{ id: 'x-my-block', type: 'myBlock', props: { … } }`.

**A page type**
1. Page config in `src/config/pages/`, registered in `pageRegistry.js`.
2. Route under `src/app/` following `neighborhood/[id]`: validate the param, `getData()`, look up the config, render `CHPBuilder`, export `generateMetadata`, add `loading.jsx` / `not-found.jsx`.

---

## Key constraints

- **No data transforms in components.** Reading and normalizing data happens in `src/lib/data/` (server-only — these modules use `fs`). Prefer asking the data export for pre-shaped data over adding JS transforms.
- **No indicator copy in code.** Copy lives in the deck; data facts in `data/metadata/`; display rules in `indicatorDisplay.js`.
- **Never hand-edit generated files** (`indicatorCopy.json`, `structure.json`, `sectionTitles.json`).
- **Section order and membership come from the deck.** Don't hard-code section lists in page configs.
- **Section ids are defined once** — in `sections.csv`, plus `sectionIds.js` for sections with a custom file.
- **Never rename an indicator key once it's live** — keys are in URLs and anchors.
- **Search inputs use `type="text"`**, not `type="search"` (the native clear button conflicts with the custom ×).
- **Leaflet handlers bind once.** Read changing props from refs inside handlers, and restyle with `eachLayer(...setStyle)` rather than remounting the GeoJSON layer.
- **Strict Mode is off** (`next.config.mjs`) because of a dev-only react-leaflet double-mount bug; production is unaffected.
