/**
 * Cloudflare Pages Functions Serverless API
 * HYGR Material Requirement Calculator & Stock Card System
 * 
 * Provides full serverless backend endpoints for Cloudflare Pages:
 * - GET  /api/state
 * - POST /api/plan/batch/add
 * - POST /api/plan/batch/update
 * - POST /api/plan/batch/delete
 * - POST /api/batch/execute
 * - POST /api/batch/cancel
 * - POST /api/role
 * - POST /api/transaction
 * - POST /api/reset
 * - GET  /api/export/ledger.csv
 * - GET  /api/export/inventory.csv
 */

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getInitialState() {
  const products = {
    "FG-LB015/109": {
      fg_code: "FG-LB015/109",
      name: "Lip Balm Paper (Black Cherry) 5g",
      category: "Lip Care",
      unit_weight_grams: 5.0,
      sfg_batch_weight_grams: 1500.0,
      stock_on_hand: 340.0,
      description: "Standard 5g lip balm paper packaging with Black Cherry tint."
    },
    "FG-LB008/040": {
      fg_code: "FG-LB008/040",
      name: "Lip Balm Coral Red (Refill) 4g",
      category: "Lip Care",
      unit_weight_grams: 4.0,
      sfg_batch_weight_grams: 1500.0,
      stock_on_hand: 120.0,
      description: "Natural tinted lip balm refill 4g with Coral Red tint."
    },
    "FG-LB005/037": {
      fg_code: "FG-LB005/037",
      name: "Lip Balm Raw Paper 5g",
      category: "Lip Care",
      unit_weight_grams: 5.0,
      sfg_batch_weight_grams: 1500.0,
      stock_on_hand: 450.0,
      description: "Raw unflavored nourishing lip balm 5g paper tube."
    },
    "FG-LB037/281": {
      fg_code: "FG-LB037/281",
      name: "Lip Balm Sandstone / Sunkissed Paper 5g",
      category: "Lip Care",
      unit_weight_grams: 5.0,
      sfg_batch_weight_grams: 1500.0,
      stock_on_hand: 210.0,
      description: "Sunkissed warm pigment tint 5g lip balm."
    },
    "FG-LB038/282": {
      fg_code: "FG-LB038/282",
      name: "Lip Balm Rose Quartz / Pink Rose (Refill) 4g",
      category: "Lip Care",
      unit_weight_grams: 4.0,
      sfg_batch_weight_grams: 1500.0,
      stock_on_hand: 90.0,
      description: "Natural Pink Rose tint 4g refill balm."
    },
    "FG-D017/017": {
      fg_code: "FG-D017/017",
      name: "Deodorant Zen 40g",
      category: "Deodorant",
      unit_weight_grams: 40.0,
      sfg_batch_weight_grams: 51000.0,
      stock_on_hand: 480.0,
      description: "Natural deodorant stick with Bergamot, Citrus Verbena, and Patchouli."
    },
    "FG-D001/001": {
      fg_code: "FG-D001/001",
      name: "Deodorant Citrus 25g",
      category: "Deodorant",
      unit_weight_grams: 25.0,
      sfg_batch_weight_grams: 34000.0,
      stock_on_hand: 310.0,
      description: "Zesty citrus essential oil blend in compact 25g stick."
    },
    "FG-D026/073": {
      fg_code: "FG-D026/073",
      name: "Deodorant Creme Cloud 40g",
      category: "Deodorant",
      unit_weight_grams: 40.0,
      sfg_batch_weight_grams: 51000.0,
      stock_on_hand: 520.0,
      description: "Gentle gourmand vanilla and coconut deodorant formulation."
    },
    "FG-D003/003": {
      fg_code: "FG-D003/003",
      name: "Deodorant Rose Geranium 25g",
      category: "Deodorant",
      unit_weight_grams: 25.0,
      sfg_batch_weight_grams: 34000.0,
      stock_on_hand: 200.0,
      description: "Floral rose geranium natural deodorant."
    },
    "FG-D004/004": {
      fg_code: "FG-D004/004",
      name: "Deodorant Lavender 25g",
      category: "Deodorant",
      unit_weight_grams: 25.0,
      sfg_batch_weight_grams: 34000.0,
      stock_on_hand: 180.0,
      description: "Calming French lavender and rose natural deodorant 25g."
    },
    "FG-D006/006": {
      fg_code: "FG-D006/006",
      name: "Deodorant Woody 40g",
      category: "Deodorant",
      unit_weight_grams: 40.0,
      sfg_batch_weight_grams: 51000.0,
      stock_on_hand: 150.0,
      description: "Crisp Siberian fir needle woody deodorant stick."
    },
    "FG-HO001/056": {
      fg_code: "FG-HO001/056",
      name: "Natural Hair Oil 30ml",
      category: "Hair Care",
      unit_weight_grams: 30.0,
      sfg_batch_weight_grams: 40000.0,
      stock_on_hand: 410.0,
      description: "Argan, Jojoba, and Rosemary stimulating hair nourishment oil."
    },
    "FG-SB001/050": {
      fg_code: "FG-SB001/050",
      name: "Lip Scrub 15g",
      category: "Lip Care",
      unit_weight_grams: 15.0,
      sfg_batch_weight_grams: 10000.0,
      stock_on_hand: 260.0,
      description: "Exfoliating cellulose and avocado oil gentle lip polish."
    }
  };

  const materials = {
    "RM-L001/001": { code: "RM-L001/001", description: "Palmester 3595 [MCT Oil] (190KG/DRUM)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 25.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 60.0, pack_size: 190.0, current_lot_no: "1M01825L" },
    "RM-L021/068": { code: "RM-L021/068", description: "MCT Oil (190KG/DRUM)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 534.86, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 60.0, pack_size: 190.0, current_lot_no: "LDME116M6" },
    "RM-SS001/005": { code: "RM-SS001/005", description: "KAHLWAX 2039L CANDELILA WAX", status: "ACTIVE", lead_time_days: 134, stock_on_hand: 188.2, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 30.0, pack_size: 20.0, current_lot_no: "F2438027-001" },
    "RM-SS008/081": { code: "RM-SS008/081", description: "SP-75 Candelila Wax (20kg bag)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 40.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 15.0, pack_size: 20.0, current_lot_no: "" },
    "RM-SS003/012": { code: "RM-SS003/012", description: "Beeswax (25KG/DRUM)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 115.1, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 35.0, pack_size: 25.0, current_lot_no: "LOT 2409" },
    "RM-SS007/075": { code: "RM-SS007/075", description: "Shea Butter Refined TYP EPR (25KG/CTN)", status: "ACTIVE", lead_time_days: 120, stock_on_hand: 175.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 50.0, pack_size: 25.0, current_lot_no: "LOTQ10009750" },
    "RM-SS002/007": { code: "RM-SS002/007", description: "Shea Butter Refined (25KG/CTN)", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 262.88, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 30.0, pack_size: 25.0, current_lot_no: "LOT 35257/117988" },
    "RM-L004/011": { code: "RM-L004/011", description: "Avocado Oil Cosmetic (23KG/TONG)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 23.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 20.0, pack_size: 23.0, current_lot_no: "" },
    "RM-L022/069": { code: "RM-L022/069", description: "Jojoba Oil Golden (23KG/TONG)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 35.55, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 25.0, pack_size: 20.0, current_lot_no: "LS-250404" },
    "RM-SS004/020": { code: "RM-SS004/020", description: "Akogel (20KG/BAG)", status: "ACTIVE", lead_time_days: 74, stock_on_hand: 33.68, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 10.0, pack_size: 20.0, current_lot_no: "" },
    "RM-L005/028": { code: "RM-L005/028", description: "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 10.237, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 5.0, pack_size: 5.0, current_lot_no: "" },
    "RM-L003/010": { code: "RM-L003/010", description: "Vitamin E Acetate - Care (5KG/TONG)", status: "ACTIVE", lead_time_days: 74, stock_on_hand: 153.18, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 12.0, pack_size: 5.0, current_lot_no: "" },
    "RM-S001/003": { code: "RM-S001/003", description: "Magnesium Hydroxide (25kg/Bag)", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 470.8, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 25.0, pack_size: 25.0, current_lot_no: "" },
    "RM-S002/004": { code: "RM-S002/004", description: "FARMAL 21T (25KG/BAG)", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 149.6, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 20.0, pack_size: 25.0, current_lot_no: "FPB2022" },
    "RM-S003/006": { code: "RM-S003/006", description: "Farmal AF1100 (20KG/CTN)", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 373.42, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 15.0, pack_size: 22.68, current_lot_no: "1952982" },
    "RM-S004/009": { code: "RM-S004/009", description: "Colloidal Oatmeal (5KG/PAIL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 0.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 5.0, pack_size: 5.0, current_lot_no: "" },
    "RM-S014/076": { code: "RM-S014/076", description: "Oat Com USP (20KG/BAG)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 202.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 10.0, pack_size: 20.0, current_lot_no: "" },
    "RM-S005/014": { code: "RM-S005/014", description: "Tegodeo PY 88 G (25KG/BAG)", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 69.6, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 15.0, pack_size: 25.0, current_lot_no: "" },
    "RM-EO001/002": { code: "RM-EO001/002", description: "Bergamot Essential Oil (1KG/BTL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 74.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 8.0, pack_size: 1.0, current_lot_no: "FF91735BSE" },
    "RM-EO014/077": { code: "RM-EO014/077", description: "Bergamot Oil (Furocoumarin Free) (5KG/BTL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 380.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 8.0, pack_size: 5.0, current_lot_no: "102401386" },
    "RM-EO002/013": { code: "RM-EO002/013", description: "PATCHOULI ESSENTIAL OIL", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 37.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 2.0, pack_size: 25.0, current_lot_no: "" },
    "RM-EO003/015": { code: "RM-EO003/015", description: "Tea Tree Oil BP (20KG/TONG)", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 118.1, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 5.0, pack_size: 20.0, current_lot_no: "" },
    "RM-EO004/016": { code: "RM-EO004/016", description: "FNLEMVERB 125 CITRUS VERBENA 39125", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 142.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 4.0, pack_size: 25.0, current_lot_no: "" },
    "RM-EO006/023": { code: "RM-EO006/023", description: "Green Mandarin Essential Oil (5KG/BTL)", status: "ACTIVE", lead_time_days: 56, stock_on_hand: 6.66, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 2.5, pack_size: 5.0, current_lot_no: "" },
    "RM-EO007/024": { code: "RM-EO007/024", description: "Lavender Essential oil (25KG/TONG)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 55.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 5.0, pack_size: 25.0, current_lot_no: "" },
    "RM-EO016/079": { code: "RM-EO016/079", description: "Rose Geranium Essential Oil (25KG/TONG)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 178.6, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 5.0, pack_size: 25.0, current_lot_no: "" },
    "RM-EO009/026": { code: "RM-EO009/026", description: "Fir Needle Essential Oil", status: "ACTIVE", lead_time_days: 60, stock_on_hand: 15.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 2.5, pack_size: 5.0, current_lot_no: "" },
    "RM-FO002/062": { code: "RM-FO002/062", description: "Shea Coconut Fragrance NQ6189", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 24.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 3.0, pack_size: 5.0, current_lot_no: "" },
    "RM-FO003/063": { code: "RM-FO003/063", description: "Sweet Vanilla Fragrance K9083", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 18.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 2.0, pack_size: 5.0, current_lot_no: "" },
    "RM-FO004/064": { code: "RM-FO004/064", description: "Sweet Caramel Fragrance 152387", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 12.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 1.5, pack_size: 5.0, current_lot_no: "" },
    "RM-CO001/022": { code: "RM-CO001/022", description: "DK-PGT Paste Ti (White) (5KG/PAIL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 12.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 4.0, pack_size: 5.0, current_lot_no: "" },
    "RM-CO002/027": { code: "RM-CO002/027", description: "DK-PGT Paste IOR (Coral) (5KG/PAIL)", status: "ACTIVE", lead_time_days: 104, stock_on_hand: 75.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 15.0, pack_size: 5.0, current_lot_no: "" },
    "RM-CO003/031": { code: "RM-CO003/031", description: "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 34.11, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 4.0, pack_size: 5.0, current_lot_no: "" },
    "RM-CO004/043": { code: "RM-CO004/043", description: "DK-PGT Paste R7 (Red) (5KG/PAIL)", status: "ACTIVE", lead_time_days: 194, stock_on_hand: 7.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 1.8, pack_size: 5.0, current_lot_no: "" },
    "RM-CO005/046": { code: "RM-CO005/046", description: "DK-PGT Paste R28L (Pink) (1KG/PAIL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 3.5, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 2.0, pack_size: 1.0, current_lot_no: "" },
    "RM-CO006/050": { code: "RM-CO006/050", description: "DK-PGT Paste B1L (Blue) (5KG/PAIL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 4.2, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 1.0, pack_size: 5.0, current_lot_no: "" },
    "RM-CO007/054": { code: "RM-CO007/054", description: "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)", status: "ACTIVE", lead_time_days: 104, stock_on_hand: 4.35, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 1.5, pack_size: 5.0, current_lot_no: "" },
    "RM-L008/035": { code: "RM-L008/035", description: "Argan Oil Cosmetic (23KG/TONG)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 46.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 15.0, pack_size: 23.0, current_lot_no: "" },
    "RM-L025/072": { code: "RM-L025/072", description: "Grapeseed Oil Cosmetic (25KG/TONG)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 45.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 15.0, pack_size: 20.0, current_lot_no: "" },
    "RM-L026/073": { code: "RM-L026/073", description: "Castor Oil Cosmetic (25KG/TONG)", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 60.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 20.0, pack_size: 25.0, current_lot_no: "" },
    "RM-EO017/080": { code: "RM-EO017/080", description: "Rosemary Essential Oil (5KG/BTL)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 12.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 4.0, pack_size: 5.0, current_lot_no: "" },
    "RM-SS005/019": { code: "RM-SS005/019", description: "Emulsifying Wax NF (25KG/BAG)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 35.0, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 10.0, pack_size: 25.0, current_lot_no: "" },
    "RM-S006/018": { code: "RM-S006/018", description: "Celluloscrub 300 (20KG/BAG)", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 17.88, uom: "KG", category: "RAW_MATERIAL", avg_monthly_usage: 8.0, pack_size: 20.0, current_lot_no: "" },
    "PM-T031/277": { code: "PM-T031/277", description: "Tube - Lip Balm Paper 5g", status: "ACTIVE", lead_time_days: 65, stock_on_hand: 21721.0, uom: "PCS", category: "PACKAGING_PRIMARY", avg_monthly_usage: 5000.0, pack_size: 1000.0, current_lot_no: "" },
    "PM-BO101/247": { code: "PM-BO101/247", description: "Unitbox - Lip Balm Paper 5g", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 9826.0, uom: "PCS", category: "PACKAGING_SECONDARY", avg_monthly_usage: 5000.0, pack_size: 1000.0, current_lot_no: "" },
    "PM-R004/104": { code: "PM-R004/104", description: "Refill Mechanism - Lip Balm 4g", status: "ACTIVE", lead_time_days: 45, stock_on_hand: 14500.0, uom: "PCS", category: "PACKAGING_PRIMARY", avg_monthly_usage: 3000.0, pack_size: 1000.0, current_lot_no: "" },
    "PM-D025/101": { code: "PM-D025/101", description: "Deodorant Paper Stick 25g", status: "ACTIVE", lead_time_days: 50, stock_on_hand: 8500.0, uom: "PCS", category: "PACKAGING_PRIMARY", avg_monthly_usage: 2500.0, pack_size: 500.0, current_lot_no: "" },
    "PM-D040/102": { code: "PM-D040/102", description: "Deodorant Paper Stick 40g", status: "ACTIVE", lead_time_days: 50, stock_on_hand: 6200.0, uom: "PCS", category: "PACKAGING_PRIMARY", avg_monthly_usage: 2500.0, pack_size: 500.0, current_lot_no: "" },
    "PM-HO030/103": { code: "PM-HO030/103", description: "Glass Dropper Bottle 30ml", status: "ACTIVE", lead_time_days: 40, stock_on_hand: 3400.0, uom: "PCS", category: "PACKAGING_PRIMARY", avg_monthly_usage: 1000.0, pack_size: 500.0, current_lot_no: "" },
    "PM-SB015/105": { code: "PM-SB015/105", description: "Aluminium Jar 15g", status: "ACTIVE", lead_time_days: 30, stock_on_hand: 4100.0, uom: "PCS", category: "PACKAGING_PRIMARY", avg_monthly_usage: 1000.0, pack_size: 1000.0, current_lot_no: "" }
  };

  const lip_base = [
    { rm_code: "RM-L001/001", rm_name: "Palmester 3595 [MCT Oil] (190KG/DRUM)", g_per_kg: 280.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-SS003/012", rm_name: "Beeswax (25KG/DRUM)", g_per_kg: 200.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-L004/011", rm_name: "Avocado Oil Cosmetic (23KG/TONG)", g_per_kg: 170.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-L022/069", rm_name: "Jojoba Oil Golden (23KG/TONG)", g_per_kg: 170.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-SS007/075", rm_name: "Shea Butter Refined TYP EPR (25KG/CTN)", g_per_kg: 75.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-SS001/005", rm_name: "KAHLWAX 2039L CANDELILA WAX", g_per_kg: 60.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-SS004/020", rm_name: "Akogel (20KG/BAG)", g_per_kg: 50.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-L005/028", rm_name: "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)", g_per_kg: 18.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-EO006/023", rm_name: "Green Mandarin Essential Oil (5KG/BTL)", g_per_kg: 18.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-L003/010", rm_name: "Vitamin E Acetate - Care (5KG/TONG)", g_per_kg: 10.0, category: "RAW_MATERIAL" }
  ];

  const deo_base = [
    { rm_code: "RM-L001/001", rm_name: "Palmester 3595 [MCT Oil] (190KG/DRUM)", g_per_kg: 395.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-SS001/005", rm_name: "KAHLWAX 2039L CANDELILA WAX", g_per_kg: 160.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-S001/003", rm_name: "Magnesium Hydroxide (25kg/Bag)", g_per_kg: 130.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-S002/004", rm_name: "FARMAL 21T (25KG/BAG)", g_per_kg: 105.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-S003/006", rm_name: "Farmal AF1100 (20KG/CTN)", g_per_kg: 75.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-SS007/075", rm_name: "Shea Butter Refined TYP EPR (25KG/CTN)", g_per_kg: 65.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-L003/010", rm_name: "Vitamin E Acetate - Care (5KG/TONG)", g_per_kg: 25.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-S004/009", rm_name: "Colloidal Oatmeal (5KG/PAIL)", g_per_kg: 22.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-S005/014", rm_name: "Tegodeo PY 88 G (25KG/BAG)", g_per_kg: 15.0, category: "RAW_MATERIAL" },
    { rm_code: "RM-EO003/015", rm_name: "Tea Tree Oil BP (20KG/TONG)", g_per_kg: 15.0, category: "RAW_MATERIAL" }
  ];

  const boms = {
    "FG-LB015/109": lip_base.concat([
      { rm_code: "RM-CO007/054", rm_name: "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)", g_per_kg: 10.67, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO004/043", rm_name: "DK-PGT Paste R7 (Red) (5KG/PAIL)", g_per_kg: 10.67, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO002/027", rm_name: "DK-PGT Paste IOR (Coral) (5KG/PAIL)", g_per_kg: 4.67, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO003/031", rm_name: "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", g_per_kg: 22.67, category: "RAW_MATERIAL" },
      { rm_code: "PM-T031/277", rm_name: "Tube - Lip Balm Paper 5g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" },
      { rm_code: "PM-BO101/247", rm_name: "Unitbox - Lip Balm Paper 5g", g_per_kg: 1.0, category: "PACKAGING_SECONDARY" }
    ]),
    "FG-LB008/040": lip_base.concat([
      { rm_code: "RM-CO002/027", rm_name: "DK-PGT Paste IOR (Coral) (5KG/PAIL)", g_per_kg: 30.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO003/031", rm_name: "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", g_per_kg: 15.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO001/022", rm_name: "DK-PGT Paste Ti (White) (5KG/PAIL)", g_per_kg: 3.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-R004/104", rm_name: "Refill Mechanism - Lip Balm 4g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-LB005/037": lip_base.concat([
      { rm_code: "RM-CO002/027", rm_name: "DK-PGT Paste IOR (Coral) (5KG/PAIL)", g_per_kg: 37.5, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO001/022", rm_name: "DK-PGT Paste Ti (White) (5KG/PAIL)", g_per_kg: 60.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO004/043", rm_name: "DK-PGT Paste R7 (Red) (5KG/PAIL)", g_per_kg: 6.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO005/046", rm_name: "DK-PGT Paste R28L (Pink) (1KG/PAIL)", g_per_kg: 10.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO006/050", rm_name: "DK-PGT Paste B1L (Blue) (5KG/PAIL)", g_per_kg: 4.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-T031/277", rm_name: "Tube - Lip Balm Paper 5g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-LB037/281": lip_base.concat([
      { rm_code: "RM-CO002/027", rm_name: "DK-PGT Paste IOR (Coral) (5KG/PAIL)", g_per_kg: 18.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO003/031", rm_name: "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", g_per_kg: 24.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO001/022", rm_name: "DK-PGT Paste Ti (White) (5KG/PAIL)", g_per_kg: 30.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO005/046", rm_name: "DK-PGT Paste R28L (Pink) (1KG/PAIL)", g_per_kg: 6.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO006/050", rm_name: "DK-PGT Paste B1L (Blue) (5KG/PAIL)", g_per_kg: 1.8, category: "RAW_MATERIAL" },
      { rm_code: "PM-T031/277", rm_name: "Tube - Lip Balm Paper 5g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-LB038/282": lip_base.concat([
      { rm_code: "RM-CO005/046", rm_name: "DK-PGT Paste R28L (Pink) (1KG/PAIL)", g_per_kg: 15.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-CO001/022", rm_name: "DK-PGT Paste Ti (White) (5KG/PAIL)", g_per_kg: 12.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-R004/104", rm_name: "Refill Mechanism - Lip Balm 4g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-D017/017": deo_base.concat([
      { rm_code: "RM-EO001/002", rm_name: "Bergamot Essential Oil (1KG/BTL)", g_per_kg: 40.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-EO004/016", rm_name: "FNLEMVERB 125 CITRUS VERBENA 39125", g_per_kg: 29.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-EO002/013", rm_name: "PATCHOULI ESSENTIAL OIL", g_per_kg: 9.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-D040/102", rm_name: "Deodorant Paper Stick 40g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-D001/001": deo_base.concat([
      { rm_code: "RM-EO001/002", rm_name: "Bergamot Essential Oil (1KG/BTL)", g_per_kg: 90.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-EO007/024", rm_name: "Lavender Essential oil (25KG/TONG)", g_per_kg: 10.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-D025/101", rm_name: "Deodorant Paper Stick 25g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-D026/073": deo_base.concat([
      { rm_code: "RM-FO002/062", rm_name: "Shea Coconut Fragrance NQ6189", g_per_kg: 40.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-FO003/063", rm_name: "Sweet Vanilla Fragrance K9083", g_per_kg: 20.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-FO004/064", rm_name: "Sweet Caramel Fragrance 152387", g_per_kg: 8.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-D040/102", rm_name: "Deodorant Paper Stick 40g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-D003/003": deo_base.concat([
      { rm_code: "RM-EO016/079", rm_name: "Rose Geranium Essential Oil (25KG/TONG)", g_per_kg: 60.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-D025/101", rm_name: "Deodorant Paper Stick 25g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-D004/004": deo_base.concat([
      { rm_code: "RM-EO007/024", rm_name: "Lavender Essential oil (25KG/TONG)", g_per_kg: 50.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-D025/101", rm_name: "Deodorant Paper Stick 25g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-D006/006": deo_base.concat([
      { rm_code: "RM-EO009/026", rm_name: "Fir Needle Essential Oil", g_per_kg: 30.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-D040/102", rm_name: "Deodorant Paper Stick 40g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]),
    "FG-HO001/056": [
      { rm_code: "RM-L008/035", rm_name: "Argan Oil Cosmetic (23KG/TONG)", g_per_kg: 220.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L022/069", rm_name: "Jojoba Oil Golden (23KG/TONG)", g_per_kg: 200.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L001/001", rm_name: "Palmester 3595 [MCT Oil] (190KG/DRUM)", g_per_kg: 200.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L025/072", rm_name: "Grapeseed Oil Cosmetic (25KG/TONG)", g_per_kg: 150.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L026/073", rm_name: "Castor Oil Cosmetic (25KG/TONG)", g_per_kg: 150.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-EO017/080", rm_name: "Rosemary Essential Oil (5KG/BTL)", g_per_kg: 45.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-EO003/015", rm_name: "Tea Tree Oil BP (20KG/TONG)", g_per_kg: 10.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L003/010", rm_name: "Vitamin E Acetate - Care (5KG/TONG)", g_per_kg: 10.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-HO030/103", rm_name: "Glass Dropper Bottle 30ml", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ],
    "FG-SB001/050": [
      { rm_code: "RM-SS005/019", rm_name: "Emulsifying Wax NF (25KG/BAG)", g_per_kg: 200.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L004/011", rm_name: "Avocado Oil Cosmetic (23KG/TONG)", g_per_kg: 280.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L025/072", rm_name: "Grapeseed Oil Cosmetic (25KG/TONG)", g_per_kg: 170.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L003/010", rm_name: "Vitamin E Acetate - Care (5KG/TONG)", g_per_kg: 170.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-SS007/075", rm_name: "Shea Butter Refined TYP EPR (25KG/CTN)", g_per_kg: 75.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-L022/069", rm_name: "Jojoba Oil Golden (23KG/TONG)", g_per_kg: 50.0, category: "RAW_MATERIAL" },
      { rm_code: "RM-S006/018", rm_name: "Celluloscrub 300 (20KG/BAG)", g_per_kg: 18.0, category: "RAW_MATERIAL" },
      { rm_code: "PM-SB015/105", rm_name: "Aluminium Jar 15g", g_per_kg: 1.0, category: "PACKAGING_PRIMARY" }
    ]
  };

  const substitutes = {
    "RM-L001/001": ["RM-L021/068"],
    "RM-L021/068": ["RM-L001/001"],
    "RM-SS001/005": ["RM-SS008/081"],
    "RM-SS008/081": ["RM-SS001/005"],
    "RM-SS007/075": ["RM-SS002/007"],
    "RM-SS002/007": ["RM-SS007/075"],
    "RM-S004/009": ["RM-S014/076"],
    "RM-S014/076": ["RM-S004/009"],
    "RM-EO001/002": ["RM-EO014/077"],
    "RM-EO014/077": ["RM-EO001/002"]
  };

  const weekly_plan = [
    { id: "batch-1", day: "Monday", fg_code: "FG-HO001/056", unit_type: "BULK_KG", target_qty: 40.0, target_bulk_kg: 40.0, target_pieces: 1333, yield_buffer_percent: 0.0, batch_ref: "H26001-06", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-2", day: "Monday", fg_code: "FG-LB038/282", unit_type: "POTS", target_qty: 3.0, target_bulk_kg: 4.5, target_pieces: 1125, yield_buffer_percent: 0.0, batch_ref: "H26002-27", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-3", day: "Tuesday", fg_code: "FG-D017/017", unit_type: "BULK_KG", target_qty: 51.0, target_bulk_kg: 51.0, target_pieces: 1275, yield_buffer_percent: 0.0, batch_ref: "H26001-19", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-4", day: "Tuesday", fg_code: "FG-D026/073", unit_type: "BULK_KG", target_qty: 51.0, target_bulk_kg: 51.0, target_pieces: 1275, yield_buffer_percent: 0.0, batch_ref: "H26001-27", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-5", day: "Tuesday", fg_code: "FG-LB008/040", unit_type: "BULK_KG", target_qty: 6.3, target_bulk_kg: 6.3, target_pieces: 1575, yield_buffer_percent: 0.0, batch_ref: "G26002-07", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-6", day: "Wednesday", fg_code: "FG-D001/001", unit_type: "BULK_KG", target_qty: 51.0, target_bulk_kg: 51.0, target_pieces: 2040, yield_buffer_percent: 0.0, batch_ref: "H26001-24", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-7", day: "Wednesday", fg_code: "FG-LB037/281", unit_type: "POTS", target_qty: 3.0, target_bulk_kg: 4.5, target_pieces: 900, yield_buffer_percent: 0.0, batch_ref: "G26008-20", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-8", day: "Thursday", fg_code: "FG-D003/003", unit_type: "BULK_KG", target_qty: 34.0, target_bulk_kg: 34.0, target_pieces: 1360, yield_buffer_percent: 0.0, batch_ref: "H26001-10", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-9", day: "Thursday", fg_code: "FG-LB005/037", unit_type: "BULK_KG", target_qty: 6.0, target_bulk_kg: 6.0, target_pieces: 1200, yield_buffer_percent: 0.0, batch_ref: "H26001-07", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-10", day: "Friday", fg_code: "FG-LB015/109", unit_type: "BULK_KG", target_qty: 6.0, target_bulk_kg: 6.0, target_pieces: 1200, yield_buffer_percent: 0.0, batch_ref: "H26001-15", status: "PLANNED", operator_name: "Operator Adam" },
    { id: "batch-11", day: "Friday", fg_code: "FG-D004/004", unit_type: "BULK_KG", target_qty: 34.0, target_bulk_kg: 34.0, target_pieces: 1360, yield_buffer_percent: 0.0, batch_ref: "H26001-18", status: "PLANNED", operator_name: "Operator Adam" }
  ];

  return {
    products,
    product_order: Object.keys(products),
    materials,
    material_order: Object.keys(materials),
    substitutes,
    boms,
    weekly_plan,
    user_role: "admin",
    ledger: [],
    batches: [],
    next_tx_id: 1001,
    next_batch_id: weekly_plan.length + 1,
    recent_batch_summary: null
  };
}

let GLOBAL_STATE = getInitialState();

function calculateWeeklySimulation(state) {
  const weekly_plan = state.weekly_plan;
  const materials = state.materials;
  const boms = state.boms;
  const products = state.products;

  const day_demands = {};
  const day_kpis = {};
  for (const d of DAYS_OF_WEEK) {
    day_demands[d] = {};
    day_kpis[d] = { bulk_kg: 0.0, pieces: 0, batch_count: 0, shortage_count: 0 };
  }

  const mat_breakdown = {};
  const total_committed = {};

  for (const b of weekly_plan) {
    const day = b.day || "Monday";
    const fg = b.fg_code;
    const status = b.status || "PLANNED";
    const bulk_kg = Number(b.target_bulk_kg || 0.0);
    const target_pieces = Number(b.target_pieces || 0.0);
    const buffer_pct = Number(b.yield_buffer_percent || 0.0);
    const multiplier = 1.0 + (buffer_pct / 100.0);

    const prod = products[fg] || { name: fg, unit_weight_grams: 5.0 };

    if (day_kpis[day]) {
      day_kpis[day].batch_count += 1;
      day_kpis[day].bulk_kg += bulk_kg;
      day_kpis[day].pieces += Math.round(target_pieces);
    }

    if (status === "COMPLETED") continue;

    const recipe = boms[fg] || [];
    for (const item of recipe) {
      const code = item.rm_code;
      const mat = materials[code];
      const is_pm = String(code).startsWith("PM") || (mat && mat.category !== "RAW_MATERIAL");

      let req_qty = 0.0;
      let uom = "KG";
      if (is_pm) {
        req_qty = Math.ceil(item.g_per_kg * target_pieces * multiplier);
        uom = "PCS";
      } else {
        req_qty = (item.g_per_kg / 1000.0) * bulk_kg * multiplier;
        uom = "KG";
      }

      if (day_demands[day]) {
        day_demands[day][code] = (day_demands[day][code] || 0.0) + req_qty;
      }
      total_committed[code] = (total_committed[code] || 0.0) + req_qty;

      if (!mat_breakdown[code]) mat_breakdown[code] = [];
      mat_breakdown[code].push({
        batch_id: b.id,
        batch_ref: b.batch_ref || "BATCH",
        day,
        fg_code: fg,
        fg_name: prod.name || fg,
        batch_size_str: `${bulk_kg.toFixed(2)} KG (${Math.round(target_pieces)} pcs)`,
        qty_required: req_qty,
        uom
      });
    }
  }

  const material_rows = [];
  let shortage_count_total = 0;

  for (const code of state.material_order) {
    const mat = materials[code];
    if (!mat) continue;

    let running_balance = mat.stock_on_hand;
    const daily_balances = {};
    let first_deficit_day = null;

    for (const d of DAYS_OF_WEEK) {
      const use = day_demands[d][code] || 0.0;
      running_balance -= use;
      daily_balances[d] = running_balance;
      if (running_balance < 0 && first_deficit_day === null && use > 0) {
        first_deficit_day = d;
        day_kpis[d].shortage_count += 1;
      }
    }

    const total_req = total_committed[code] || 0.0;
    const proj_balance = mat.stock_on_hand - total_req;
    const is_short = (proj_balance < 0.0);
    const deficit = is_short ? Math.abs(proj_balance) : 0.0;

    if (is_short) shortage_count_total += 1;

    material_rows.push({
      code,
      description: mat.description,
      category: mat.category,
      uom: mat.uom,
      stock_on_hand: mat.stock_on_hand,
      total_committed: total_req,
      projected_balance: proj_balance,
      is_shortage: is_short,
      deficit,
      pack_size: mat.pack_size || (mat.uom === "KG" ? 25.0 : 1000.0),
      current_lot_no: mat.current_lot_no || "",
      first_deficit_day,
      daily_balances,
      lead_time_days: mat.lead_time_days,
      breakdown: mat_breakdown[code] || []
    });
  }

  material_rows.sort((a, b) => {
    if (a.is_shortage !== b.is_shortage) return a.is_shortage ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  return {
    material_rows,
    shortage_count_total,
    day_kpis,
    active_batches_count: weekly_plan.filter(b => b.status !== "COMPLETED").length,
    completed_batches_count: weekly_plan.filter(b => b.status === "COMPLETED").length
  };
}

function calculateReorderDraft(state) {
  const sim = calculateWeeklySimulation(state);
  const materials = state.materials;
  const reorder_items = [];
  let total_packs = 0;
  let urgent_count = 0;

  for (const row of sim.material_rows) {
    if (!row.is_shortage) continue;

    const code = row.code;
    const mat = materials[code] || {};
    const uom = row.uom;
    const deficit = row.deficit;
    let pack_size = Number(mat.pack_size || (uom === "KG" ? 25.0 : 1000.0));
    if (pack_size <= 0) pack_size = 1.0;

    const packs_to_order = Math.ceil(deficit / pack_size);
    const suggested_qty = packs_to_order * pack_size;
    const lead_time = Number(row.lead_time_days || 30);
    const is_critical = lead_time >= 30;
    if (is_critical) urgent_count += 1;

    total_packs += packs_to_order;

    reorder_items.push({
      code,
      description: row.description,
      category: row.category,
      uom,
      stock_on_hand: row.stock_on_hand,
      total_committed: row.total_committed,
      deficit,
      pack_size,
      packs_to_order,
      suggested_order_qty: suggested_qty,
      surplus_after_order: suggested_qty - deficit,
      lead_time_days: lead_time,
      is_critical_lead: is_critical,
      first_deficit_day: row.first_deficit_day
    });
  }

  reorder_items.sort((a, b) => {
    if (a.is_critical_lead !== b.is_critical_lead) return a.is_critical_lead ? -1 : 1;
    return b.deficit - a.deficit;
  });

  return {
    items: reorder_items,
    total_items: reorder_items.length,
    total_packs,
    urgent_count
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
  const sim = calculateWeeklySimulation(GLOBAL_STATE);
  return {
    products: GLOBAL_STATE.products,
    product_order: GLOBAL_STATE.product_order,
    materials: GLOBAL_STATE.materials,
    material_order: GLOBAL_STATE.material_order,
    substitutes: GLOBAL_STATE.substitutes,
    boms: GLOBAL_STATE.boms,
    weekly_plan: GLOBAL_STATE.weekly_plan,
    simulation: sim,
    ledger: GLOBAL_STATE.ledger,
    batches: GLOBAL_STATE.batches,
    user_role: GLOBAL_STATE.user_role,
    recent_batch_summary: GLOBAL_STATE.recent_batch_summary,
    server_time: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  if (path === "/api/state" && method === "GET") {
    return jsonResponse(getStateResponse());
  }

  if (path === "/api/reorder/draft" && method === "GET") {
    return jsonResponse(calculateReorderDraft(GLOBAL_STATE));
  }

  if (path === "/api/export/reorder.csv" && method === "GET") {
    const draft = calculateReorderDraft(GLOBAL_STATE);
    let csv = "Material Code,Description,Category,UOM,Physical SOH,Committed in Plan,Net Deficit,Supplier Pack Size,Suggested Packs to Order,Total Order Qty,Lead Time (Days),Order Urgency,First Deficit Day\n";
    for (const item of draft.items) {
      const urgency = item.is_critical_lead ? "CRITICAL LEAD TIME" : "STANDARD";
      const day_str = item.first_deficit_day || "N/A";
      csv += `"${item.code}","${item.description}","${item.category}",${item.uom},${item.stock_on_hand.toFixed(3)},${item.total_committed.toFixed(3)},${item.deficit.toFixed(3)},${item.pack_size.toFixed(2)},${item.packs_to_order},${item.suggested_order_qty.toFixed(2)},${item.lead_time_days},"${urgency}","${day_str}"\n`;
    }
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reorder_draft_po.csv"'
      }
    });
  }

  if (path === "/api/role" && method === "POST") {
    try {
      const data = await context.request.json();
      const role = String(data.role || "admin").toLowerCase();
      if (role === "admin" || role === "operator") {
        GLOBAL_STATE.user_role = role;
      }
      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  if (path === "/api/plan/batch/add" && method === "POST") {
    try {
      const data = await context.request.json();
      const fg_code = String(data.fg_code || "FG-LB015/109").trim();
      const day = String(data.day || "Monday").trim();
      const unit_type = String(data.unit_type || "BULK_KG").toUpperCase();
      // `??` not `||`, so an explicit 0 reaches the guard instead of becoming 5.0.
      const target_qty = Number(data.target_qty ?? 5.0);
      if (!(target_qty > 0)) throw new Error("Target quantity must be greater than zero");
      const prod = GLOBAL_STATE.products[fg_code] || { unit_weight_grams: 5.0 };
      const unit_weight = prod.unit_weight_grams || 5.0;
      // F1: one pot is the product's own SFG batch weight, not a fixed 1.5 KG.
      const sfg_weight = prod.sfg_batch_weight_grams || 1500.0;

      let bulk_kg = target_qty;
      let pieces = Math.round((bulk_kg * 1000.0) / unit_weight);

      if (unit_type === "POTS") {
        bulk_kg = target_qty * (sfg_weight / 1000.0);
        pieces = Math.round((bulk_kg * 1000.0) / unit_weight);
      } else if (unit_type === "PIECES") {
        pieces = Math.round(target_qty);
        bulk_kg = (pieces * unit_weight) / 1000.0;
      }

      const batch_id = `batch-${GLOBAL_STATE.next_batch_id++}`;
      const ref = `BATCH-${fg_code.replace("FG-", "")}-${pieces}PCS`;

      GLOBAL_STATE.weekly_plan.push({
        id: batch_id,
        day: DAYS_OF_WEEK.includes(day) ? day : "Monday",
        fg_code,
        unit_type,
        target_qty,
        target_bulk_kg: bulk_kg,
        target_pieces: pieces,
        yield_buffer_percent: Number(data.yield_buffer_percent || 0.0),
        batch_ref: String(data.batch_ref || ref).trim().toUpperCase(),
        status: "PLANNED",
        operator_name: String(data.operator_name || "Operator Adam").trim()
      });

      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  if (path === "/api/plan/batch/update" && method === "POST") {
    try {
      const data = await context.request.json();
      const batch_id = String(data.id || "");
      for (const b of GLOBAL_STATE.weekly_plan) {
        if (b.id === batch_id) {
          if (b.status === "COMPLETED" && GLOBAL_STATE.user_role !== "admin") {
            return jsonResponse({ error: "Only Admin can modify completed batches" }, 403);
          }

          if (data.day && DAYS_OF_WEEK.includes(data.day)) b.day = data.day;
          if (data.fg_code && GLOBAL_STATE.products[data.fg_code]) b.fg_code = data.fg_code;
          if (data.unit_type) b.unit_type = String(data.unit_type).toUpperCase();

          const prod = GLOBAL_STATE.products[b.fg_code] || { unit_weight_grams: 5.0 };
          const unit_weight = prod.unit_weight_grams || 5.0;
          const sfg_weight = prod.sfg_batch_weight_grams || 1500.0;

          if (data.target_qty !== undefined && Number(data.target_qty) > 0) {
            b.target_qty = Number(data.target_qty);
            if (b.unit_type === "POTS") {
              b.target_bulk_kg = b.target_qty * (sfg_weight / 1000.0);
              b.target_pieces = Math.round((b.target_bulk_kg * 1000.0) / unit_weight);
            } else if (b.unit_type === "PIECES") {
              b.target_pieces = Math.round(b.target_qty);
              b.target_bulk_kg = (b.target_pieces * unit_weight) / 1000.0;
            } else {
              b.target_bulk_kg = b.target_qty;
              b.target_pieces = Math.round((b.target_bulk_kg * 1000.0) / unit_weight);
            }
          }

          if (data.batch_ref) b.batch_ref = String(data.batch_ref).trim().toUpperCase();
          if (data.yield_buffer_percent !== undefined) b.yield_buffer_percent = Math.max(0, Number(data.yield_buffer_percent));
          if (data.status) b.status = data.status;
          break;
        }
      }
      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  if (path === "/api/plan/batch/delete" && method === "POST") {
    try {
      const data = await context.request.json();
      const batch_id = String(data.id || "");
      const b = GLOBAL_STATE.weekly_plan.find(x => x.id === batch_id);
      if (b && b.status === "COMPLETED" && GLOBAL_STATE.user_role !== "admin") {
        return jsonResponse({ error: "Admin permission required to delete completed batches" }, 403);
      }
      GLOBAL_STATE.weekly_plan = GLOBAL_STATE.weekly_plan.filter(x => x.id !== batch_id);
      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  if (path === "/api/batch/execute" && method === "POST") {
    try {
      const data = await context.request.json();
      const batch_id = String(data.batch_id || "");
      const target_batch = GLOBAL_STATE.weekly_plan.find(b => b.id === batch_id);
      if (!target_batch) return jsonResponse({ error: "Batch not found in plan" }, 404);

      const items = data.items || [];
      if (items.length === 0) return jsonResponse({ error: "No material lines submitted" }, 400);

      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const batch_ref = String(data.batch_ref || target_batch.batch_ref).trim().toUpperCase();
      const operator_name = String(data.operator_name || target_batch.operator_name).trim();
      const fg_code = target_batch.fg_code;
      const target_pieces = target_batch.target_pieces;
      let total_rm = 0.0;
      let total_pm = 0;

      for (const item of items) {
        const rm_code = String(item.rm_code || "").trim();
        const mat = GLOBAL_STATE.materials[rm_code];
        if (!mat) continue;

        const actual_qty = Number(item.actual_qty || 0.0);
        const theo_qty = Number(item.theoretical_qty || actual_qty);
        const variance = actual_qty - theo_qty;

        const before = mat.stock_on_hand;
        mat.stock_on_hand -= actual_qty;
        const after = mat.stock_on_hand;

        if (mat.uom === "KG") total_rm += actual_qty;
        else total_pm += Math.round(actual_qty);

        const sub_info = item.substitute_for ? ` [Substituted for ${item.substitute_for}]` : "";
        const notes = `Batch ${batch_ref} Execution (${fg_code}): Actual ${actual_qty.toFixed(3)} ${mat.uom} (Theo: ${theo_qty.toFixed(3)}, Var: ${variance >= 0 ? '+' : ''}${variance.toFixed(3)})${sub_info}`;

        GLOBAL_STATE.ledger.unshift({
          transaction_id: GLOBAL_STATE.next_tx_id++,
          timestamp,
          material_code: mat.code,
          material_name: mat.description,
          type: "STOCK_OUT",
          category: "Production Batch Issue",
          quantity: actual_qty,
          balance_before: before,
          balance_after: after,
          uom: mat.uom,
          reference_doc: batch_ref,
          operator_name,
          notes
        });
      }

      target_batch.status = "COMPLETED";
      target_batch.completed_at = timestamp;
      target_batch.executed_items = items;

      const prod = GLOBAL_STATE.products[fg_code];
      if (prod) prod.stock_on_hand = (prod.stock_on_hand || 0.0) + target_pieces;

      GLOBAL_STATE.batches.unshift({
        batch_number: batch_ref,
        batch_id,
        fg_code,
        fg_name: prod ? prod.name : fg_code,
        timestamp,
        operator_name,
        target_pieces,
        bulk_kg: target_batch.target_bulk_kg,
        status: "COMPLETED",
        material_lines: items.length,
        executed_items: items
      });

      GLOBAL_STATE.recent_batch_summary = {
        batch_number: batch_ref,
        fg_code,
        target_pieces,
        timestamp,
        material_lines_deducted: items.length,
        total_rm_kg_deducted: total_rm,
        total_pm_pcs_deducted: total_pm
      };

      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  if (path === "/api/batch/cancel" && method === "POST") {
    try {
      if (GLOBAL_STATE.user_role !== "admin") {
        return jsonResponse({ error: "Admin privilege required to cancel completed batches" }, 403);
      }
      const data = await context.request.json();
      const batch_id = String(data.batch_id || "");
      const target_batch = GLOBAL_STATE.weekly_plan.find(b => b.id === batch_id);
      if (!target_batch || target_batch.status !== "COMPLETED") {
        return jsonResponse({ error: "Target batch is not completed" }, 400);
      }

      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const batch_ref = target_batch.batch_ref;
      const items = target_batch.executed_items || [];

      for (const item of items) {
        const mat = GLOBAL_STATE.materials[item.rm_code];
        if (!mat) continue;
        const qty = Number(item.actual_qty || 0.0);
        const before = mat.stock_on_hand;
        mat.stock_on_hand += qty;
        const after = mat.stock_on_hand;

        GLOBAL_STATE.ledger.unshift({
          transaction_id: GLOBAL_STATE.next_tx_id++,
          timestamp,
          material_code: mat.code,
          material_name: mat.description,
          type: "STOCK_IN",
          category: "Batch Cancellation Reversal",
          quantity: qty,
          balance_before: before,
          balance_after: after,
          uom: mat.uom,
          reference_doc: `CANCEL-${batch_ref}`,
          operator_name: "Admin Adam",
          notes: `Reversal for cancelled batch ${batch_ref}`
        });
      }

      const prod = GLOBAL_STATE.products[target_batch.fg_code];
      if (prod) prod.stock_on_hand = Math.max(0, (prod.stock_on_hand || 0.0) - target_batch.target_pieces);

      target_batch.status = "PLANNED";
      delete target_batch.completed_at;
      delete target_batch.executed_items;

      for (const blog of GLOBAL_STATE.batches) {
        if (blog.batch_number === batch_ref) blog.status = "CANCELLED";
      }

      return jsonResponse(getStateResponse());
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  if (path === "/api/transaction" && method === "POST") {
    try {
      const data = await context.request.json();
      const code = String(data.material_code || "").trim().toUpperCase();
      const mat = GLOBAL_STATE.materials[code];
      if (!mat) return jsonResponse({ error: "Material code not found" }, 400);

      const tx_type = String(data.type || "STOCK_IN").trim().toUpperCase();
      const qty = Number(data.quantity) || 0;
      if (qty <= 0) return jsonResponse({ error: "Quantity must be greater than zero" }, 400);

      const category = String(data.category || "Cycle Count Adjustment").trim();
      const ref_doc = String(data.reference_doc || "MANUAL").trim();
      const operator_name = String(data.operator_name || "Operator Adam").trim();
      const notes = String(data.notes || category).trim();
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const before = mat.stock_on_hand;
      mat.stock_on_hand = (tx_type === "STOCK_IN") ? (before + qty) : (before - qty);
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

  if (path === "/api/reset" && method === "POST") {
    GLOBAL_STATE = getInitialState();
    return jsonResponse(getStateResponse());
  }

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
