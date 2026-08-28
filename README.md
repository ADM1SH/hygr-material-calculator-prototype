# HYGR Material Requirement Calculator

A prototype warehouse and material requirement planning tool. It calculates material demand from a bill of materials, reconciles that demand against warehouse stock, and keeps a stock card audit ledger.

The interface follows Bauhaus and Dieter Rams principles: geometric shapes, no ornament, and every element earns its place.

## Live deployment

- URL: [https://hygr-material-calculator.pages.dev](https://hygr-material-calculator.pages.dev)
- Platform: Cloudflare Pages and Cloudflare Pages Functions

## The calculation

[CALCULATIONS.md](CALCULATIONS.md) records every formula, with a worked example. Read it before you change `app.js` or `server.py`.

The scope is one finished good, `FG-LB015/109`, a 5 g lip balm with 16 component lines.

The unit size comes from column `bom!H` of `Bom Example.xlsx`. Each raw material contributes a share of that 5 g. Across all 14 raw materials the per-piece column sums to exactly 5.000 g, so every gram is accounted for. At 400 pieces the total is 2.000 kg.

## Screens

### Tab 1: BOM calculator and reconciliation

The tab reproduces the Excel formula logic from `Bom Example.xlsx`. It normalizes usage per unit and returns bulk demand in KG and packaging demand in PCS.

It then reconciles that demand against warehouse stock. Each line carries a badge: `[OK] SUFF` or `[!] SHORT`.

**Issue Production Batch** deducts the exact material requirement from warehouse stock, updates the finished goods stock on hand, and writes itemized ledger entries.

### Tab 2: Stock card audit ledger

A searchable and filterable ledger of every `STOCK_IN` and `STOCK_OUT` transaction. Each row carries the balance before, the balance after, the operator, a reference document number, and notes.

### Tab 3: Material master and reorder radar

The tab calculates Stock Cover Months as `SCM = SOH / AMU`, and Days of Inventory Cover.

It compares cover days against the supplier lead time, then flags each material as `REORDER NOW`, `LOW STOCK`, `HEALTHY`, or `OVERSTOCKED`.

### Tab 4: Production batch history

An audit log of completed production runs. Each entry records target pieces, bulk mass, operator name, and timestamp.

## Export

Both the stock card ledger and the inventory health report download as CSV. `stock_card_ledger.csv` and `inventory_health_report.csv` in this repository are sample exports.

## Project structure

```
index.html                   Split-view interface, 25% and 75% columns
style.css                    Design tokens and layout
app.js                       Frontend calculations and API client
server.py                    Local Python backend, no dependencies
main.cpp                     Terminal CLI prototype
functions/api/[[route]].js   Cloudflare Pages Functions REST API
Bom Example.xlsx             Source dataset
CALCULATIONS.md              Every formula, with a worked example
stock_card_ledger.csv        Sample ledger export
inventory_health_report.csv  Sample inventory export
```

## Local development

### Option A: Python server

```bash
python3 server.py
```

Then open `http://localhost:8080`. The port is set at `server.py:19`.

To read the current state as JSON:

```bash
curl -s localhost:8080/api/state | python3 -m json.tool
```

### Option B: Cloudflare Pages

```bash
npx wrangler pages dev .
```

### Option C: C++ terminal app

```bash
clang++ -std=c++17 -Wall -Wextra -O2 main.cpp -o app
./app
```

## Notes

`server.py` binds `0.0.0.0`, so it answers on every network interface.

CAUTION: Do not run `server.py` on an untrusted network. It has no authentication and it accepts stock mutations from any caller.
