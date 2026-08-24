# Calculation Reference — HYGR Material Requirement Calculator

Every formula in the system, where it came from, and how to check it yourself.

**Source of truth:** `Bom Example.xlsx` — sheets `bom` and `Raw Material List`.
**Scope:** one finished good, `FG-LB015/109` "Black Cherry" (5 g lip balm), 16 component lines.

Every number in this document was generated directly from the workbook, not typed by hand.

---

## 1. The constants and inputs

| Symbol | Where | Value | Meaning |
|---|---|---|---|
| Unit size | `bom!H` | **5 g** | Fill weight of one finished piece (lead pump size) |
| SFG batch output | `bom!G` | **1,500 g** | Weight of one semi-finished bulk batch the recipe describes |
| Plan by kg | `bom!N4` | **6,000 g** | Input cell — target bulk mass |
| Plan by pcs | `bom!N7` | **400** | Input cell — target finished pieces |

`N4` and `N7` are the only two cells you type into. They are independent of each other —
`N4 = 6,000 g` implies 1,200 pcs while `N7 = 400` implies 2,000 g. You read whichever column matches your target.

---

## 2. Source data — the recipe (`bom` sheet, cols A–G)

Columns A–G come from R&D and must not be reordered. Everything after G was added for planning.

| # | RM Code | Material | QTY | UOM | SFG Output |
|---:|---|---|---:|:--:|---:|
| 1 | `RM-SS001/005` | KAHLWAX 2039L CANDELILA WAX | 81 | GM | 1500 |
| 2 | `RM-CO007/054` | DK-PGT PASTE IOB (BLACK) (5KG/PAIL) | 16 | GM | 1500 |
| 3 | `RM-L004/011` | Avocado Oil Cosmetic (23KG/TONG) | 231 | GM | 1500 |
| 4 | `RM-CO004/043` | DK-PGT Paste R7 (Red) (5KG/PAIL) | 16 | GM | 1500 |
| 5 | `RM-CO002/027` | DK-PGT Paste IOR (Coral) (5KG/PAIL) | 7 | GM | 1500 |
| 6 | `RM-SS004/020` | Akogel (20KG/BAG) | 68 | GM | 1500 |
| 7 | `RM-L005/028` | Primalhyal Gold (Hyaluronic Acid) (5KG/TONG) | 68 | GM | 1500 |
| 8 | `RM-SS003/012` | Beeswax (25KG/DRUM) | 271 | GM | 1500 |
| 9 | `RM-L001/001` | Palmester 3595 [MCT Oil] (190KG/Drum) | 337 | GM | 1500 |
| 10 | `RM-CO003/031` | DK-PGT Paste Y6L (Orange) (5KG/PAIL) | 34 | GM | 1500 |
| 11 | `RM-EO006/023` | Green Mandarin Essential Oil (1KG/BTL) | 24 | GM | 1500 |
| 12 | `RM-L022/069` | Jojoba Oil Golden (23KG/TONG) | 231 | GM | 1500 |
| 13 | `RM-L003/010` | Vitamin E Acetate - Care (5KG/TONG) | 14 | GM | 1500 |
| 14 | `RM-SS007/075` | Shea Butter Refined TYP EPR (25KG/CTN) | 102 | GM | 1500 |
| 15 | `PM-T031/277` | Tube - Lip Balm Paper (Black Cherry) 5g | 1 | PCS | 1 |
| 16 | `PM-BO101/247` | Unitbox - Lip Balm Paper (Black Cherry) 5g | 1 | PCS | 1 |

**Formulation check:** the 14 raw-material QTY values sum to **1,500 g**, exactly matching the SFG batch output of 1,500 g.
This is a true 100% formulation — not a rounded approximation.

---

## 3. Source data — material master (`Raw Material List` sheet)

| RM Code | Status | Lead time (d) | Stock on hand | Subgroup |
|---|:--:|---:|---:|---|
| `RM-SS001/005` | ACTIVE | 134 | 125.280 kg | — |
| `RM-CO007/054` | ACTIVE | 104 | 4.350 kg | — |
| `RM-L004/011` | ACTIVE | 30 | 23.000 kg | — |
| `RM-CO004/043` | ACTIVE | 194 | 7.500 kg | — |
| `RM-CO002/027` | ACTIVE | 104 | 75.000 kg | — |
| `RM-SS004/020` | ACTIVE | 74 | 33.680 kg | — |
| `RM-L005/028` | ACTIVE | 30 | 10.237 kg | — |
| `RM-SS003/012` | ACTIVE | 30 | 103.460 kg | — |
| `RM-L001/001` | ACTIVE | 30 | 424.225 kg | — |
| `RM-CO003/031` | ACTIVE | 0 | 34.110 kg | — |
| `RM-EO006/023` | ACTIVE | 56 | 6.660 kg | — |
| `RM-L022/069` | ACTIVE | 30 | 35.550 kg | — |
| `RM-L003/010` | ACTIVE | 74 | 135.000 kg | — |
| `RM-SS007/075` | ACTIVE | 120 | 377.980 kg | — |
| `PM-T031/277` | ACTIVE | 65 | 21,721.000 pcs | Primary Packaging |
| `PM-BO101/247` | ACTIVE | 30 | 9,826.000 pcs | Unitbox |

> ⚠️ **Note the units.** The column is headed *"Stock on hand (kg)"* but the two `PM-` rows hold
> **pieces** (21,721 tubes, 9,826 boxes), not kilos. The unit is implied by the code prefix and never
> declared. The system infers it from `RM-` vs `PM-`; see §6.

---

## 4. The five core formulas

### F1 — Material makeup per piece  (`bom!I`)

How many grams of this material end up in one finished item.

```
usage_per_piece = (QTY / SFG_output) * unit_size
                = (D    / G         ) * H
```

**Worked example — KAHLWAX 2039L CANDELILA WAX:**

```
(81 g / 1500 g) * 5 g = 0.2700 g per piece
```

**Check:** across all 14 raw materials this column sums to **5.000 g** — exactly the 5 g unit size. Every gram is accounted for.

### F2 — Plan by pieces  (`bom!J`)

```
required = usage_per_piece * target_pieces
         = I               * $N$7
```

**Worked example — DK-PGT PASTE IOB (BLACK) (5KG/PAIL) at 400 pcs:**

```
0.0533 g * 400 pcs = 21.33 g
```

### F3 — Plan by kilo  (`bom!K`)

```
required = (QTY / SFG_output) * target_bulk_grams
         = (D   / G         ) * $N$4
```

**Worked example — KAHLWAX 2039L CANDELILA WAX at 6,000 g bulk:**

```
(81 / 1500) * 6,000 g = 324.00 g
```

Normalising to exactly 1 kg (the header's "per 1000g") is the same ratio with 1000 in place of `$N$4`:

```
(81 / 1500) * 1000 g = 54.00 g per kilo of bulk
```

### F4 — Production plan use  (`Raw Material List!F`)

Pulls demand back from the BOM and converts grams to kilos.

```excel
RM rows:  = XLOOKUP(code, bom!C:C, bom!J:J, 0, 0, 1) / 1000
PM rows:  = XLOOKUP(code, bom!C:C, bom!J:J, 0, 0, 1)
```

The `/1000` converts g → kg. **PM rows do not divide**, because column J is already a piece count.

### F5 — Expected balance after production  (`Raw Material List!G`)

```
balance_after = stock_on_hand - production_plan_use
              = E             - F
```

---

## 5. Full worked table

All 16 lines, both planning modes. `RM` in grams/kg, `PM` in pieces.

| RM Code | Per pc (I) | @ 400 pcs (J) | @ 6,000 g (K) | Plan use (F) | On hand (E) | Balance (G) |
|---|---:|---:|---:|---:|---:|---:|
| `RM-SS001/005` | 0.2700 g | 108.00 g | 324.00 g | 0.108000 kg | 125.280 kg | 125.172000 kg |
| `RM-CO007/054` | 0.0533 g | 21.33 g | 64.00 g | 0.021333 kg | 4.350 kg | 4.328667 kg |
| `RM-L004/011` | 0.7700 g | 308.00 g | 924.00 g | 0.308000 kg | 23.000 kg | 22.692000 kg |
| `RM-CO004/043` | 0.0533 g | 21.33 g | 64.00 g | 0.021333 kg | 7.500 kg | 7.478667 kg |
| `RM-CO002/027` | 0.0233 g | 9.33 g | 28.00 g | 0.009333 kg | 75.000 kg | 74.990667 kg |
| `RM-SS004/020` | 0.2267 g | 90.67 g | 272.00 g | 0.090667 kg | 33.680 kg | 33.589333 kg |
| `RM-L005/028` | 0.2267 g | 90.67 g | 272.00 g | 0.090667 kg | 10.237 kg | 10.146333 kg |
| `RM-SS003/012` | 0.9033 g | 361.33 g | 1084.00 g | 0.361333 kg | 103.460 kg | 103.098667 kg |
| `RM-L001/001` | 1.1233 g | 449.33 g | 1348.00 g | 0.449333 kg | 424.225 kg | 423.775667 kg |
| `RM-CO003/031` | 0.1133 g | 45.33 g | 136.00 g | 0.045333 kg | 34.110 kg | 34.064667 kg |
| `RM-EO006/023` | 0.0800 g | 32.00 g | 96.00 g | 0.032000 kg | 6.660 kg | 6.628000 kg |
| `RM-L022/069` | 0.7700 g | 308.00 g | 924.00 g | 0.308000 kg | 35.550 kg | 35.242000 kg |
| `RM-L003/010` | 0.0467 g | 18.67 g | 56.00 g | 0.018667 kg | 135.000 kg | 134.981333 kg |
| `RM-SS007/075` | 0.3400 g | 136.00 g | 408.00 g | 0.136000 kg | 377.980 kg | 377.844000 kg |
| `PM-T031/277` | 1 pc | 400 pcs | 1,200 pcs | 400 pcs | 21,721 pcs | 21,321 pcs |
| `PM-BO101/247` | 1 pc | 400 pcs | 1,200 pcs | 400 pcs | 9,826 pcs | 9,426 pcs |

**Totals (raw materials only):**

- Per piece → **5.000 g** = the 5 g unit size ✓
- At 400 pcs → **2,000 g = 2.000 kg** (= 400 × 5 g) ✓
- At 6,000 g → **6,000 g = 6.000 kg** (= the 6,000 g target) ✓

Each total closing back on its input is the proof the formulation is internally consistent.

---

## 6. Raw Material vs Packaging Material — the branching rule

This is the one place the Excel needs a human and the code does not.

| | Raw Material (`RM-`) | Packaging Material (`PM-`) |
|---|---|---|
| Measured by | weight (grams → kilos) | piece count |
| Per piece | `(QTY / SFG) * unit_size` | always **1** |
| Plan by pcs | `usage * pieces / 1000` → kg | `ceil(usage * pieces)` → pcs |
| Plan by kg | `(QTY / SFG) * bulk_g` → g | `bulk_g / unit_size` → pcs |
| Rounding | none (fractional kg is fine) | **`ceil`** — you cannot issue half a tube |

**In the workbook this rule is hand-patched.** Cells `I16` and `I17` are hardcoded `1` rather than
formulas, because `(D/G)*H` would give `(1/1)*5 = 5` — wrong for a tube. Column `K` likewise switches
to `$N$4/H` on those two rows. In the project this is a real branch on the material's category, so it
cannot be forgotten when a row is added.

**PM subcategories** (from the meeting):

- **Primary** — touches the product (the tube). Production cannot proceed without it.
- **Secondary** — outer packaging (unitbox, label). Production can sometimes proceed without it.

---

## 7. Switching between planning modes

The two modes are just a conversion through the unit size:

```
pieces  ->  bulk_kg :   bulk_kg = pieces * unit_size / 1000
bulk_kg ->  pieces  :   pieces  = bulk_kg * 1000 / unit_size
```

So the workbook's two inputs are equivalent to: `400 pcs = 2.000 kg` and `6 kg = 1,200 pcs`.

Both modes then run the *same* per-piece maths — plan-by-kg simply converts to pieces first. That is
why column K can be reproduced exactly by planning for 1,200 pieces.

---

## 8. Yield / scrap buffer

Not in the Excel — added by the system for real production, where you overdraw slightly to cover loss.

```
multiplier = 1 + (buffer_percent / 100)
required   = base_requirement * multiplier
```

Default is **0%**, which is why the app reproduces the Excel exactly out of the box. Set it to 5% and
every requirement rises by 5% — the Excel has no equivalent.

---

## 9. Stock deduction (issuing a batch)

Issuing a production batch applies F5 for real and writes an audit trail:

```
for each of the 16 BOM lines:
    before  = material.stock_on_hand
    after   = before - required_qty
    material.stock_on_hand = after
    write ledger entry (STOCK_OUT, qty, before, after, batch ref, operator)

finished_goods.stock_on_hand += target_pieces
```

At 400 pcs this lands every material on exactly the value in `Raw Material List!G`, and produces
16 ledger lines plus one batch record.

---

## 10. Stock health — Stock Cover Months

From the meeting. **Not derivable from the Excel** — see §11.

```
SCM        = stock_on_hand / avg_monthly_usage
cover_days = SCM * 30
```

Health is judged against the supplier lead time, in this order:

| Condition | Status | Meaning |
|---|---|---|
| `cover_days <= lead_time` | **REORDER NOW** | Stock runs out before a new order can land |
| `cover_days <= lead_time + 21` | **LOW STOCK** | Inside a 3-week safety buffer |
| `SCM > 6` | **OVERSTOCKED** | Capital tied up, storage pressure |
| otherwise | **HEALTHY** | Target band is roughly 2–4 months |

Order matters: the reorder test runs first, so a material can be flagged `REORDER NOW` even while
holding a large absolute quantity, if its lead time is long enough.

**Worked example — KAHLWAX 2039L CANDELILA WAX:** 125.280 kg on hand, 30.0 kg/month usage
→ SCM = 4.2 months → 125 cover days, against a 134-day lead time → **REORDER NOW**.

---

## 11. Known gaps in the source data

Two things the system needs that the workbook does not supply. Both are data problems, not logic problems.

1. **`RM-CO003/031` (DK-PGT Paste Y6L (Orange) (5KG/PAIL)) has lead time `0`.** Cell `D11` in the workbook is genuinely
   blank/zero — missing data, not a real zero. With a lead time of 0 the reorder test
   `cover_days <= 0` can never fire, so this material can never be flagged. **Key a real value in**
   **before relying on the reorder radar.**

2. **`avg_monthly_usage` does not exist in the workbook at all.** SCM needs it, so the system carries
   hardcoded per-material estimates. The SCM formula and thresholds are correct, but the inputs are
   assumptions. This is the one figure on screen that is *not* traceable to the Excel.

Also worth knowing, though not currently wrong:

3. **`XLOOKUP` returns the first match only.** The workbook handles exactly one finished good. The
   moment a second product uses a shared material, the second demand is silently dropped. Multi-product
   planning needs summing across all BOMs plus an allocation order — the "500 g on hand, product A takes
   400 g so product B's 300 g cannot be fulfilled" case from the meeting is **not computable in the**
   **workbook as it stands**.

---

## 12. Where each formula lives in the code

Three implementations, all verified to agree with the workbook.

| Formula | Cloudflare (`functions/api/[[route]].js`) | Python (`server.py`) | C++ (`main.cpp`) | Browser (`app.js`) |
|---|---|---|---|---|
| F1 makeup per pc | `:222` | `:136` | `:331` | from API |
| F2/F3 required (RM) | `:281-282` | `:183-184` | `:402-403` | `:407-408` |
| F2/F3 required (PM) | `:286` | `:188` | `:407` | `:412` |
| F5 balance after | `:291` | `:192` | `:411` | `:417` |
| Mode conversion | `:389-395` | `:300-305` | `:743-752` | `:460`, `:495` |
| Yield buffer | `:268` | `:169` | `:388` | `:394` |
| SCM + health | `:564-569` | `:449` | `:447-465` | `:296-311` |

`server.py` reads `Bom Example.xlsx` live at startup, so editing the workbook changes the app.
The Cloudflare function and the C++ CLI carry the same values as inline seed data, because neither
can open an xlsx at runtime.

---

## 13. Checking this yourself

```bash
# Web app (parses the Excel live)
python3 server.py                 # -> http://localhost:8080

# Terminal app
clang++ -std=c++17 -Wall -Wextra -O2 main.cpp -o app && ./app

# Raw numbers straight from the API
curl -s localhost:8080/api/state | python3 -m json.tool | less
```

To confirm the app matches the workbook, open the Excel side by side and compare:

- Set the target to **400 pieces** → the *Required* column must equal `bom!J` ÷ 1000 for RM rows,
  and `bom!J` as-is for PM rows.
- Set the target to **6 kg** → the *Required* column must equal `bom!K` ÷ 1000 for RM rows,
  and `bom!K` as-is for PM rows.
- Press **Issue Production Batch** → every *Stock On Hand* must land on `Raw Material List!G`.
- Press **Reset Seed Data** → every *Stock On Hand* must return to `Raw Material List!E`.

