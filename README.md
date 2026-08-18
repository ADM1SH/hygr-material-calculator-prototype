# HYGR Material Requirement Calculator & Stock Card Prototype

Industrial Minimalism WMS/ERP Prototype for Material Requirement Planning, Live Stock Reconciliation, and Stock Card Audit Management. Built following the Bauhaus / Dieter Rams principles specified in `DESIGN.md`.

---

## Live Cloudflare Deployment

- **Live URL:** [https://hygr-material-calculator.pages.dev](https://hygr-material-calculator.pages.dev)
- **Deployment Platform:** Cloudflare Pages + Cloudflare Pages Functions (Serverless Edge)

---

## Features

1. **Live BOM Requirement Calculator & Stock Reconciliation (Tab 1):**
   - Direct formulaic calculation matching Excel formulation logic (`Bom Example.xlsx`).
   - Normalizes usage per unit (5g fill weight) and calculates total bulk demand in KG and packaging demand in PCS.
   - Live reconciliation against warehouse inventory with shortage badges (`[OK] SUFF` vs `[!] SHORT`).
   - **⚡ Issue Production Batch:** Deducts exact material requirements from warehouse inventory, updates Finished Goods stock on hand, and records itemized ledger entries.

2. **Stock Card Audit Ledger (Tab 2):**
   - Searchable and filterable ledger recording all `STOCK_IN` and `STOCK_OUT` transactions with balance before/after, operator attribution, reference document #, and notes.

3. **Material Master & SCM Reorder Radar (Tab 3):**
   - Calculates **Stock Cover Months ($\text{SCM} = \text{SOH} / \text{AMU}$)** and **Days of Inventory Cover**.
   - Compares cover days against Supplier Lead Times to flag `REORDER NOW`, `LOW STOCK`, `HEALTHY`, or `OVERSTOCKED`.

4. **Production Batch Execution History (Tab 4):**
   - Manufacturing audit log of all completed production runs with target pieces, bulk mass, operator name, and timestamp.

5. **Direct CSV Export:**
   - Download live CSV reports for both the Stock Card Ledger and Inventory Health Status.

---

## Project Structure

```
├── index.html                  # Desktop 25%/75% Split View interface
├── style.css                   # Bauhaus Design System & Tokens (DESIGN.md)
├── app.js                      # Reactive frontend calculations & API client
├── server.py                   # Local Python 3 backend server
├── main.cpp                    # Terminal C++ CLI prototype
├── Bom Example.xlsx            # Source Excel dataset
├── functions/
│   └── api/
│       └── [[route]].js        # Cloudflare Pages Functions serverless REST API
└── .gitignore
```

---

## Local Development

### Option A: Python Web Server
```bash
python3 server.py
```
Open `http://localhost:8080` in your browser.

### Option B: Cloudflare Pages Local Dev
```bash
npx wrangler pages dev .
```

### Option C: C++ Terminal App
```bash
clang++ -std=c++17 -Wall -Wextra -O2 main.cpp -o app
./app
```
