# Project Handoff: HYGR Material Requirement Calculator & Stock Card System

## 1. Goals
- Transition single-item BOM calculator to multi-SKU weekly production planning grid.
- Incorporate recipes from '13.1.2025 HYGR Production Schedule.xlsx' (Deodorants, Lip Balms, Hair Oil, Lip Scrub, Face Oils).
- Support 190+ raw materials from 'Raw Material & Expired Date' master sheet.
- Implement chronological day-by-day cumulative stock runout projection across Monday to Saturday.
- Aggregate multi-batch material requirements vs live Stock On Hand (SOH).
- Implement shortage-first sorting and drill-down analysis for shared raw materials.
- Display Expected Usage and Projected Balance on Stock Card and Health Radar.
- Build editable BOM mass deduction staging with actual scale variances and substitutions.
- Implement inline batch management with two-tier access control (Admin vs Operator).
- Provide printable Batch Manufacturing Record (BMR) compounding and floor scaling work order.
- Provide automated purchase reorder drafter with supplier pack-size rounding.
- Separate recipe scheduling from material requirements into dedicated top-level tabs.

## 2. Current State
- Dedicated top-level navigation bar operational with five distinct tabs:
  1. `1. Production Schedule`
  2. `2. BOM & Material Demand`
  3. `3. Stock Card Ledger`
  4. `4. Stock Health & SCM Radar`
  5. `5. Execution History`
- Production Schedule tab includes unified high-density toolbar with segmented control (`[ Week Matrix ] [ Month View ] [ Queue Ledger ]`), period stepper, recipe filter, and primary `+ Schedule Batch` action.
- 6-column calendar matrix view (Monday to Saturday, matching `DAYS_OF_WEEK`) with batch cards opening the 460px right slide-over details drawer.
- AUDIT CORRECTION: day cards resolve `min-height: auto` (74px measured), not 120px. No day card carries a today modifier, so the today highlight is absent.
- Tabular Queue Ledger view operational with alternating rows, 8px cell padding, BMR print trigger, and inline batch editing.
- Slide-over batch drawer (`#drawer-batch-details`, 460px width) handles editing, volume conversion (Bulk KG, Pots, Pieces), yield buffers, BMR links, and batch deletion.
- BOM & Material Demand tab isolated from schedule clutter, maintaining full drill-down analysis, yield buffers, and auto PO reorder drafting.
- Local server active on port 8080.
- Master Production & Demo Verification Prompt executed on 2026-09-10. Sections 1, 2, 4 and 5 complete. Section 3 verified through DOM and API assertions.
- Audit verdict: NO-GO on compounding maths. One critical defect, three high, two medium. See section 5.

## 3. Active Files
- `index.html`: Top-level primary navigation bar, dedicated schedule panel with matrix and queue views, dedicated BOM panel, and 460px slide-over drawer.
- `style.css`: Minimalist design tokens (`DESIGN.md`), top navigation tab rules, schedule toolbar, 6-column calendar grid, queue table zebra striping, and slide-over drawer styling.
- `app.js`: State management, view switching, calendar matrix renderer, queue ledger renderer, period stepper, recipe filters, and drawer CRUD controllers.
- `server.py`: Local backend server with multi-SKU weekly planning, batch updates, simulation engine, and reorder export endpoints.
- `functions/api/[[route]].js`: Serverless edge API with full parity on Cloudflare Pages.
- `CALCULATIONS.md`: Formal formula reference for compounding formulas F1 to F13.
- `handoff.md`: Project status and handoff log.

## 4. Changes Made
- Added `.top-nav-bar` with 2px bottom indicator border (`#133829`) matching `DESIGN.md`.
- Separated `view-schedule` and `view-bom` into independent panels.
- Added `.schedule-toolbar` with 36px segmented view toggle (`[ Week Matrix ] [ Month View ] [ Queue Ledger ]`), period stepper, recipe dropdown, and add batch button.
- Built `.calendar-matrix-container` with 7-column grid layout, 120px min-height cells, date numbers, and batch cards (`.scheduled-card`).
- Built `.queue-table` with alternating rows and 8px vertical padding.
- Built `#drawer-batch-details` (460px right slide-over drawer) with live mass/unit conversion, BMR link, delete action, and save handler.
- Synced badge counts across top navigation and left-pane menu.
- Added escape key dismissals and print media exclusions for the new drawer and schedule toolbar.
- Formulated end-to-end Master Production & Demo Verification Prompt combining functional workflow testing and strict DESIGN.md visual compliance.
- Verified zero em dashes repository-wide.

## 5. Failed Attempts
- Direct `curl | head` pipeline failed due to macOS zsh invoking Perl's `HEAD` instead of coreutils `head`. Resolved by invoking `/usr/bin/head` or native Python test snippets.
- Unquoted string keys inside single-quoted f-strings in inline Python bash commands produced syntax errors. Resolved by using clean multi-line Python scripts.

### Audit findings, 2026-09-10 (D1 and D2 fixed, D3 to D8 open)

**D1 CRITICAL. FIXED 2026-09-10. POTS conversion ignored the per-product SFG batch weight.**
Four sites hardcode `1.5`: `app.js:171`, `app.js:701`, `server.py:909`, `server.py:961`.
`sfg_batch_weight_grams` varies per product: 1500, 10000, 34000, 40000, 51000.
Only the five lip balms are 1500, so 8 of 13 SKUs convert wrongly.
Reproduced: `FG-D017/017` at 1 POT stored `target_bulk_kg = 1.5` against a correct 51.0, a 97 percent understatement.
Demand aggregates from `target_bulk_kg` at `server.py:652`, so shortage analysis, the reorder draft and the stock card deduction all inherit the error.
`app.js:695` already reads `sfg_weight` from the product and then ignores the value on the next line.
Fixed in six sites, not four. `functions/api/[[route]].js:638` and `:688` carried the same defect and would have kept the Cloudflare deployment wrong.
Each site now reads `sfg_batch_weight_grams` from the product and converts with `target_qty * (sfg_weight / 1000.0)`.
Verified after a server restart: 1 pot returns 1.5, 10.0, 34.0, 40.0 and 51.0 KG for the five SFG classes, and 3 pots of `FG-D017/017` returns 153.0 KG with 3825 pieces through the update path.
Both client previews now agree with the SFG standard displayed beside them.
Regression held: lip balm 2 POTS at a 5 percent buffer still previews "3.000 KG Bulk Mass, 600 Pieces".
No stored batch changed value, because both seeded POTS batches are lip balms at 1500 g.

**D2 HIGH. FIXED 2026-09-10. `handle_add_batch` accepted zero and negative quantities.**
`server.py:903` casts `target_qty` with no guard. Posting `-5` POTS stored `-7.5` KG and `-1500` pieces.
`handle_update_batch` guards `> 0`. Create did not.

Fixed in four places. `server.py` rejects a non-positive or unparseable quantity with `400 Target quantity must be greater than zero`, matching the idiom already used for stock entries. `functions/api/[[route]].js` throws the same message into the existing 400 catch, and now reads `data.target_qty ?? 5.0` rather than `|| 5.0`, so an explicit 0 reaches the guard instead of silently becoming 5.0.

The client carried the same masking defect. Both save paths read `parseFloat(...) || 1.0`, so a typed 0 became 1.0 and saved a batch the operator never asked for. One shared `readBatchQty` helper now validates, highlights the field through `.is-invalid`, focuses it and refuses the submit. `submitAddBatch` also gained the missing `res.ok` check, without which a server refusal read as success.

`.input-field.is-invalid` sits after `.input-field:focus` on purpose. Both carry the same specificity, so source order decides, and the invalid state has to win while the operator is in the field.

Verified: 0, -5, "abc" and null all answer 400. A valid 2 pots still saves at 3.0 KG and 600 pieces. In the browser, saving with 0 sends zero requests, leaves the plan at 11, keeps the drawer open and flags the field red at `#ba1a1a`. The flag clears on a valid value and as the operator types.

**D3 HIGH. `yield_buffer_percent` has no server upper bound.**
`server.py:930` stores the raw float. `server.py:973` clamps the lower bound only.
A buffer of 500 was accepted and stored. The HTML `max="25"` on `index.html:151` and `index.html:762` is the only limit, and no form validation enforces the attribute.
The buffer multiplies straight into demand at `server.py:654`.

**D4 HIGH. Unknown `fg_code` is accepted.**
`server.py:901` defaults the code and `server.py:905` defaults the product, so a batch for `FG-DOES-NOT-EXIST` was created against a 5.0 g fallback unit weight instead of being refused.

**D5 MEDIUM. Buttons without an explicit rule render in Arial.**
Form controls do not inherit `font-family`. `style.css` carries 50 separate `font-family` declarations, and every selector missed by them falls back to the user agent default.
Affected: `.role-toggle-btn` (2, visible in the header), `.btn-icon` (196), `.modal-close-btn` (4, visible whenever a modal opens).
Fix: one reset, `button, input, select, textarea { font: inherit; }`.

**D6 MEDIUM. Orphaned Sunday add button.**
`DAYS_OF_WEEK` holds 6 days and the drawer select lists 6. `index.html` still renders a Sunday `+ Add` calling `openNewBatchDrawerForDay('Sunday')`.
Setting a select to an absent option yields `value === ''` and `selectedIndex === -1`, and `server.py:922` then files the batch on Monday with no warning.

**D7 LOW. Toolbar control heights disagree.**
`.segmented-btn` and `.stepper-btn` measure 34px. `.select-field` and `.btn` measure 36px. The spec requires one shared height.

**D8 LOW. Native `confirm()` bypasses the modal system.**
`app.js:766`, `825`, `1327`, `1441`. Blocking dialogs also stop browser automation, so Reset DB cannot be tested unattended.

### Defects in the verification prompt itself

- Check 1 compares custom properties against `rgb()` strings. `getPropertyValue` returns the authored token (`#F6F4EE`), so the check reports 8 failures against 8 correct tokens. Resolve through a probe element, or compare the hex.
- `.nav-tab-btn` does not exist. The real class is `.top-nav-btn`.
- `#app-wrapper` does not exist. The real selector is the class `.app-wrapper`.
- `FG-LB015/109` is named "Lip Balm Paper (Black Cherry) 5g", not "Tinted Lip Balm (109 Peach)".
- Step 2 asserts a 7-column grid. The system is 6-day by design.
- Section 5.3 Reset DB triggers `window.confirm` and blocks automation. Run by hand.

### Gates passed

All API endpoints 200. Products 13, materials 196. All 8 design tokens correct.
Zero shadow on 5 level-1 cards. No radius above 16px across 467 pill candidates.
Table headers 8px padding, 2px bottom rule, uppercase, JetBrains Mono. Queue rows zebra `#F2EFE7` exact, 8px cell padding.
`.app-wrapper` max-width 1440px. Split layout 320px sidebar and 24px gap exact. Zero horizontal scroll.
Drawer 460px wide, docks flush at `right: 0`, no shadow, 1px `--outline-variant` border.
Lip balm 2 POTS with a 5 percent buffer previews "3.000 KG Bulk Mass, 600 Pieces", matching formulas F1 and F2.

### Environment traps hit during the audit

- A hidden Chrome tab (`document.hidden === true`) freezes CSS transitions, so the drawer reported `right: -480px` while open. Neutralise the transition before measuring, or the docking check reports a false defect. The same condition makes CDP screenshots fail.
- The same trap hit twice. `.input-field` carries `transition: border-color`, so a newly applied `.is-invalid` read as the old border colour and looked broken. Set `style.transition = 'none'` and force a reflow before reading any transitioned property.
- `await` inside the browser JavaScript bridge timed out the renderer at 45s. Use synchronous expressions.
- A shell `for` loop over batch ids issued the deletes without effect. Deleting one id per invocation worked and returned 200.

## 6. Next Steps
- D1 is fixed and verified across all six sites, including the edge parity file. Restart `server.py` to pick the change up in any running instance.
- Add the server guards for D3 and D4. Reject rather than coerce, as D2 now does.
- `handle_update_batch` still ignores a non-positive quantity silently rather than refusing. Not data corruption, so left alone, but the two paths now disagree.
- Add the `font: inherit` reset for D5 and delete the redundant `font-family` declarations it makes dead.
- Remove the Sunday add button, or extend `DAYS_OF_WEEK` to 7 across server, select and matrix.
- Re-run this suite after the fixes. Do not run the demo walkthrough until D1 clears.
- Correct the six defects in the verification prompt so a rerun does not report false failures.
- Deploy to Cloudflare Pages only after a clean rerun.
