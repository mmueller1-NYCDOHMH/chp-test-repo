# CHP Content & Data Guide

**Who this is for:** anyone updating copy, adding or moving indicators, dropping in new data, or editing site text — without writing React or JavaScript.

_Last reviewed 2026-09-28 against the code._

**Rule of thumb:** if you're editing a `.csv` under `content/copy/`, a `.json` under `content/site/` or `content/print/`, or a data file from the data team under `data/`, you're safe. If a step says **developer**, it touches a `.js` file.

---

## Table of contents

1. [How content gets onto the page](#1-how-content-gets-onto-the-page)
2. [Content file map](#2-content-file-map)
3. [Where each indicator field comes from](#3-where-each-indicator-field-comes-from)
4. [The copy deck — column reference](#4-the-copy-deck--column-reference)
5. [The Sections tab — column reference](#5-the-sections-tab--column-reference)
6. [Narrative tokens](#6-narrative-tokens)
7. [Worked examples](#7-worked-examples)
8. [Data files](#8-data-files)
9. [Site-wide text](#9-site-wide-text)
10. [Printable report](#10-printable-report)
11. [Suppressed and small-sample values](#11-suppressed-and-small-sample-values)
12. [Colors](#12-colors)
13. [Troubleshooting `npm run copy`](#13-troubleshooting-npm-run-copy)
14. [What still needs a developer](#14-what-still-needs-a-developer)

---

## 1. How content gets onto the page

```
content/copy/measure-copy.csv ──┐
content/copy/sections.csv ──────┤   npm run copy   ┌─ content/copy/indicatorCopy.json
data/indicators/, data/metadata/ ┘   (+ checks)     ├─ content/copy/structure.json
                                                    └─ src/config/content/sectionTitles.json
                                                               │
                                                               ▼
                             nav · page order · headings · cards · search · print report
```

**Two sheets to edit, one command to run.** The copy deck (`measure-copy.csv`) decides *what* appears, *where*, in *what order*, and *what it says*. The Sections tab (`sections.csv`) maps the deck's Section/Subsection names to site ids and headings. `npm run copy` turns them into the three generated JSON files the site reads, and checks every keyed row against the data folder. It also runs automatically before `npm run dev` and `npm run build`, so a deploy always picks up the latest sheet.

Never hand-edit the three generated files — the next `npm run copy` overwrites them.

---

## 2. Content file map

```
content/
  copy/
    measure-copy.csv       ← THE COPY DECK — edit this
    sections.csv           ← THE SECTIONS TAB — edit this
    indicatorCopy.json     ← generated — don't edit
    structure.json         ← generated — don't edit

  site/                    ← site-wide text (not indicator content)
    about.json             ← /about page
    footer.json            ← footer
    header.json            ← site header
    introModal.json        ← welcome / neighborhood-picker modal
    messages.json          ← chart/map empty and error messages
    overviewSections.json  ← At a Glance + Premature Death panel headings and footnotes
    phrases.json           ← standard wording: higher/lower/similar, small-sample
                             footnotes, Most/Many/Some/Few
    glossary.json          ← hover-tooltip definitions for terms in subtitles

  print/
    printSettings.json     ← print-only differences for /print/neighborhood/[id]

data/                      ← owned by the data team — drop exports in as delivered
  indicators/{key}.json    ← the numbers
  metadata/{key}-meta.json ← source, time period, methods note, unit, decimals

src/config/content/sectionTitles.json  ← generated from sections.csv — don't edit
src/config/presets/indicatorDisplay.js ← developer: delta direction, footnote type, distributions
```

---

## 3. Where each indicator field comes from

Every field has exactly one home.

| What | Where | Who edits |
|---|---|---|
| Card title (`Measure`), narrative (`Context` + `Comparison`), `type`, `of`, `detail`, `units`, `indicatorDetail`, which section, card order | `content/copy/measure-copy.csv` | content |
| Source, time period, methods note (the "?" button), unit, decimals, age adjustment | `data/metadata/{key}-meta.json` | data team |
| The numbers | `data/indicators/{key}.json` | data team |
| Delta color direction (`higherIsBetter`), hide the delta (`showDelta`), small-sample footnote type (`dataSource`), distribution segments, `sourceUrl` | `src/config/presets/indicatorDisplay.js` | developer |

The metadata files also carry `type` / `of` / `detail` / `units` / `Section` / `Subsection` columns. **The site ignores those** and uses the copy deck's values.

Retired and deleted — don't recreate: `content/indicators/`, `content/sections/`, `content/category-cards/`, `content/flyouts/`, `src/config/indicatorMeta.json`, `content/copy/sections.json`, `content/site/nav-labels.json`.

---

## 4. The copy deck — column reference

**File:** `content/copy/measure-copy.csv` · one row per measure · header row required, column names exactly as below.

| Column | Required | What it does |
|---|---|---|
| `FLAG` | no | Editorial note, carried through. Special values: **`design in progress`** holds the narrative (the card shows its plain subtitle instead); **`category intro`** marks an intro row (see below). Anything else (`LK: new measure NOT IN SITE`) is just a note. |
| `Section` | yes | Top-level category exactly as named in the Sections tab (`Social`, `Health care`…) or `At a glance`. |
| `Subsection` | yes* | Section within the category (`Economic`, `Access to care`…). *Blank for `At a glance` rows and category intros. |
| `Key` | for live cards | Indicator key. Must match `data/indicators/{key}.json` and `data/metadata/{key}-meta.json`. **Never rename a key once it's live** — it's in shareable URLs (`/indicator/{key}`, `#indicator-{key}`). Blank = planned measure: not on the web page, prints as "—". |
| `Measure` | yes | Card title, nav/search label, print row label. |
| `Context` | no | Static "why it matters" sentence(s). May contain tokens. |
| `Comparison` | no | Neighborhood sentence with tokens (see [section 6](#6-narrative-tokens)). |
| `type` | yes | `Percent`, `Rate`, `Number` — the stat-tile / print sub-label. |
| `of` | yes | Who is measured (`adults 18+`, `residents`, `people`). |
| `detail` | no | Qualifier after `of` (`who report having helpful neighbors.`). |
| `units` | no | Rate unit (`per 100,000`). |
| `indicatorDetail` | no | Extra definition shown in the details view. |

**Order matters.** Categories, sections and cards appear on the page, in the nav and in the print report in the order they first appear in the sheet.

**Category intro rows:** `Section` filled, `Subsection` and `Key` blank, `FLAG` = `category intro`, intro paragraph in `Context`.

Real rows from the deck:

```csv
FLAG,Section,Subsection,Key,Measure,Context,Comparison,type,of,detail,units,indicatorDetail
,At a glance,,overall-pop,Total population,,<MIN(Overallpop)> people live in this neighborhood.,Number,people,,,
category intro,Social,,,Category intro,"Social and economic factors shape the conditions in which people live, work, and age. …",,,,,,
,Social,Economic,poverty,Poverty,Living in high-poverty neighborhoods limits healthy options and makes it difficult to access health care and resources that promote health. ,"In <Name>, <SUM(Value Percentage)> of residents live in poverty, compared with <SUM(NYC reference (%))> of NYC residents.",Percent,people,below NYC's poverty threshold,,Calculated based on income and necessary expenses.
LK: new measure NOT IN SITE,,,,Population by disability,,,,,,,
```

---

## 5. The Sections tab — column reference

**File:** `content/copy/sections.csv`

| Column | What it does |
|---|---|
| `Level` | `category` (top nav item), `section` (a subsection with its own heading + card grid), or `custom` (a bespoke layout that draws specific keys) |
| `Section` | Copy-deck Section name (category + section rows) |
| `Subsection` | Copy-deck Subsection name (section rows; blank for `At a glance`) |
| `Id` | Site id — the `#anchor`, nav id and code handle. Lowercase-with-dashes. Changing a live id breaks old links. |
| `Heading` | On-page heading. Blank = use the Subsection name. |
| `Keys` | `custom` rows only: indicator keys this bespoke section draws, `;`-separated |

Excerpt:

```csv
Level,Section,Subsection,Id,Heading,Keys
category,Social,,social,,
section,At a glance,,neighborhood-overview,Neighborhood Overview,
section,Social,Economic,economic-conditions,,
section,Health care,Access to care,health-care-access,,
custom,,,avertable-deaths,Avertable Deaths,avertable-death
```

A `custom` key still has a normal row in the copy deck (e.g. `avertable-death` under Social / Economic). Its card renders inside that parent section's grid, drawn with the bespoke layout instead of a bar chart.

---

## 6. Narrative tokens

`Context` and `Comparison` can contain `<TOKENS>` carried over from the DOHMH Tableau copy deck. They're filled in per neighborhood from that indicator's data file.

| Token | Becomes |
|---|---|
| `<Name>` | Neighborhood display name |
| `<SUM(Value Percentage)>`, `<AVG(...)>`, `<MIN(...)>`, `<Value>` | The neighborhood's `DisplayValue` (trailing `*` stripped) |
| Anything containing `NYC reference`, e.g. `<SUM(NYC reference (%))>` | The citywide `DisplayValue` |
| `<AGG(NYC comparison)>` | The row's `NYCComparison` (`higher` / `lower` / `similar`) → wording from `phrases.json`. If the field is missing or `na`, falls back to a ±5% relative-difference rule. |
| `<AGG(Estimate description ...)>` | Most (≥75%) / Many (≥50%) / Some (≥25%) / Few — thresholds in `phrases.json` |
| `<Reliability>` | `*` if the row is flagged, else nothing |
| `<Suppression>` | Nothing (suppressed rows never render a sentence) |

**Worked resolution** (poverty; illustrative values):

```
Template:  In <Name>, <SUM(Value Percentage)> of residents live in poverty,
           compared with <SUM(NYC reference (%))> of NYC residents.
Data:      CD row DisplayValue "26%", citywide row DisplayValue "20%"
Renders:   In Central Harlem, 26% of residents live in poverty,
           compared with 20% of NYC residents.
```

If the neighborhood's value is null/suppressed, the whole sentence is skipped rather than shown with a hole. An unknown token shows as `[[token]]` in `npm run dev` (blank in production) and logs a console warning, so a typo is visible locally.

---

## 7. Worked examples

### Example A — Add a brand-new indicator

Say the data team is adding food insecurity with the key `food-insecurity`.

**1. The data team drops in two files.**

`data/indicators/food-insecurity.json` (one row per geography; excerpt)
```json
{
  "Section": "neighborhood",
  "Subsection": "food",
  "IndicatorKey": "food-insecurity",
  "Data": [
    { "GeoType": "Citywide", "GeoID": 0,   "Geography": "NYC",   "Value": 0.14, "DisplayValue": "14%", "ValueType": "estimate" },
    { "GeoType": "Borough",  "GeoID": 2,   "Geography": "Bronx", "Value": 0.19, "DisplayValue": "19%", "ValueType": "estimate" },
    { "GeoType": "CD",       "GeoID": 110, "Geography": "Central Harlem", "Value": 0.21, "DisplayValue": "21%",  "ValueType": "estimate", "NYCComparison": "higher" },
    { "GeoType": "CD",       "GeoID": 503, "Geography": "Tottenville and Great Kills", "Value": 0.06, "DisplayValue": "6%*", "ValueType": "estimate", "ValueStatus": "flagged", "NYCComparison": "lower" }
  ]
}
```

`data/metadata/food-insecurity-meta.json` — dash, not dot; `IndicatorKey` matches the filename
```json
{
  "IndicatorKey": "food-insecurity",
  "Title": "Food insecurity",
  "Label": "Food insecurity",
  "Subtitle": "Percentage of adults who worried about running out of food in the past year.",
  "Source": "NYC Community Health Survey",
  "TimePeriod": "2022",
  "MethodsNote": "Weighted to the NYC adult population. Estimates marked * should be interpreted with caution.",
  "Unit": "%",
  "Decimals": 0,
  "AgeAdjustment": "Age-adjusted",
  "DenominatorSource": "N/A"
}
```

**2. Add one row to the copy deck**, under Neighborhood / Food, at the position the card should appear:

```csv
,Neighborhood,Food,food-insecurity,Food insecurity,"Not having reliable access to enough food is linked to poorer diet and chronic disease.","In <Name>, <SUM(Value Percentage)> of adults worried about running out of food, <AGG(NYC comparison)> the citywide rate of <SUM(NYC reference (%))>.",Percent,adults 18+,who worried about running out of food,,
```

**3. Run `npm run copy`.** You should see:

```
[build-copy] Wrote indicatorCopy.json, structure.json, sectionTitles.json — N keyed rows in N sections, N rows without a Key.
```

with no warning mentioning `food-insecurity`.

**4. Developer, optional (one line each):** so the delta badge is colored and a flagged value gets survey wording, add the key to the lists at the top of `src/config/presets/indicatorDisplay.js`:

```js
const lowerIsBetter    = [ …, 'food-insecurity' ];
const surveyIndicators = [ …, 'food-insecurity' ];
```

Without this the card still renders; its delta badge is neutral gray.

The new card now shows on every neighborhood page, in the nav's section, in search, at `/indicator/food-insecurity`, and in the print report. Central Harlem's sentence reads: *In Central Harlem, 21% of adults worried about running out of food, higher than the citywide rate of 14%.*

---

### Example B — Move or reorder a card

Cut the row in `measure-copy.csv` and paste it where you want it.

- **Reorder within a section:** move the row above/below its neighbors.
- **Move to another section:** move the row *and* change its `Section` / `Subsection` to the destination's names (e.g. `Health care,Prevention`).

Run `npm run copy`. No other file changes.

---

### Example C — Take a card off the site but keep the row

Clear the `Key` cell and leave a note in `FLAG`:

```csv
LK: pulled pending new data,Health care,Prevention,,HPV vaccination,…
```

The card disappears from the web page; the print report shows the row as "—". Delete the row entirely to drop it from print too.

---

### Example D — Hold a narrative while copy is in review

Put `design in progress` in `FLAG`. The card still renders with its data-team subtitle; the `Context`/`Comparison` narrative waits until the flag is cleared.

---

### Example E — Rename a heading

- **Only the on-page heading:** fill `Heading` in `sections.csv`:
  ```csv
  section,Health care,Access to care,health-care-access,Health insurance & access to care,
  ```
- **The nav label too:** rename the Subsection in **both** sheets — every `measure-copy.csv` row that uses it, and the matching `sections.csv` row. If they don't match, `npm run copy` stops and lists the valid names.

---

### Example F — Add a section to an existing category

1. `sections.csv` — add a `section` row with a new id:
   ```csv
   section,Neighborhood,Green space,green-space,,
   ```
2. `measure-copy.csv` — use `Neighborhood,Green space` on the rows that belong there. The section appears where its first row sits in the sheet.
3. `npm run copy`.

It gets the standard layout (heading + card grid) automatically. A bespoke layout needs a developer — see [section 14](#14-what-still-needs-a-developer).

---

### Example G — Add a category

1. `sections.csv` — add a `category` row and its `section` rows:
   ```csv
   category,Environment,,environment,,
   section,Environment,Climate,climate,,
   ```
2. `measure-copy.csv` — add the intro row, then the indicator rows:
   ```csv
   category intro,Environment,,,Category intro,"Where people live shapes their exposure to heat, flooding and pollution.",,,,,,
   ,Environment,Climate,heat-vulnerability-index,Heat vulnerability,…
   ```
3. `npm run copy`. Forget the intro row and it warns `Category "Environment" has no intro text`.

---

### Example H — Add a tile to At a Glance

Add a row with Section `At a glance` and a blank Subsection. Rows appear in sheet order. Distribution indicators (`age-distribution`, `race-ethnicity`) become the pyramid charts; everything else becomes a stat tile.

```csv
,At a glance,,poverty,Poverty,,<SUM(Value Percentage)> of residents,Percent,people,,,
```

(A key can appear only once in the deck, so this moves poverty out of Social / Economic.) For the printable report, add the key to `content/print/printSettings.json` → `indicators` with a `group` if it belongs in a sub-group other than the first ("Population").

---

### Example I — Add a glossary term

`content/site/glossary.json` — keys are lowercase; matching is case-insensitive and applies to indicator subtitles.

```json
"food insecurity": {
  "short": "Not having reliable access to enough affordable, nutritious food."
}
```

---

### Example J — Change standard wording

`content/site/phrases.json` — e.g. make "similar to" read "about the same as":

```json
"comparison": { "higher": "higher than", "lower": "lower than", "similar": "about the same as" }
```

This changes every narrative sentence, flyout insight and stat-tile badge that uses it.

---

### Example K — Update to a new data year

Overwrite `data/indicators/{key}.json` and `data/metadata/{key}-meta.json` with the new export (same filenames). Run `npm run dev` and spot-check one card, its Details flyout, and `/print/neighborhood/{id}`. No copy or code changes are needed unless the key changed.

---

## 8. Data files

**Owned by the data team.** Drop exports into `data/` as delivered — the site reads them directly, with no conversion step. Anything that needs reshaping (ranking, percent scaling, suppression) should be asked of the export, not patched in code.

### `data/indicators/{key}.json`

```json
{
  "Section": "social",
  "Subsection": "economic",
  "IndicatorKey": "poverty",
  "Data": [
    { "GeoType": "Citywide", "GeoID": 0,   "Geography": "NYC",                "Value": 0.2,  "DisplayValue": "20%", "ValueType": "estimate" },
    { "GeoType": "Borough",  "GeoID": 1,   "Geography": "Manhattan",          "Value": 0.15, "DisplayValue": "15%", "ValueType": "estimate" },
    { "GeoType": "CD",       "GeoID": 101, "Geography": "Financial District", "Value": 0.08, "DisplayValue": "8%",  "ValueType": "estimate" }
  ]
}
```

| Field | Notes |
|---|---|
| `GeoType` | `"CD"` \| `"Borough"` \| `"Citywide"` |
| `GeoID` | `0` citywide · `1–5` borough · 3-digit CD (first digit = borough: 1 MN, 2 BX, 3 BK, 4 QN, 5 SI; e.g. `101`, `503`) |
| `Value` | Number used for sorting, bars and deltas. **Percents are 0–1 fractions** (0.26 = 26%). `null` when suppressed. |
| `DisplayValue` | Pre-formatted string shown on screen (`"26%"`, `"39%*"`, `"suppressed"`) |
| `ValueStatus` | `"flagged"` = small sample (asterisk + footnote) · `"supressed"` (sic, as exported) / `"na"` = no value |
| `NYCComparison` | Optional `higher` / `lower` / `similar` / `na` — statistical comparison used by `<AGG(NYC comparison)>` |
| `LCLValue`, `UCLValue`, `NYCPValue` | Optional confidence limits and p-value |

The top-level `Section` / `Subsection` are informational — placement comes from the copy deck.

**Split indicators.** A few indicators ship as several files the site joins: age distribution (`age0to17.json` … `age65plus.json`), race/ethnicity (`race-asian.json` …), cancer types (`cancer-{type}-{count|rate}.json`) and premature-death causes (`premature-mort-cause-{cause}-{count|rate}.json`). Their metadata: `age0to17-meta.json`, `race-asian-meta.json`, `cancer-rank-{count|rate}-meta.json`, `premature-mort-cause-{count|rate}-meta.json`.

### `data/metadata/{key}-meta.json`

Must be named `{key}-meta.json` (dash, not dot) with `IndicatorKey` matching the filename — a `.meta.json` file is never read. Fields the site uses:

| Field | Shown as |
|---|---|
| `Title`, `Label` | Fallback titles (the copy deck's `Measure` wins) |
| `Subtitle` | Card subtitle when there's no narrative |
| `Source`, `TimePeriod` | Source line on cards, flyout, indicator page, print |
| `MethodsNote` | "?" notes dialog |
| `Unit` | `%` switches deltas to percentage points (`pts`) |
| `Decimals` | Decimal places for deltas |
| `AgeAdjustment`, `DenominatorSource` | Notes dialog |

---

## 9. Site-wide text

All plain JSON under `content/site/` — edit values freely, keep the keys.

| File | Controls |
|---|---|
| `introModal.json` | Welcome modal: `title`, `subtitle`, tab labels, search hints, `features[].label` (chip text), footer links. `features[].id` picks the icon — valid ids: `compare`, `explore`, `keyboard`. |
| `header.json` / `footer.json` | Site header and footer text and links |
| `about.json` | `/about` page |
| `messages.json` | Empty/error states on charts and maps |
| `overviewSections.json` | At a Glance and Premature Death panel headings and footnotes |
| `phrases.json` | Comparison words, small-sample footnotes, Most/Many/Some/Few buckets |
| `glossary.json` | Hover definitions (Example I) |

**To see the intro modal again after dismissing it:** DevTools → Application → Local Storage → delete `chp_intro_seen` → reload.

---

## 10. Printable report

`/print/neighborhood/[id]` uses the same structure as the web page (from the copy deck). `content/print/printSettings.json` holds only what's different on paper:

| Setting | Example | Effect |
|---|---|---|
| `indicators.{key}.contextOnly` | `"poverty": { "contextOnly": true }` | Row shows □ instead of a ▲▼● comparison |
| `indicators.{key}.displayAs` | `"topSegments"` | Distribution rows show the neighborhood's top 2 groups as sub-rows |
| `indicators.{key}.unit` | `"% of people"` | Print-only caption |
| `indicators.{key}.group` | `"immigration-language"` | At a Glance sub-group |
| `atAGlance.groups` | `[{ "id": "population", "title": "Population" }, …]` | At a Glance sub-groups, in order |
| `insertBefore` | `"premature-mort-rate": ["premature-mort-count"]` | Print-only extra rows not in the sheet |

Copy-deck rows with a `Measure` but no `Key` print as "—" placeholders.

---

## 11. Suppressed and small-sample values

**Status: built.** The wording lives in `content/site/phrases.json`; which wording an indicator gets is set by `dataSource` in `indicatorDisplay.js`.

| Indicator's `dataSource` | Value type | Footnote under a flagged (`*`) value |
|---|---|---|
| `survey` (Community Health Survey) | any | `*Interpret estimate with caution due to small sample size.` |
| `administrative` (SPARCS, registries, vital stats) | rate | `*Interpret rate with caution due to small number of events.` |
| `administrative` | percent | `*Interpret proportion with caution due to small number of events.` |

The footnote only appears when the neighborhood's row has `ValueStatus: "flagged"`. Classify each new indicator as `survey` or `administrative` by its `Source`; don't add a third variant without updating `phrases.json` and this table.

**Fully suppressed values** (`Value: null`, `DisplayValue: "suppressed"`): charts show a caret `^`, and the narrative sentence is omitted.

---

## 12. Colors

Two files, **kept in sync by hand** — nothing links them automatically.

### UI — `src/app/globals.css`

| Variable | Value | Used for |
|---|---|---|
| `--color-brand` | `#00397A` | Header, footer, primary nav, buttons |
| `--color-brand-tint` | `#E8EBF3` | Selected/hover fills (e.g. TopicNav dropdown) |
| `--color-comparison` | `#C94D18` | Comparison neighborhood (dot, focus ring) — must match `COMPARISON` |
| `--color-comparison-tint` / `-border` / `-text` / `-hover` | `#F9EAE3` / `#E7AF97` / `#5A230B` / `#973A12` | Comparison pill, search, marks |
| `--color-health-better` / `-bg` | `#15803d` / `#f0fdf4` | Better-than-citywide badge |
| `--color-health-worse` / `-bg` | `#b91c1c` / `#fef2f2` | Worse-than-citywide badge |
| `--color-health-neutral` / `-bg` | `#4B5563` / `#F9FAFB` | Neutral badge |

### Charts and maps — `src/lib/charts/chartColors.js` (source of truth for raw hex)

| Export | Value | Used for |
|---|---|---|
| `SELECTED` | `#5646F5` | Selected neighborhood bar / dot / map fill |
| `COMPARISON` | `#C94D18` | Comparison neighborhood — must match `--color-comparison` |
| `CITYWIDE` | `#5F7699` | NYC tick / bar |
| `BOROUGH` | `#757575` | Borough tick / bar |
| `BAR_DEFAULT` | `#C7CCDB` | All other bars |
| `BAR_INVALID` | `#9CA3AF` | Suppressed / null bars |
| `CHOROPLETH_STOPS` | 5-step array | Flyout choropleth gradient |

---

## 13. Troubleshooting `npm run copy`

**Errors stop the build and write nothing:**

| Message | Fix |
|---|---|
| `unknown Section/Subsection "X" / "Y". Valid: …` | Typo, or the subsection isn't in `sections.csv` yet — fix the name or add the row. |
| `duplicate Key "x"` | A key can appear only once. Clear the extra row's Key. |
| `Section "X" has no nav category` | Add a `category` row for it in `sections.csv`. |
| `src/config/registries/sectionIds.js uses "x", which isn't an Id in content/copy/sections.csv` | A section with a custom layout was renamed or removed in the Sections tab — restore the id or ask a developer. |
| `measure-copy.csv is missing column(s): …` / `sections.csv is missing column: …` | The export dropped or renamed a header — restore it exactly. |

**Warnings build anyway, but read them:**

| Message | Meaning |
|---|---|
| `no data/indicators/{key}.json — card will show an empty state` | Data file missing, or the Key is misspelled |
| `no data/metadata/{key}-meta.json` | No source/time period/methods note (check for a `.meta.json` typo) |
| `blank type/of` | Stat-tile / print sub-label will be empty |
| `Category "X" has no intro text` | Add its category intro row |

---

## 14. What still needs a developer

| Task | File(s) |
|---|---|
| Delta direction, hide delta, footnote type, source link | `src/config/presets/indicatorDisplay.js` |
| A new distribution (pyramid) indicator | `indicatorDisplay.js` (`kind: 'distribution'`, `segments`) + the segment-file map in `src/lib/data/loadIndicatorData.js` |
| A bespoke (non-card-grid) section | new `src/config/sections/{id}.js` + register it in `CUSTOM_SECTIONS` in `src/config/pages/neighborhoodProfile.js` + an id constant in `src/config/registries/sectionIds.js` + a row in `sections.csv` (`custom` if it nests inside another section) |
| A new block/chart type | the component + `src/config/registries/blockRegistry.js` |
| The "similar to" threshold (±5%) | `buildInsight()` in `src/lib/utils/compareIndicator.js` |
| Up/down/neutral badge arrows | `INSIGHT_ARROWS` in `src/components/data-display/comparisonStatTiles/insightHelpers.js` |
| A new intro-modal chip icon | `src/components/core/introModal/FeatureIcon.jsx` |
| Chart/map colors | `src/lib/charts/chartColors.js` + `globals.css` |
| A new narrative token | `src/lib/copy/resolveNarrative.js` |
