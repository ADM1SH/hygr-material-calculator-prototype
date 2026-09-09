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
- Provide printable Batch Manufacturing Record (BMR) compounding and floor scaling work order (Option 2).
- Provide automated purchase reorder drafter with supplier pack-size rounding (Option 3).

## 2. Current State
- Option 2 (Printable BMR Work Order) and Option 3 (Auto PO Reorder Drafter) fully implemented and verified.
- Local backend (`server.py`) and Cloudflare Pages edge function (`functions/api/[[route]].js`) operate in full feature parity.
- Cleanroom compounding scaling sheet verified with 4-phase formulation grouping and standard A4 monochrome print rules.
- Supplier pack sizes ingested directly from column 5 of sheet 'Raw Material & Expired Date' with ceiling rounding math.
- Local server active on port 8080.

## 3. Active Files
- `server.py`: Local backend server with multi-SKU weekly planning, simulation engine, pack-size sizing, and reorder export endpoints.
- `functions/api/[[route]].js`: Serverless edge API with full parity on Cloudflare Pages.
- `index.html`: Desktop UI with weekly planner, timeline strip, staging modal, BMR sheet modal, and reorder drafter modal.
- `app.js`: Reactive frontend controller handling state, BMR scaling calculations, phase classification, reorder draft tables, and clipboard copy.
- `style.css`: Minimalist design tokens, BMR print layout rules (@media print), and reorder summary cards.
- `CALCULATIONS.md`: Formal formula reference updated with Section 15 (Pack-Size Sizing) and Section 16 (BMR Floor Scaling).
- `walkthrough.md`: Completion summary and test report.

## 4. Changes Made
- Ingested supplier pack sizes (`pack_size`) from Excel column 5 and active lot numbers (`current_lot_no`) from column 8.
- Added `/api/reorder/draft` and `/api/export/reorder.csv` endpoints in Python and Cloudflare edge function.
- Implemented integer pack procurement math: `Packs = ceil(Deficit / PackSize)`.
- Added `🖨 BMR` button to each scheduled batch row in `#schedule-table`.
- Added `📋 Draft PO Reorder List` action button to BOM and inventory health toolbars.
- Created `#modal-bmr-sheet` rendering GMP compounding records with 4-phase formulation tables, blank tare/net boxes, 6-step SOP, and QC sign-offs.
- Created `#modal-reorder-drafter` rendering deficit materials, supplier pack sizes, integer order packs, and critical lead time tags.
- Added clipboard copy helper generating formatted text for instant WhatsApp / email supplier messaging.
- Added strict `@media print` rules isolating BMR work orders onto clean A4 paper without UI chrome.
- Removed all em dashes repository-wide.

## 5. Failed Attempts
- Direct `curl | head` pipeline failed due to macOS zsh invoking Perl's `HEAD` instead of coreutils `head`. Resolved by invoking `/usr/bin/head` or native Python test snippets.
- Unquoted string keys inside single-quoted f-strings in inline Python bash commands produced syntax errors. Resolved by using clean multi-line Python scripts.

## 6. Next Steps
- Review printable BMR floor scaling sheets with Xiao and cleanroom operators.
- Gather feedback on supplier pack size minimums for custom packaging runs.
- Support batch lot number auto-generation sequences for scheduled production.
