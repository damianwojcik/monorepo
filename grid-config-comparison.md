# Grid config - before/after comparison

Measured on `jpy-main2.yaml` (3 grids, 258 cells, 23 templates) and the same config rewritten in the short format.

| Metric | Before (`jpy-main2.yaml`) | After (short format) | Change |
|---|---|---|---|
| Lines (total) | 413 | 170 | -59% |
| Lines (non-empty) | 408 | 157 | -62% |
| Keywords used (occurrences) | 1157 | 128 | -89% |
| Distinct keywords (vocabulary) | 27 | 24 | -3 |
| Most frequent keywords | `row` 259, `column` 259, `template` 258, `value` 138, `content` 120 | `style` 19, `textAlign` 19, `color` 16, `backgroundColor` 14, `fontWeight` 12 | - |

"Keywords" are the keys defined by the config format. User-chosen names, such as template names (`mult`, `tenorLabel`) and grid names (`main`), are not counted.

Most of the saving comes from the grids: `row`, `column`, `template`, `value` and `content` account for about 1030 of the 1157 keyword uses in the original. The remaining keywords are mostly style properties inside templates.
