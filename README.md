# NYC Community Health Profiles — Developer Guide

---

## Contents

- [Getting started](#getting-started)
- [How the config-driven system works](#how-the-config-driven-system-works)
- [Folder and file structure](#folder-and-file-structure)
- [Indicator registry](#indicator-registry)
- [Section ID constants](#section-id-constants)
- [Search index](#search-index)
- [URL-driven state](#url-driven-state)
- [Sidebar tabs](#sidebar-tabs)
- [Neighborhood selector](#neighborhood-selector)
- [Introduction modal](#introduction-modal)
- [Loading skeleton](#loading-skeleton)
- [Dynamic metadata and 404](#dynamic-metadata-and-404)
- [Keyboard navigation conventions](#keyboard-navigation-conventions)
- [Indicator flyout](#indicator-flyout)
- [Cross-component hover sync (map ↔ strip)](#cross-component-hover-sync-map--strip)
- [Cross-chart map hover](#cross-chart-map-hover)
- [Sidebar map: zoom to selected neighborhood](#sidebar-map-zoom-to-selected-neighborhood)
- [Scroll and anchor system](#scroll-and-anchor-system)
- [Animation system](#animation-system)
- [Neighborhood overview hero](#neighborhood-overview-hero)
- [How to add a new indicator](#how-to-add-a-new-indicator)
- [How to add a new section](#how-to-add-a-new-section)
- [How to add a new page](#how-to-add-a-new-page)
- [How to add a new block type](#how-to-add-a-new-block-type)
- [Key constraints](#key-constraints)

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

---

## How the config-driven system works

Every page on the site is defined by a config object, not by bespoke component code. When a route loads, it picks up a config from the page registry, passes it to `CHPBuilder`, and the renderer loops through the config to produce the page. The same components appear on every page — only the config that drives them changes.

There are five layers, each with a single responsibility:

**1. Data files** (`/data/`)
Raw JSON files containing indicator values for every neighborhood, borough, and citywide. These are the only files touched when data is updated. Components never read these files directly.

**2. Indicator registry** (`/src/config/registries/indicatorRegistry.js` + `/src/config/registries/indicators/`)
A catalog of every health indicator in the system. Definitions live in topic-scoped files under `/indicators/`; the main `indicatorRegistry.js` assembles them into a single export. Each entry defines the data file key, display title, source citation, unit labels, decimal precision, whether a higher value is healthier, and which section topic it belongs to.

**3. Section configs** (`/src/config/sections/`)
Each file defines one section of a page: which blocks it contains, in what order, and which indicators each block should display. Sections are reusable — the same section can appear on multiple pages.

**4. Page configs** (`/src/config/pages/`)
An ordered list of sections that make up a page. Nothing else. No logic, no data, no formatting.

**5. Page registry** (`/src/config/registries/pageRegistry.js`)
Maps a string key (e.g. `'neighborhood-profile'`) to a page config object. Routes look up their config here.

The rendering path for every page follows this sequence:

```
URL → route handler → pageRegistry → page config
                                           ↓
                              getData() → neighborhood/geography data
                                           ↓
                                      CHPBuilder
                                           ↓
                          sections → SectionWrapper (layout)
                                           ↓
                               blocks → Block → blockRegistry → React component
```

`CHPBuilder` loops through `config.sections`. For each section it renders a `SectionWrapper` (which applies the layout preset) and then loops through the section's `children` array, rendering each block via `Block`. `Block` looks up the component type in `blockRegistry` and passes the resolved props. No component knows which page it is on or where its data came from.

---

## Folder and file structure

```
/
├── data/
│   ├── indicators/             ← one JSON file per health indicator
│   │   ├── poverty.json
│   │   ├── obesity.json
│   │   ├── life-expectancy.json
│   │   └── child-asthma.json
│   └── hero-stats.json         ← citywide + borough headline stats for the landing page
│
└── src/
    ├── app/                    ← Next.js App Router routes
    │   ├── layout.js           ← root layout (fonts, global styles)
    │   ├── page.js             ← landing page route (/)
    │   └── neighborhood/
    │       └── [id]/
    │           ├── page.js       ← neighborhood profile route (/neighborhood/[id])
    │           ├── loading.jsx   ← full-page skeleton shown during server fetch
    │           └── not-found.jsx ← friendly error page for invalid neighborhood IDs
    │
    ├── components/
    │   ├── core/
    │   │   ├── CHPBuilder.jsx             ← main rendering engine; loops config.sections
    │   │   ├── Block.jsx                  ← resolves a single block to a component + props
    │   │   ├── FlyoutShell.jsx            ← right-side flyout container + context provider;
    │   │   │                                 supports 'section' and 'indicator' kinds;
    │   │   │                                 focus trap, Escape to close, focus return to trigger
    │   │   ├── IndicatorFlyoutContent.jsx ← body of the indicator flyout: choropleth map,
    │   │   │                                 title/units/color key, insight sentence,
    │   │   │                                 distribution strip, description, source;
    │   │   │                                 fully scrollable; owns map↔strip hover state
    │   │   ├── IntroModal.jsx             ← first-visit welcome modal with borough-grouped
    │   │   │                                 neighborhood picker + keyboard navigation + map sync
    │   │   └── MapHoverTooltip.jsx        ← sidebar "At a Glance" stat panel; shows selected
    │   │                                     neighborhood's overview indicators at rest and
    │   │                                     map-hovered district data on hover
    │   │
    │   ├── layout/
    │   │   ├── PageLayout.jsx       ← outer shell: sidebar, header, main content area
    │   │   ├── PageHeader.jsx       ← top nav bar with NYC Health logo
    │   │   ├── Sidebar.jsx          ← two-tab strip (Neighborhood / Find indicator);
    │   │   │                           tab state is URL-driven via ?tab= param
    │   │   ├── SectionWrapper.jsx   ← wraps each section; applies layout preset classes
    │   │   ├── TopicNav.jsx         ← sticky two-level topic nav with scroll-spy;
    │   │   │                           smart hash restore on external/direct entry
    │   │   ├── StickyContextBar.jsx ← neighborhood name + active section breadcrumb
    │   │   └── Breadcrumb.jsx
    │   │
    │   ├── data-display/
    │   │   ├── StatCard.jsx
    │   │   ├── StatGrid.jsx
    │   │   ├── IndicatorCard.jsx
    │   │   ├── IndicatorChart.jsx
    │   │   ├── IndicatorChartGrid.jsx      ← 2-column grid of expandable chart cards
    │   │   ├── BarChart.jsx
    │   │   ├── ChartContainer.jsx
    │   │   ├── HeroCard.jsx
    │   │   ├── CardRow.jsx
    │   │   ├── AnimatedValue.jsx           ← fade + slide-up animation for stat values on mount;
    │   │   │                                  duration 0.75s ease; delay prop for optional stagger
    │   │   ├── AnimatedBar.jsx             ← scaleX animation for pyramid chart bars on mount;
    │   │   │                                  duration 0.75s; transform-origin-aware
    │   │   ├── DistributionStrip.jsx       ← dot-on-a-line chart showing where a neighborhood
    │   │   │                                  sits among all 59 CDs; hover tooltip with 120ms
    │   │   │                                  grace period; responds to mapHoveredGeoId prop;
    │   │   │                                  fires onHoverGeoId for reverse map highlight
    │   │   ├── ComparisonPyramidChart.jsx  ← back-to-back horizontal bar chart; neighborhood
    │   │   │                                  bars grow left, citywide bars grow right; shows
    │   │   │                                  "No data available" placeholder when empty
    │   │   ├── CityOverviewHero.jsx        ← landing page hero panel
    │   │   └── NeighborhoodOverviewHero.jsx ← neighborhood profile hero: stat tiles +
    │   │                                      pyramid charts; all elements animate
    │   │                                      simultaneously on load
    │   │
    │   ├── content/
    │   │   ├── SectionHeader.jsx
    │   │   ├── TextBlock.jsx
    │   │   └── MarkdownRenderer.jsx
    │   │
    │   ├── controls/
    │   │   ├── NeighborhoodSelector.jsx  ← borough-grouped search with keyboard nav
    │   │   ├── IndicatorSearch.jsx       ← full-text search across all registered indicators
    │   │   ├── SectionNav.jsx
    │   │   ├── ComparisonToggle.jsx
    │   │   ├── GeoContextCard.jsx
    │   │   └── AboutSectionLink.jsx
    │   │
    │   ├── charts/
    │   │   ├── VegaLiteChart.jsx        ← Vega-Lite chart renderer (vega-embed)
    │   │   └── ExpandableChartCard.jsx  ← expandable card wrapper; opens indicator flyout
    │   │                                   via useFlyout(); sets per-indicator anchor id;
    │   │                                   focus-visible rings on both buttons;
    │   │                                   Escape closes the expanded modal
    │   │
    │   └── maps/
    │       ├── NeighborhoodMap.jsx  ← sidebar Leaflet map; fires chp:map-hover events;
    │       │                          fitBounds zooms to the selected neighborhood on load
    │       ├── ChoroplethMap.jsx    ← flyout choropleth; colors each CD by indicator value;
    │       │                          drag + pinch-to-zoom enabled; click suppressed;
    │       │                          fires onHoverGeoId on CD hover (via stable ref);
    │       │                          responds to stripHoveredGeoId for reverse highlight
    │       │                          via imperative eachLayer restyle; error/empty state
    │       │                          shown if GeoJSON or data fails to load
    │       └── ModalMap.jsx         ← Leaflet map used inside the intro modal
    │
    ├── config/
    │   ├── pages/
    │   │   ├── landingPage.js
    │   │   └── neighborhoodProfile.js
    │   │
    │   ├── sections/
    │   │   ├── cityOverview.js
    │   │   ├── neighborhoodOverview.js
    │   │   ├── chronicConditions.js
    │   │   └── socialEconomicConditions.js
    │   │
    │   ├── nav/
    │   │   └── siteNav.js
    │   │
    │   ├── registries/
    │   │   ├── sectionIds.js
    │   │   ├── blockRegistry.js
    │   │   ├── pageRegistry.js
    │   │   ├── componentRegistry.js
    │   │   ├── indicatorRegistry.js
    │   │   └── indicators/
    │   │       ├── chronicConditions.js
    │   │       └── socialEconomicConditions.js
    │   │
    │   ├── presets/
    │   │   ├── layoutPresets.js
    │   │   └── indicatorPresets.js
    │   │
    │   ├── layout/
    │   │   └── resolveLayoutClasses.js
    │   │
    │   ├── searchIndex.js
    │   │
    │   └── content/
    │       └── sectionCopy.json
    │
    └── lib/
        ├── data/
        │   ├── getData.js
        │   ├── loadIndicatorData.js
        │   ├── getNeighborhoods.js
        │   ├── getIndicatorSummaries.js
        │   └── neighborhoods.json
        │
        ├── utils/
        │   ├── resolveProps.js
        │   ├── resolveTemplate.js
        │   ├── generateSummary.js
        │   ├── getFlyoutContent.js
        │   ├── scrollToSection.js
        │   ├── compareIndicator.js   ← buildInsight() and computeDelta(); pure functions;
        │   │                            used by IndicatorFlyoutContent to generate the
        │   │                            "higher/lower than citywide" insight sentence
        │   ├── formatGeography.js    ← displayName() strips "(CD12)" suffixes for prose
        │   └── slugify.js
        │
        ├── charts/
        │   └── buildBarChartSpec.js
        │
        └── context/
            └── ComparisonContext.jsx
```

---

## Indicator registry

Indicator metadata is split across topic-scoped files, assembled by a barrel file.

```
/src/config/registries/
├── indicatorRegistry.js          ← barrel: import from here in all section configs
└── indicators/
    ├── chronicConditions.js
    └── socialEconomicConditions.js
```

Each indicator entry shape:

| Field | Purpose |
|---|---|
| `key` | Matches the filename in `/data/indicators/` (no extension) |
| `topic` | Section ID; import from `sectionIds.js` |
| `title` | Full display title used in chart headers and the flyout |
| `subtitle` | Unit or method description |
| `source` | Full source citation string |
| `sourceUrl` | Optional canonical URL for the source data |
| `timePeriod` | Data collection period |
| `label` | Short label for stat tiles and hero panels |
| `unit` | Sub-label shown under the value in stat tiles |
| `displaySuffix` | Appended to the formatted value (e.g. `' yrs'`) |
| `deltaSuffix` | Appended to the delta vs citywide (e.g. `' pts'`) |
| `decimals` | Decimal places for the delta value |
| `higherIsBetter` | Controls delta color direction |
| `description` | Optional plain-language explanation shown in the indicator flyout |

---

## Section ID constants

**File:** `/src/config/registries/sectionIds.js`

Single source of truth for every section ID string. Three things must agree on a section's ID: the section config's `id` field, `siteNav.js` subcategory entries, and indicator `topic` fields. Defining the value once means a rename is a compile error, not a silent scroll-spy breakage.

```js
export const CITY_OVERVIEW_ID              = 'city-overview';
export const NEIGHBORHOOD_OVERVIEW_ID      = 'neighborhood-overview';
export const CHRONIC_CONDITIONS_ID         = 'chronic-conditions';
export const SOCIAL_ECONOMIC_CONDITIONS_ID = 'social-health';
```

Rules:
- Only add a constant once the section config file exists.
- The constant value must exactly match the `id` in the section config.
- Import the constant in: the section file, the matching indicator topic file, and `siteNav.js`.

---

## Search index

**File:** `/src/config/searchIndex.js`

A flat array built at module load time from `indicatorRegistry` and `siteNav`. Each entry has `key`, `title`, `topic`, `anchor` (section-level), and `indicatorAnchor` (per-card). `IndicatorSearch` filters this array on every keystroke. Selecting a result scrolls to `indicatorAnchor` first, falling back to `anchor`. The index is static — never rebuilt at runtime.

---

## URL-driven state

Two pieces of UI state live in the URL via `history.replaceState`:

**Comparison toggle** (`?compare=`)
`ComparisonContext` reads on mount and writes on every change. The default value (`None`) is omitted from the URL to keep links clean.

**Sidebar tab** (`?tab=`)
`Sidebar` reads on mount and writes on tab switch. Valid values: `'neighborhood'` | `'search'`.

Both params coexist and can be round-tripped together.

---

## Sidebar tabs

**File:** `src/components/layout/Sidebar.jsx`

Two tabs: **Neighborhood** (borough chip, selector, map) and **Find indicator** (full-text search). When a user selects an indicator from search results, the sidebar automatically switches back to the Neighborhood tab:

```jsx
<IndicatorSearch onNavigate={() => setActiveTab('neighborhood')} />
```

---

## Neighborhood selector

**File:** `src/components/controls/NeighborhoodSelector.jsx`

Borough-grouped search. Matches on neighborhood or borough name. Groups results under sticky borough headers in fixed order: Manhattan → Bronx → Brooklyn → Queens → Staten Island.

Keyboard: Arrow keys move through results (skipping headers); `Enter` navigates; `Escape` clears or closes.

ARIA: `role="combobox"` on input, `role="listbox"` on list, `role="option"` on each item, `aria-activedescendant` tracks focus.

Uses `type="text"` (not `type="search"`) — see [Key constraints](#key-constraints).

---

## Introduction modal

**Files:** `src/components/core/IntroModal.jsx`, `src/components/maps/ModalMap.jsx`

Shown on first visit; suppressed once dismissed or after a neighborhood is selected (persisted via `localStorage`). Two-column layout: left has search + borough-grouped list; right has a Leaflet map. `hoveredId` state is lifted so hovering either side syncs the other, including arrow-key navigation.

To force the modal to reappear for testing, clear the `chp_intro_seen` key from `localStorage`.

---

## Loading skeleton

**File:** `src/app/neighborhood/[id]/loading.jsx`

Next.js renders this automatically during the server fetch. It mirrors the full page structure with `animate-pulse` skeleton bones. No configuration required.

---

## Dynamic metadata and 404

`src/app/neighborhood/[id]/page.js` exports `generateMetadata` for per-neighborhood `<title>` and Open Graph tags. Before fetching, the route validates the `id` param and calls `notFound()` for unknown IDs, which renders `not-found.jsx` — a standalone page with a link back to `/`.

---

## Keyboard navigation conventions

All search inputs follow the same contract:

| Key | Action |
|---|---|
| `↓` / `↑` | Move through results |
| `Enter` | Select focused result (falls back to first if none focused) |
| `Escape` | Clear query first; dismiss if query is already empty |

All modal and flyout overlays close on `Escape`:
- Expanded chart modal (`ExpandableChartCard`)
- Indicator flyout (`FlyoutShell`) — also traps Tab focus within the panel and returns focus to the trigger element on close
- Intro modal — `Escape` clears query first; second `Escape` dismisses

---

## Indicator flyout

**Files:** `src/components/core/FlyoutShell.jsx`, `src/components/core/IndicatorFlyoutContent.jsx`

Clicking "More about this indicator" on any chart card opens a right-side flyout panel. `FlyoutShell` provides a React context (`useFlyout`) that any component beneath it can call:

```js
const { open, close } = useFlyout();

open({
  kind:          'indicator',
  title:         'Incarcerations',
  subtitle:      'Rate per 100,000 adults · Age-adjusted',
  source:        'NYC Department of Correction (2023–2024)',
  sourceUrl:     'https://...',
  description:   'Number of people incarcerated...',
  indicatorData: [...],   // full flat array: all CD rows + citywide row
  geoId:         310,     // numeric GeoID of the selected neighborhood
});
```

Two payload kinds:
- `kind: 'indicator'` — renders `IndicatorFlyoutContent`
- `kind: 'section'` (default) — renders a markdown flyout for section "About" content

**`IndicatorFlyoutContent` layout (top to bottom, fully scrollable):**
1. Choropleth map (400px tall) — all 59 CDs colored by indicator value; drag and pinch-to-zoom enabled
2. Indicator name + units + low→high color key
3. Insight sentence — neighborhood value vs. citywide, with directional badge
4. Distribution strip — dot-on-a-line across all 59 CDs
5. "About this indicator" description (if provided)
6. Data source + optional link

**Animation:** backdrop fades in immediately; panel slides in 50ms later. On close, panel exits with `ease-in`.

**Accessibility:** `role="dialog"` + `aria-modal="true"`; focus moves to first focusable element on open; Tab/Shift-Tab trapped within panel; Escape closes and returns focus to the trigger element; close button has `focus-visible` ring.

---

## Cross-component hover sync (map ↔ strip)

Hovering a CD on the choropleth highlights the corresponding dot in the distribution strip, and vice versa.

**Map → strip**

`ChoroplethMap` accepts `onHoverGeoId`. The callback is stored in a `ref` so Leaflet's event handlers — bound once at layer creation — always call the current version:

```js
const onHoverGeoIdRef = useRef(onHoverGeoId);
useEffect(() => { onHoverGeoIdRef.current = onHoverGeoId; }, [onHoverGeoId]);
```

`IndicatorFlyoutContent` holds `mapHoveredGeoId` state and passes it to `DistributionStrip`. The strip uses it to highlight the matching dot when no dot is directly hovered (direct hover always wins).

**Strip → map**

`DistributionStrip` accepts `onHoverGeoId` and calls it on dot enter/leave. `IndicatorFlyoutContent` holds `stripHoveredGeoId` and passes it to `ChoroplethMap`.

`ChoroplethMap` stores the value in a ref and imperatively restyles all features when it changes, using a `geoJsonLayerRef` set via the `<GeoJSON>` element's `ref` callback:

```js
useEffect(() => {
  stripHoveredGeoIdRef.current = stripHoveredGeoId;
  if (!geoJsonLayerRef.current) return;
  geoJsonLayerRef.current.eachLayer(layer => {
    if (layer.feature) layer.setStyle(featureStyle(layer.feature));
  });
}, [stripHoveredGeoId]);
```

This is an imperative update — no React re-render, no GeoJSON remount.

---

## Cross-chart map hover

Hovering a community district on the sidebar Leaflet map highlights the corresponding bar in every visible indicator chart and updates the sidebar "At a Glance" panel.

`NeighborhoodMap` fires a custom window event:

```js
window.dispatchEvent(new CustomEvent('chp:map-hover', {
  detail: { geoId: 305, name: 'East Flatbush' }  // geoId: null on mouseout
}));
```

Two independent listeners respond:

**Bar highlighting (`VegaLiteChart.jsx`):** drives a named Vega signal directly on the view — no spec rebuild or re-render:

```js
view.signal('hoverGeoId', e.detail.geoId ?? null).run();
```

**Sidebar stat panel (`MapHoverTooltip.jsx`):** a "Map Preview" overlay fades in when hovering a different district, and fades out on mouseout. The panel only shows indicators listed in `neighborhoodOverview`'s `statTiles`, and stays in sync with that config automatically.

---

## Sidebar map: zoom to selected neighborhood

`NeighborhoodMap` calls `fitBounds` in a `useEffect` with `[geo, selectedId, leaflet]` as dependencies — `leaflet` is included because the map is dynamically imported and `mapRef.current` may be `null` when earlier effects fire. The call is also wrapped in `requestAnimationFrame` to give `MapContainer` one frame to mount before it runs.

---

## Scroll and anchor system

**Utility:** `src/lib/utils/scrollToSection.js`

All scroll-to-section calls go through this utility, which accounts for the sticky topic nav height:

```js
export function scrollToSection(anchor) {
  const id = String(anchor).replace(/^#/, '');
  const el = document.getElementById(id);
  if (!el) return;
  const navEl = document.getElementById('topic-nav');
  const navHeight = navEl ? navEl.getBoundingClientRect().height : 56;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 16;
  window.scrollTo({ top, behavior: 'smooth' });
}
```

Each `ExpandableChartCard` sets `id="indicator-{key}"` on its outer wrapper so `IndicatorSearch` can scroll directly to the card rather than the section top.

**Smart hash restore (TopicNav):** on external entry, `TopicNav` reads `window.location.hash` on mount and scrolls to it, distinguished from in-app navigation via `document.referrer`. This prevents hash bleed when navigating between profiles.

---

## Animation system

Two client components handle mount animations. All delays default to `0` so elements in a group animate simultaneously.

**`AnimatedValue`** — fades + slides up a stat value on mount. Used in `NeighborhoodOverviewHero` stat tiles.
- `opacity: 0 → 1`, `translateY: 6px → 0`
- Duration: `0.75s ease`

**`AnimatedBar`** — scaleX animates a pyramid chart bar from 0 to full width on mount. `transform-origin` is set per bar to grow toward the center spine.
- `transform: scaleX(0) → scaleX(1)`
- Duration: `0.75s cubic-bezier(0.4, 0, 0.2, 1)`

To add stagger, pass a non-zero `delay` (ms) to either component.

---

## Neighborhood overview hero

**File:** `src/components/data-display/NeighborhoodOverviewHero.jsx`

Server component. Renders the "at a glance" section at the top of every neighborhood profile:

1. **Stat tiles** — animated value, label, optional delta badge (rounded-full pill), time period
2. **Pyramid charts** — `ComparisonPyramidChart` side by side: Age Breakdown and Race / Ethnicity
3. **Source footnote**

All data resolved at server-render time via `resolveOverviewData`. Adding, removing, or reordering tiles or charts requires only a config change to `DEFAULT_STAT_TILES` or `DEFAULT_PYRAMID_CHARTS`.

**`ComparisonPyramidChart`** — back-to-back horizontal bar chart. Neighborhood bars grow left from center; citywide bars grow right. Both sides share the same scale. Includes a visually hidden accessible table for screen readers. Renders a dashed "No data available" placeholder when `segments` is empty.

---

## How to add a new indicator

**Step 1 — Add the data file**

Create `/data/indicators/{your-key}.json`. The filename (without `.json`) is the key used everywhere else.

**Step 2 — Add to the right topic file**

```js
// /src/config/registries/indicators/chronicConditions.js
import { CHRONIC_CONDITIONS_ID } from '../sectionIds';

export const chronicConditionIndicators = {
  smokingRate: {
    key:            'smoking-rate',
    topic:          CHRONIC_CONDITIONS_ID,
    title:          'Adult Smoking Rate',
    subtitle:       '% of adults who currently smoke',
    source:         'NYC Community Health Survey (2019–2022)',
    sourceUrl:      'https://...',
    description:    'Share of adults who report currently smoking cigarettes.',
    timePeriod:     '2019–2022',
    label:          'Adult Smoking',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },
};
```

If the indicator belongs to a new topic, create `/src/config/registries/indicators/{topicName}.js` and import + spread it in `indicatorRegistry.js`.

**Step 3 — Add it to a section**

```js
import { indicators, asChartConfig, asStatTile } from '../registries/indicatorRegistry';

asChartConfig(indicators.smokingRate)   // as a chart card
asStatTile(indicators.smokingRate)      // as a stat tile
```

No component code changes needed. The indicator automatically appears in `IndicatorSearch`.

Note: the sidebar "At a Glance" panel only shows indicators listed in `neighborhoodOverview`'s `statTiles`. Add it there explicitly if you want it in the sidebar panel.

---

## How to add a new section

**Step 1 — Add a section ID constant** in `sectionIds.js`.

**Step 2 — Create the section config file** in `/src/config/sections/`. Import the ID constant; use it for the `id` field.

Available block types (all keys in `blockRegistry.js`): `sectionHeader`, `indicatorChartGrid`, `indicatorCard`, `indicatorChart`, `neighborhoodOverviewHero`, `cityOverviewHero`, `heroCard`, `cardRow`, `stat`, `chart`, `text`, `aboutLink`.

Available layouts (all keys in `layoutPresets.js`): `stacked`, `twoColumn`, `hero`, `split`, `cardRow`.

**Step 3 — Add the section to a page config** in `/src/config/pages/`.

**Step 4 — Wire it into the nav** in `/src/config/nav/siteNav.js` using the imported ID constant.

---

## How to add a new page

**Step 1 — Create a page config** in `/src/config/pages/`.

**Step 2 — Register it** in `pageRegistry.js`.

**Step 3 — Create the route** under `/src/app/`. Follow the same pattern as the neighborhood page: validate the param, call `getData()`, look up config from `pageRegistry`, pass both to `CHPBuilder`, export `generateMetadata`. Add `loading.jsx` and `not-found.jsx` alongside.

---

## How to add a new block type

**Step 1 — Build the component** under `/src/components/data-display/`.

**Step 2 — Register it** in `blockRegistry.js`:

```js
import MyNewComponent from '@/components/data-display/MyNewComponent';

export const BlockRegistry = {
  myBlock: MyNewComponent,
};
```

**Step 3 — Use it in a section config:**

```js
{
  id:   'my-block-instance',
  type: 'myBlock',
  props: { ... }
}
```

---

## Key constraints

- **No data logic in components.** All data reading and normalization happens in `/lib/data/`. Components receive clean, ready-to-render props.
- **No layout logic in page configs.** Layout is controlled by the `layout` key on a section, mapping to a preset in `layoutPresets.js`.
- **No formatting logic in section configs.** Formatting lives in indicator topic files and is resolved before props reach a component.
- **Section configs contain no logic.** They are plain data objects.
- **Section IDs are defined once** in `sectionIds.js`. Never hard-code a section ID string in more than one place.
- **Indicator definitions are topic-scoped.** Add new indicators to the matching file in `/config/registries/indicators/`, not directly to `indicatorRegistry.js`.
- **Search inputs use `type="text"`**, not `type="search"`. Browsers render a native clear button on `type="search"` that conflicts with the custom `×` button.
- **State that should survive a refresh goes in the URL**, not component state. Use `history.replaceState` + `URLSearchParams`. See `ComparisonContext` and `Sidebar` for the pattern.
- **Leaflet event handlers bind once at layer creation.** If a prop used inside a Leaflet event handler can change after mount, store it in a `ref` and read `ref.current` inside the handler. See `ChoroplethMap` for the pattern.
- **Imperative Leaflet updates for cross-component state.** When external state needs to restyle map features (e.g. strip hover → map highlight), use `geoJsonLayerRef.current.eachLayer(layer => layer.setStyle(...))` rather than remounting the GeoJSON layer. Remounting causes a flash and resets tooltips.
