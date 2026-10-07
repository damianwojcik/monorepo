# Grid config simplification - spec

## Goal

Make the YAML grid config as easy to write as possible, without changing the renderer.

Users write a **short format**. A normalizer converts it into the **existing internal
model** (`cells` with `row`/`column`, templates with `style`, `editable`, `numberFormat`, ...),
and the renderer keeps consuming that model unchanged.

Old configs (with `cells:`) must keep working - the normalizer passes them through as they are.

## Reference example

`jpy-main2.yaml` (3 grids, 258 cells, 23 templates) rewritten in the short format is in
section 7. Normalized back, it must produce **exactly** the same cells, templates, layout and
entitlements as the original. This is the main acceptance test.

## 1. Grids: rows instead of coordinates

Before:

```yaml
cells:
  - { row: 6, column: 0, template: tenorLabel, content: TONAR }
  - { row: 6, column: 1, template: status, value: true }
  - { row: 6, column: 2, template: mult, value: 1.00 }
```

After:

```yaml
rows:
  - [{tenorLabel: TONAR}, {status: true}, {mult: 1.00}]
```

Row index = position in `rows`, column index = position in the row list.

### Grid keys

| key | required | default | notes |
|---|---|---|---|
| `label` | no | - | heading above the table |
| `rows` | yes | - | list of rows and blocks |
| `columnWidths` | no | auto | see "Column widths" below |
| `resizable` | no | **`false`** | drag-resizing of columns |

### Row forms

| form | meaning |
|---|---|
| `[a, b, c]` | normal row |
| `[]` | empty row (still takes a row index) |
| `{ use: [...], rows: [...] }` | **block** - several rows sharing per-column templates |

### Cell forms

| form | meaning | expands to |
|---|---|---|
| `~` (null) | empty cell, nothing rendered | no cell |
| `{mult: 1.00}` | single key = template name | `template: mult, value: 1.00` |
| `{grayHeader: Trader}` | string -> content | `template: grayHeader, content: Trader` |
| `{status: true, id: computeBasis}` | template + id used for references | id is registered, not passed to the renderer |
| `{template: x, value: 1}` | long form, still allowed | unchanged |
| `1.00` / `TONAR` / `true` | plain value, only inside a block | template taken from `use[columnIndex]` |

Rules:

- Value type decides the field: **string -> `content`**, **number or boolean -> `value`**.
- Reserved keys in a cell: `id`, `template`, `value`, `content`, `datasource`.
  Any other key is a template name. More than one non-reserved key is an error.
- Strings that mean something else in YAML must be quoted: `'~ RFQ on'`, `'-//-'`.
  `~` alone means an empty cell.
- A row may be shorter than others - missing trailing cells are empty.

### Blocks (`use`)

For repeating rows with the same template per column:

```yaml
- use: [tenorLabel, dash, mult, dv01]
  rows:
    - [1W, '-//-', 1.00]          # no dv01 cell in this row
    - [1M, '-//-', 1.00, 50.00]
```

- `use[i]` is the template for column `i` in every row of the block.
- A plain value takes its template from `use`. A `{template: value}` cell overrides it.
- A row longer than `use` is an error.

### Column widths

Widths are set per grid, not in templates:

```yaml
main:
  label: STIR_JPY_001
  columnWidths: [110, 90, ~, 100]   # ~ = auto
  resizable: true
```

- Position in the list = column index. `~` = auto width.
- A list shorter than the number of columns - remaining columns are auto.
- Not part of the template `style` on purpose: one template is used in many columns
  (`mult` is in columns 2-6) and one column holds many templates (column 0 has
  `okState`, `sectionLabel`, `tenorLabel`), so a width in a template would conflict.

## 2. Templates

### Style - CSS naming, unchanged

`style` keeps the current CSS property names:
`backgroundColor`, `color`, `fontWeight`, `textAlign`, `border`, `borderTop`,
`borderRight`, `borderBottom`, `borderLeft`.

```yaml
grayHeader:
  style: { backgroundColor: '#919191', color: '#ffffff', fontWeight: bold, textAlign: center }
```

No template inheritance - every template is complete on its own.

### Behaviour keys (flattened)

| short key | internal | notes |
|---|---|---|
| `decimals` | `numberFormat` | |
| `tick` | `tick` | |
| `edit` | `editable.type` | `number` / `text` / `toggle` |
| `min`, `max` | `editable.min`, `editable.max` | |
| `editableWhen: { cell: <id>, equals: x }` | `editableWhen: { row, column, equals }` | `cell` is an `id` from a grid |
| `rules` | `rules` | map, see below |

Before:

```yaml
mult:
  numberFormat: 2
  editable:
    type: number
    min: 0
    max: 100
  style:
    textAlign: center
```

After:

```yaml
mult:
  decimals: 2
  edit: number
  min: 0
  max: 100
  style: { textAlign: center }
```

### Rules

Before:

```yaml
rules:
  - lessThan: 0
    style: { color: '#ff0000' }
```

After:

```yaml
rules:
  '< 0': { color: '#ff0000' }
  '> 100': { backgroundColor: '#ffcdd2' }
  '= true': { backgroundColor: '#32cd32', color: '#ffffff' }
```

- Key = operator (`<`, `>`, `=`) + value. `true`/`false` -> boolean, numeric -> number,
  anything else -> string.
- Value = style object with CSS names (same as `style`).
- Order is kept; matching behaviour stays the same as today.

### editableWhen by id, not coordinates

```yaml
# in the grid
- [{computeLabel: Compute Clearing Basis}, {status: true, id: computeBasis}]

# in the template
basis:
  edit: number
  editableWhen: { cell: computeBasis, equals: false }
```

Coordinates break silently when someone inserts a row; ids don't.
`cell: clearingBasis.computeBasis` (grid-qualified) is also accepted. Ids must be unique.

## 3. Defaults

- `resizable: false` when not defined.
- `columnWidths` not defined -> all columns auto.
- `layout` optional - when missing, every grid in its own row, in definition order.
- `entitlements`, `connections`, `layout` - format unchanged.

## 4. Formatting freedom

Spaces after `:` and after `,` are not significant in YAML. All of these are the same:

```yaml
- [JSCC, true, 1.00, 1.00]
- [JSCC,      true, 1.00, 1.00]
'= true': { color: '#ffffff' }
'= true':   { color: '#ffffff' }
```

Aligning columns with extra spaces is optional and purely cosmetic. The normalizer must not
depend on it. Note: formatters such as Prettier collapse the extra spaces when they format YAML.

## 5. Validation errors (fail fast, clear message with grid and position)

- unknown template name in a cell or in `use` - e.g. `main [3,2]: unknown template "mult2"`
- more than one template key in a cell
- block row longer than `use`
- `editableWhen` pointing to an unknown id; duplicate ids
- invalid rule key (operator other than `<`, `>`, `=`)

## 6. Acceptance tests

1. Normalizing the example below gives exactly the same `templates`, `grids[*].cells`,
   `layout` and `entitlements` as the original `jpy-main2.yaml`.
2. Normalizing the original `jpy-main2.yaml` returns it unchanged (plus `resizable: false`).
3. Every error in section 5 is thrown with a readable message.
4. `resizable` missing -> `false`.

## 7. Full example - jpy-main2 in the short format

```yaml
entitlements:
  - jpy_trading

templates:
  jpyHeader:
    style: { backgroundColor: '#0070c0', color: '#ffa500', fontWeight: bold, textAlign: center }
  grayHeader:
    style: { backgroundColor: '#919191', color: '#ffffff', fontWeight: bold, textAlign: center }
  statusHeader:
    style: { backgroundColor: '#ffa500', color: '#000000', fontWeight: bold, textAlign: center }
  blueHeader:
    style: { backgroundColor: '#0070c0', color: '#ffffff', fontWeight: bold, textAlign: center }
  greenHeader:
    style: { backgroundColor: '#32cd32', color: '#ffffff', fontWeight: bold, textAlign: center }
  okState:
    style: { backgroundColor: '#32cd32', color: '#ffffff', fontWeight: bold, textAlign: center }
  offState:
    style: { backgroundColor: '#ff0000', color: '#ffffff', fontWeight: bold, textAlign: center }
  traderText:
    style: { textAlign: center }
  sectionLabel:
    style: { backgroundColor: '#444444', color: '#ffffff', fontWeight: bold }
  tenorLabel:
    style: { backgroundColor: '#aaaaaa', color: '#000000', fontWeight: bold, textAlign: right }
  computeLabel:
    style: { backgroundColor: '#aaaaaa', color: '#000000', fontWeight: bold }
  dash:
    style: { color: '#919191', textAlign: center }

  status:
    edit: toggle
    rules:
      '= true': { backgroundColor: '#32cd32', color: '#ffffff', textAlign: center }
      '= false': { backgroundColor: '#ff0000', color: '#ffffff', textAlign: center }

  mult:
    decimals: 2
    edit: number
    min: 0
    max: 100
    style: { textAlign: center }
  dv01:
    decimals: 2
    edit: number
    min: 0
    max: 100000
    style: { textAlign: center }

  baseChargeHeader:
    style: { backgroundColor: '#aaaaaa', fontWeight: bold, textAlign: center, border: '1px solid #919191' }
  baseCharge:
    decimals: 2
    style: { backgroundColor: '#d7d7d7', textAlign: center, border: '1px solid #919191' }
  basisHeader:
    style: { color: '#000000', fontWeight: bold, textAlign: center, border: '1px solid #000000' }

  basis:
    decimals: 3
    edit: number
    min: -10
    max: 10
    editableWhen: { cell: computeBasis, equals: false }
    style: { textAlign: center }

  tickingMult:
    decimals: 2
    tick: true
    style: { color: '#0000ff', textAlign: center }
    rules:
      '< 0': { color: '#ff0000' }

grids:
  main:
    label: STIR_JPY_001
    rows:
      - [{okState: Centcon on}, {grayHeader: Trader}, {jpyHeader: JPY}, {grayHeader: Global}, {grayHeader: Stream}, {grayHeader: RFQ}, {grayHeader: RFM}, ~, {baseChargeHeader: Base charge (bps)}]
      - [{okState: '~ RFQ on'}, {traderText: gaving}, {statusHeader: Status}, {status: true}, {dash: '-//-'}, {status: true}, {status: true}, ~, {baseCharge: 0.50}]
      - [{offState: Stream TW}, {traderText: TW OK}, {blueHeader: Spread Multiplier}, {tickingMult: 1.00}, {mult: 1.00}, {mult: 1.00}, {mult: 1.00}]
      - [~, ~, {greenHeader: Size Multiplier}, {tickingMult: 1.00}, {mult: 1.00}, {mult: 1.00}, {mult: 1.00}]
      - []

      - [{sectionLabel: Indexes}, {statusHeader: Status}, {blueHeader: Spread Multiplier}, {greenHeader: Size Multiplier}]
      - use: [tenorLabel, status, mult, mult]
        rows:
          - [TONAR, true, 1.00, 1.00]

      - [{sectionLabel: Clearing}, {statusHeader: Status}, {blueHeader: Spread Multiplier}, {greenHeader: Size Multiplier}]
      - use: [tenorLabel, status, mult, mult]
        rows:
          - [JSCC,      true, 1.00, 1.00]
          - [LCH,       true, 1.00, 1.00]
          - [Bilateral, true, 1.00, 1.00]

      - [{sectionLabel: Outrights}, {statusHeader: Status}, {blueHeader: Spread Multiplier}, {greenHeader: Max Risk DV01}]
      - use: [tenorLabel, dash, mult, dv01]
        rows:
          - [1W,  '-//-', 1.00]
          - [2W,  '-//-', 1.00]
          - [3W,  '-//-', 1.00]
          - [1M,  '-//-', 1.00, 50.00]
          - [2M,  '-//-', 1.00, 50.00]
          - [3M,  '-//-', 1.00, 50.00]
          - [4M,  '-//-', 1.00, 50.00]
          - [5M,  '-//-', 1.00, 50.00]
          - [6M,  '-//-', 1.00, 50.00]
          - [7M,  '-//-', 1.00, 50.00]
          - [8M,  '-//-', 1.00, 50.00]
          - [9M,  '-//-', 1.00, 50.00]
          - [10M, '-//-', 1.00, 50.00]
          - [11M, '-//-', 1.00, 50.00]
          - [1Y,  '-//-', 1.00, 50.00]
          - [15M, '-//-', 1.00, 50.00]
          - [18M, '-//-', 1.00, 50.00]
          - [2Y,  '-//-', 1.00, 50.00]
          - [3Y,  '-//-', 1.00, 50.00]
          - [4Y,  '-//-', 1.00, 50.00]
          - [5Y,  '-//-', 1.00, 50.00]
          - [6Y,  '-//-', 1.00, 50.00]
          - [7Y,  '-//-', 1.00, 50.00]
          - [8Y,  '-//-', 1.00, 50.00]

  clearingBasis:
    label: Clearing basis
    rows:
      - [{computeLabel: Compute Clearing Basis}, {status: true, id: computeBasis}]
      - []
      - [{sectionLabel: Clearing basis}]
      - [{tenorLabel: JSCC}, {basisHeader: LCH}, {basisHeader: Bilateral}]
      - use: [tenorLabel, basis, basis]
        rows:
          - [1W,  0.000, 0.000]
          - [2W,  0.000, 0.000]
          - [3W,  0.000, 0.000]
          - [1M,  0.000, 0.000]
          - [2M,  0.000, 0.000]
          - [3M,  0.000, 0.000]
          - [4M,  0.000, 0.000]
          - [5M,  0.000, 0.000]
          - [6M,  0.000, 0.000]
          - [7M,  0.000, 0.000]
          - [8M,  0.000, 0.000]
          - [9M,  0.000, 0.000]
          - [10M, 0.000, 0.000]
          - [11M, 0.000, 0.000]
          - [1Y,  0.000, 0.000]
          - [15M, 0.000, 0.000]
          - [18M, 0.000, 0.000]
          - [2Y,  0.000, 0.000]
          - [3Y,  0.125, 0.000]
          - [4Y,  0.125, 0.000]
          - [5Y,  0.125, 0.000]
          - [6Y,  0.125, 0.000]
          - [7Y,  0.125, 0.000]
          - [8Y,  0.125, 0.000]
          - [9Y,  0.125, 0.000]
          - [10Y, 0.125, 0.000]

  rfmLimits:
    label: RFM limits
    rows:
      - [{sectionLabel: RFM}, {blueHeader: 1Y}, {blueHeader: 2Y}, {blueHeader: 3Y}, {blueHeader: 5Y}]
      - use: [tenorLabel, mult, mult, mult, mult]
        rows:
          - [JSCC,      1.00, 1.00, 1.00, 1.00]
          - [LCH,       1.00, 1.00, 1.00, 1.00]
          - [Bilateral, 1.00, 1.00, 1.00, 1.00]
          - [TONAR,     1.00, 1.00, 1.00, 1.00]

layout:
  - [main, [clearingBasis, rfmLimits]]
```
