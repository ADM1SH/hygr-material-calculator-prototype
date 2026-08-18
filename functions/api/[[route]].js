/**
 * Cloudflare Pages Functions Serverless API
 * HYGR Material Requirement Calculator & Stock Card System
 * 
 * Provides full serverless backend endpoints for Cloudflare Pages:
 * - GET  /api/state
 * - POST /api/plan
 * - POST /api/batch/issue
 * - POST /api/transaction
 * - POST /api/reset
 * - GET  /api/export/ledger.csv
 * - GET  /api/export/inventory.csv
 */

// Initial Seed Data matching Bom Example.xlsx
function getInitialState() {
  const products = {
    "FG-LB015/109": {
      "fg_code": "FG-LB015/109",
      "name": "Lip Balm Paper (Black Cherry) 5g",
      "category": "Lip Care",
      "unit_weight_grams": 5.0,
      "sfg_batch_weight_grams": 1500.0,
      "stock_on_hand": 0.0,
      "description": "Deep moisturizing lip balm with natural waxes and Black Cherry tint."
    }
  };

  const product_order = ["FG-LB015/109"];

  const materials = {
    "RM-SS001/005": {
      "code": "RM-SS001/005",
      "description": "KAHLWAX 2039L CANDELILA WAX",
      "status": "ACTIVE",
      "lead_time_days": 134,
      "stock_on_hand": 125.280,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Wax",
      "avg_monthly_usage": 30.0
    },
    "RM-CO007/054": {
      "code": "RM-CO007/054",
      "description": "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)",
      "status": "ACTIVE",
      "lead_time_days": 104,
      "stock_on_hand": 4.350,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Colorant",
      "avg_monthly_usage": 1.5
    },
    "RM-L004/011": {
      "code": "RM-L004/011",
      "description": "Avocado Oil Cosmetic (23KG/TONG)",
      "status": "ACTIVE",
      "lead_time_days": 30,
      "stock_on_hand": 23.000,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Oil",
      "avg_monthly_usage": 20.0
    },
    "RM-CO004/043": {
      "code": "RM-CO004/043",
      "description": "DK-PGT Paste R7 (Red) (5KG/PAIL)",
      "status": "ACTIVE",
      "lead_time_days": 194,
      "stock_on_hand": 7.500,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Colorant",
      "avg_monthly_usage": 1.8
    },
    "RM-CO002/027": {
      "code": "RM-CO002/027",
      "description": "DK-PGT Paste IOR (Coral) (5KG/PAIL)",
      "status": "ACTIVE",
      "lead_time_days": 104,
      "stock_on_hand": 75.000,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Colorant",
      "avg_monthly_usage": 15.0
    },
    "RM-SS004/020": {
      "code": "RM-SS004/020",
      "description": "Akogel (20KG/BAG)",
      "status": "ACTIVE",
      "lead_time_days": 74,
      "stock_on_hand": 33.680,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Texturizer",
      "avg_monthly_usage": 10.0
    },
    "RM-L005/028": {
      "code": "RM-L005/028",
      "description": "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)",
      "status": "ACTIVE",
      "lead_time_days": 30,
      "stock_on_hand": 10.237,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Active",
      "avg_monthly_usage": 5.0
    },
    "RM-SS003/012": {
      "code": "RM-SS003/012",
      "description": "Beeswax (25KG/DRUM)",
      "status": "ACTIVE",
      "lead_time_days": 30,
      "stock_on_hand": 103.460,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Wax",
      "avg_monthly_usage": 35.0
    },
    "RM-L001/001": {
      "code": "RM-L001/001",
      "description": "Palmester 3595 [MCT Oil] (190KG/Drum)",
      "status": "ACTIVE",
      "lead_time_days": 30,
      "stock_on_hand": 424.225,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Oil",
      "avg_monthly_usage": 60.0
    },
    "RM-CO003/031": {
      "code": "RM-CO003/031",
      "description": "DK-PGT Paste Y6L (Orange) (5KG/PAIL)",
      "status": "ACTIVE",
      "lead_time_days": 0,
      "stock_on_hand": 34.110,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Colorant",
      "avg_monthly_usage": 4.0
    },
    "RM-EO006/023": {
      "code": "RM-EO006/023",
      "description": "Green Mandarin Essential Oil (1KG/BTL)",
      "status": "ACTIVE",
      "lead_time_days": 56,
      "stock_on_hand": 6.660,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Fragrance",
      "avg_monthly_usage": 2.5
    },
    "RM-L022/069": {
      "code": "RM-L022/069",
      "description": "Jojoba Oil Golden (23KG/TONG)",
      "status": "ACTIVE",
      "lead_time_days": 30,
      "stock_on_hand": 35.550,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Oil",
      "avg_monthly_usage": 25.0
    },
    "RM-L003/010": {
      "code": "RM-L003/010",
      "description": "Vitamin E Acetate - Care (5KG/TONG)",
      "status": "ACTIVE",
      "lead_time_days": 74,
      "stock_on_hand": 135.000,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Antioxidant",
      "avg_monthly_usage": 12.0
    },
    "RM-SS007/075": {
      "code": "RM-SS007/075",
      "description": "Shea Butter Refined TYP EPR (25KG/CTN)",
      "status": "ACTIVE",
      "lead_time_days": 120,
      "stock_on_hand": 377.980,
      "uom": "KG",
      "category": "RAW_MATERIAL",
      "subgroup": "Butter",
      "avg_monthly_usage": 50.0
    },
    "PM-T031/277": {
      "code": "PM-T031/277",
      "description": "Tube - Lip Balm Paper (Black Cherry) 5g",
      "status": "ACTIVE",
      "lead_time_days": 65,
      "stock_on_hand": 21721.0,
      "uom": "PCS",
      "category": "PACKAGING_PRIMARY",
      "subgroup": "Primary Packaging",
      "avg_monthly_usage": 5000.0
    },
    "PM-BO101/247": {
      "code": "PM-BO101/247",
      "description": "Unitbox - Lip Balm Paper (Black Cherry) 5g",
      "status": "ACTIVE",
      "lead_time_days": 30,
      "stock_on_hand": 9826.0,
      "uom": "PCS",
      "category": "PACKAGING_SECONDARY",
      "subgroup": "Unitbox",
      "avg_monthly_usage": 5000.0
    }
  };

  const material_order = [
    "RM-SS001/005", "RM-CO007/054", "RM-L004/011", "RM-CO004/043",
    "RM-CO002/027", "RM-SS004/020", "RM-L005/028", "RM-SS003/012",
    "RM-L001/001", "RM-CO003/031", "RM-EO006/023", "RM-L022/069",
    "RM-L003/010", "RM-SS007/075", "PM-T031/277", "PM-BO101/247"
  ];

  const fg1 = "FG-LB015/109";
  const sfgTotal = 1500.0;
  const unitSize = 5.0;

  const bom_black_cherry = [
    { fg_code: fg1, rm_code: "RM-SS001/005", rm_name: "KAHLWAX 2039L CANDELILA WAX", recipe_qty: 81.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (81.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-CO007/054", rm_name: "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)", recipe_qty: 16.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (16.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-L004/011", rm_name: "Avocado Oil Cosmetic (23KG/TONG)", recipe_qty: 231.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (231.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-CO004/043", rm_name: "DK-PGT Paste R7 (Red) (5KG/PAIL)", recipe_qty: 16.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (16.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-CO002/027", rm_name: "DK-PGT Paste IOR (Coral) (5KG/PAIL)", recipe_qty: 7.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (7.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-SS004/020", rm_name: "Akogel (20KG/BAG)", recipe_qty: 68.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (68.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-L005/028", rm_name: "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)", recipe_qty: 68.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (68.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-SS003/012", rm_name: "Beeswax (25KG/DRUM)", recipe_qty: 271.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (271.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-L001/001", rm_name: "Palmester 3595 [MCT Oil] (190KG/Drum)", recipe_qty: 337.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (337.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-CO003/031", rm_name: "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", recipe_qty: 34.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (34.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-EO006/023", rm_name: "Green Mandarin Essential Oil (1KG/BTL)", recipe_qty: 24.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (24.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-L022/069", rm_name: "Jojoba Oil Golden (23KG/TONG)", recipe_qty: 231.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (231.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-L003/010", rm_name: "Vitamin E Acetate - Care (5KG/TONG)", recipe_qty: 14.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (14.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "RM-SS007/075", rm_name: "Shea Butter Refined TYP EPR (25KG/CTN)", recipe_qty: 102.0, uom: "GM", sfg_total_output: sfgTotal, unit_size: unitSize, usage_per_piece: (102.0 / sfgTotal) * unitSize },
    { fg_code: fg1, rm_code: "PM-T031/277", rm_name: "Tube - Lip Balm Paper (Black Cherry) 5g", recipe_qty: 1.0, uom: "PCS", sfg_total_output: 1.0, unit_size: unitSize, usage_per_piece: 1.0 },
    { fg_code: fg1, rm_code: "PM-BO101/247", rm_name: "Unitbox - Lip Balm Paper (Black Cherry) 5g", recipe_qty: 1.0, uom: "PCS", sfg_total_output: 1.0, unit_size: unitSize, usage_per_piece: 1.0 }
  ];

  return {
    products,
    product_order,
    materials,
    material_order,
    boms: { "FG-LB015/109": bom_black_cherry },
    ledger: [],
    batches: [],
    active_plan: {
      fg_code: "FG-LB015/109",
      mode: "BY_PIECES",
      target_pieces: 400.0,
      target_bulk_kg: 2.000,
      batch_ref: "BATCH-BC-400PCS",
      operator_name: "Operator Adam",
      yield_buffer_percent: 0.0
    },
    next_tx_id: 1001,
    recent_batch_summary: null
  };
}

// Global in-memory instance on Cloudflare Worker
let GLOBAL_STATE = getInitialState();

function calculatePlanRequirements(state, fgCode, targetPieces, bufferPercent = 0.0) {
  const bom = state.boms[fgCode] || [];
  const materials = state.materials;
  const mult = 1.0 + (bufferPercent / 100.0);

  let totalRmKg = 0.0;
  let totalPmPcs = 0.0;
  let shortageCount = 0;

  const rows = bom.map(item => {
    const mat = materials[item.rm_code];
    if (!mat) return null;
    let reqQty = 0.0;
    let reqUom = "KG";

    if (mat.category === "RAW_MATERIAL") {
      const reqGrams = item.usage_per_piece * targetPieces * mult;
      reqQty = reqGrams / 1000.0;
      totalRmKg += reqQty;
      reqUom = "KG";
    } else {
      reqQty = Math.ceil(item.usage_per_piece * targetPieces * mult);
      totalPmPcs += reqQty;
      reqUom = "PCS";
    }

    const balAfter = mat.stock_on_hand - reqQty;
    const isShort = (balAfter < 0.0);
    const deficit = isShort ? (reqQty - mat.stock_on_hand) : 0.0;
    if (isShort) shortageCount++;

    return {
      rm_code: item.rm_code,
      rm_name: mat.description,
      recipe_qty: item.recipe_qty,
      recipe_uom: item.uom,
      usage_per_piece: item.usage_per_piece,
      required_qty: reqQty,
      required_uom: reqUom,
      stock_on_hand: mat.stock_on_hand,
      balance_after: balAfter,
      is_shortage: isShort,
      deficit: deficit,
      category: mat.category,
      lead_time_days: mat.lead_time_days
    };
  }).filter(Boolean);

  return {
    rows,
    shortage_count: shortageCount,
    total_rm_kg: totalRmKg,
    total_pm_pcs: totalPmPcs,
    is_sufficient: (shortageCount === 0)
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

function getStateResponse() {
  const plan = GLOBAL_STATE.active_plan;
  const calc = calculatePlanRequirements(GLOBAL_STATE, plan.fg_code, plan.target_pieces, plan.yield_buffer_percent || 0.0);
  return {
    products: GLOBAL_STATE.products,
    product_order: GLOBAL_STATE.product_order,
    materials: GLOBAL_STATE.materials,
    material_order: GLOBAL_STATE.material_order,
    boms: GLOBAL_STATE.boms,
    ledger: GLOBAL_STATE.ledger,
    batches: GLOBAL_STATE.batches,
    active_plan: GLOBAL_STATE.active_plan,
    calculation: calc,
    recent_batch_summary: GLOBAL_STATE.recent_batch_summary,
    server_time: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method;

  // OPTIONS for CORS
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  // GET /api/state
  if (path === "/api/state" && method === "GET") {
    return jsonResponse(getStateResponse());
  }

  // POST /api/plan
  if (path === "/api/plan" && method === "POST") {
    try {
      const data = await context.request.json();
      const plan = GLOBAL_STATE.active_plan;

      if (data.fg_code && GLOBAL_STATE.products[data.fg_code]) {
        plan.fg_code = data.fg_code;
      }
      if (data.mode) {
        plan.mode = data.mode;
      }

      const unitWeight = GLOBAL_STATE.products[plan.fg_code]?.unit_weight_grams || 5.0;

      if (plan.mode === "BY_PIECES") {
        if (data.target_pieces && Number(data.target_pieces) > 0) {
          plan.target_pieces = Number(data.target_pieces);
          plan.target_bulk_kg = (plan.target_pieces * unitWeight) / 1000.0;
        }
      } else {
        if (data.target_bulk_kg && Number(data.target_bulk_kg) > 0) {
          plan.target_bulk_kg = Number(data.target_bulk_kg);
          plan.target_pieces = (plan.target_bulk_kg * 1000.0) / unitWeight;
        }
      }

      if (data.yield_buffer_percent !== undefined) {
        plan.yield_buffer_percent = Math.max(0.0, Number(data.yield_buffer_percent));
      }

      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  // POST /api/batch/issue
  if (path === "/api/batch/issue" && method === "POST") {
    try {
      const data = await context.request.json();
      const plan = GLOBAL_STATE.active_plan;
      const fg_code = plan.fg_code;
      const target_pieces = plan.target_pieces;
      const buffer_pct = plan.yield_buffer_percent || 0.0;

      const batch_ref = String(data.batch_ref || plan.batch_ref || "BATCH-01").trim().toUpperCase();
      const operator_name = String(data.operator_name || plan.operator_name || "Operator Adam").trim();

      const calc = calculatePlanRequirements(GLOBAL_STATE, fg_code, target_pieces, buffer_pct);
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Deduct inventory
      for (const row of calc.rows) {
        const code = row.rm_code;
        const mat = GLOBAL_STATE.materials[code];
        if (!mat) continue;

        const before = mat.stock_on_hand;
        mat.stock_on_hand -= row.required_qty;
        const after = mat.stock_on_hand;

        const tx = {
          transaction_id: GLOBAL_STATE.next_tx_id++,
          timestamp,
          material_code: mat.code,
          material_name: mat.description,
          type: "STOCK_OUT",
          category: "Production Batch Issue",
          quantity: row.required_qty,
          balance_before: before,
          balance_after: after,
          uom: mat.uom,
          reference_doc: batch_ref,
          operator_name: operator_name,
          notes: `Production Issue: ${Math.round(target_pieces)} pcs of ${fg_code}`
        };
        GLOBAL_STATE.ledger.unshift(tx);
      }

      // Record batch run
      GLOBAL_STATE.batches.unshift({
        batch_number: batch_ref,
        fg_code: fg_code,
        fg_name: GLOBAL_STATE.products[fg_code]?.name || fg_code,
        timestamp,
        operator_name: operator_name,
        target_pieces: target_pieces,
        bulk_kg: plan.target_bulk_kg,
        status: "COMPLETED",
        material_lines: calc.rows.length
      });

      // Increment finished good stock
      if (GLOBAL_STATE.products[fg_code]) {
        GLOBAL_STATE.products[fg_code].stock_on_hand = (GLOBAL_STATE.products[fg_code].stock_on_hand || 0) + target_pieces;
      }

      GLOBAL_STATE.recent_batch_summary = {
        batch_number: batch_ref,
        fg_code: fg_code,
        target_pieces: target_pieces,
        timestamp,
        material_lines_deducted: calc.rows.length,
        total_rm_kg_deducted: calc.total_rm_kg,
        total_pm_pcs_deducted: calc.total_pm_pcs
      };

      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  // POST /api/transaction
  if (path === "/api/transaction" && method === "POST") {
    try {
      const data = await context.request.json();
      const code = String(data.material_code || "").trim().toUpperCase();
      const mat = GLOBAL_STATE.materials[code];
      if (!mat) {
        return jsonResponse({ error: "Material code not found" }, 400);
      }

      const tx_type = String(data.type || "STOCK_IN").trim().toUpperCase();
      const qty = Number(data.quantity) || 0;
      if (qty <= 0) {
        return jsonResponse({ error: "Quantity must be greater than zero" }, 400);
      }

      const category = String(data.category || "Cycle Count Adjustment").trim();
      const ref_doc = String(data.reference_doc || "MANUAL").trim();
      const operator_name = String(data.operator_name || "Operator Adam").trim();
      const notes = String(data.notes || category).trim();
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const before = mat.stock_on_hand;
      if (tx_type === "STOCK_IN") {
        mat.stock_on_hand += qty;
      } else {
        mat.stock_on_hand -= qty;
      }
      const after = mat.stock_on_hand;

      GLOBAL_STATE.ledger.unshift({
        transaction_id: GLOBAL_STATE.next_tx_id++,
        timestamp,
        material_code: mat.code,
        material_name: mat.description,
        type: tx_type,
        category,
        quantity: qty,
        balance_before: before,
        balance_after: after,
        uom: mat.uom,
        reference_doc: ref_doc,
        operator_name,
        notes
      });

      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  // POST /api/reset
  if (path === "/api/reset" && method === "POST") {
    GLOBAL_STATE = getInitialState();
    return jsonResponse(getStateResponse());
  }

  // GET /api/export/ledger.csv
  if (path === "/api/export/ledger.csv" && method === "GET") {
    let csv = "Tx ID,Timestamp,Material Code,Material Name,Type,Category,Quantity,UOM,Balance Before,Balance After,Reference Doc,Operator,Notes\n";
    for (const tx of GLOBAL_STATE.ledger) {
      csv += `${tx.transaction_id},"${tx.timestamp}","${tx.material_code}","${tx.material_name}",${tx.type},"${tx.category}",${tx.quantity},${tx.uom},${tx.balance_before},${tx.balance_after},"${tx.reference_doc}","${tx.operator_name}","${tx.notes}"\n`;
    }
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="stock_card_ledger.csv"'
      }
    });
  }

  // GET /api/export/inventory.csv
  if (path === "/api/export/inventory.csv" && method === "GET") {
    let csv = "Material Code,Description,Status,Category,Stock On Hand,UOM,Lead Time (Days),Avg Monthly Usage,Stock Cover (Months),Stock Cover (Days),Health Status\n";
    for (const code of GLOBAL_STATE.material_order) {
      const m = GLOBAL_STATE.materials[code];
      const amu = m.avg_monthly_usage || 1.0;
      const scm = m.stock_on_hand / amu;
      const days = scm * 30.0;
      let status = "HEALTHY";
      if (days <= m.lead_time_days) status = "REORDER NOW";
      else if (days <= m.lead_time_days + 21) status = "LOW STOCK";
      else if (scm > 6.0) status = "OVERSTOCKED";

      const cat_str = m.category === "RAW_MATERIAL" ? "Raw Material" : "Packaging";
      csv += `"${m.code}","${m.description}",${m.status},${cat_str},${m.stock_on_hand},${m.uom},${m.lead_time_days},${amu},${scm.toFixed(1)},${Math.round(days)},${status}\n`;
    }
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inventory_health_report.csv"'
      }
    });
  }

  return new Response("Not Found", { status: 404 });
}
