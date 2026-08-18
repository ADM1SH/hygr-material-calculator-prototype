/**
 * HYGR Material Requirement Calculator & Stock Card Enterprise System
 * 
 * Production-Ready Interactive Terminal ERP / WMS Prototype
 * 
 * Key Capabilities:
 * 1. Bulletproof Input Validation: Full case-insensitivity, flexible item search (number, code, keyword),
 *    safe number parsing, and universal back/cancel buttons.
 * 2. Persistent Active Production Context: Displays active product, batch targets, and live feasibility.
 * 3. Dynamic Multi-Product BOM Engine: Automatic recipe switching and demand calculations.
 * 4. 3-Part Stock Card Module:
 *    - (a) Operator Transaction Entry (IN/OUT, category, reference, operator name, real-time SOH update).
 *    - (b) Searchable Transaction Ledger (by item, batch #, operator, type, or export to CSV).
 *    - (c) Material Master & SCM Stock Cover Health Analytics (SCM vs Lead Time reorder alerts).
 * 5. Batch Production Execution Tracker: Logs batch runs with operator attribution and automated deductions.
 * 6. CSV Reporting: Exports audit ledger and inventory health reports to CSV.
 * 7. System Reset: Reloads original seed data from 'Bom Example.xlsx' on demand.
 */

#include <iostream>
#include <iomanip>
#include <vector>
#include <string>
#include <map>
#include <ctime>
#include <sstream>
#include <algorithm>
#include <cctype>
#include <fstream>
#include <cmath>

using namespace std;

// ==========================================
// ANSI COLOR CODES FOR MODERN TERMINAL UI
// ==========================================

namespace Color {
    const string RESET       = "\033[0m";
    const string BOLD        = "\033[1m";
    const string RED         = "\033[31m";
    const string GREEN       = "\033[32m";
    const string YELLOW      = "\033[33m";
    const string BLUE        = "\033[34m";
    const string MAGENTA     = "\033[35m";
    const string CYAN        = "\033[36m";
    const string WHITE       = "\033[37m";
    const string BG_CYAN     = "\033[46m";
    const string BG_RED      = "\033[41m";
    const string BG_GREEN    = "\033[42m";
}

// ==========================================
// ENUMS & DATA STRUCTURES
// ==========================================

enum class MaterialCategory {
    RAW_MATERIAL,
    PACKAGING_PRIMARY,
    PACKAGING_SECONDARY
};

enum class TransactionType {
    STOCK_IN,
    STOCK_OUT
};

enum class TransactionCategory {
    PURCHASE_RECEIPT,
    PRODUCTION_ISSUE,
    QUALITY_CONTROL_SAMPLE,
    SCRAP_WASTAGE,
    CYCLE_COUNT_ADJUSTMENT,
    RETURN_TO_VENDOR,
    GENERAL_TRANSACTION
};

enum class PlanningMode {
    BY_PIECES,
    BY_BULK_KG
};

enum class BatchStatus {
    COMPLETED,
    IN_PROGRESS,
    CANCELLED
};

struct Material {
    string code;
    string description;
    string status;                  // "ACTIVE" or "DISCONTINUING"
    int leadTimeDays;               // Procurement lead time in days
    double stockOnHand;             // In KG for RM, or PCS for PM
    string uom;                     // "KG" or "PCS"
    MaterialCategory category;
    string subgroup;                // "Primary Packaging", "Unitbox", or ""
    double avgMonthlyUsage;         // Estimated average monthly consumption (KG or PCS)
};

struct BomItem {
    string fgCode;                  // Finished goods code (e.g. FG-LB015/109)
    string rmCode;                  // Raw or Packaging material code
    string rmName;                  // Material description
    double recipeQty;               // Quantity in base SFG formulation batch (GM or PCS)
    string uom;                     // "GM" or "PCS"
    double sfgTotalOutput;          // Total SFG batch output weight in grams (1500g) or 1 for PM
    double unitSize;                // Unit fill weight (5g)
    double usagePerPiece;           // Material makeup per piece (in GM or PCS)
};

struct Product {
    string fgCode;
    string name;
    string category;
    double unitWeightGrams;         // Fill weight per piece (5g)
    double sfgBatchWeightGrams;     // Base recipe batch weight (1500g)
    string description;
};

struct ProductionPlan {
    string activeFgCode;
    PlanningMode mode;
    double targetPieces;            // Target finished units
    double targetBulkKg;            // Target bulk mass in KG
    string batchReference;
    string operatorName;
    double yieldBufferPercent;      // Optional scrap buffer % (e.g. 0.0% to 5.0%)
};

struct StockTransaction {
    int transactionId;
    string timestamp;
    string materialCode;
    string materialName;
    TransactionType type;           // STOCK_IN or STOCK_OUT
    TransactionCategory category;
    double quantity;
    double balanceBefore;
    double balanceAfter;
    string uom;
    string referenceDoc;            // e.g. "PO#9920", "BATCH-BC-400PCS"
    string operatorName;            // e.g. "Operator Adam"
    string notes;                   // Detailed comment
};

struct BatchRecord {
    string batchNumber;
    string fgCode;
    string fgName;
    string timestamp;
    string operatorName;
    double targetPieces;
    double bulkKg;
    BatchStatus status;
    int materialLinesDeducted;
};

struct AppContext {
    map<string, Product> productCatalog;
    vector<string> productOrder;
    map<string, Material> inventoryMaster;
    vector<string> materialOrder;
    map<string, vector<BomItem>> bomDatabase; // Key: fgCode -> List of BomItems
    vector<StockTransaction> transactionLedger;
    vector<BatchRecord> completedBatches;
    ProductionPlan activePlan;
    int nextTransactionId;
    string currentOperator;
};

// ==========================================
// FUNCTION PROTOTYPES
// ==========================================

// Initialization & Database Management
void initializeMasterDatabase(AppContext& ctx);
void resetDatabaseToDefault(AppContext& ctx);

// Navigation & Screen Controllers
void runMainLoop(AppContext& ctx);
void showDashboardScreen(AppContext& ctx);
void showLiveBomTableScreen(AppContext& ctx);
void showProductSelectionScreen(AppContext& ctx);
void showChangeTargetScreen(AppContext& ctx);
void showExecuteProductionScreen(AppContext& ctx);
void showStockCardEntryScreen(AppContext& ctx);
void showTransactionHistoryScreen(AppContext& ctx);
void showInventorySummaryScreen(AppContext& ctx);
void showStockHealthAnalyticsScreen(AppContext& ctx);
void showBatchHistoryScreen(AppContext& ctx);
void exportDataToCsvScreen(AppContext& ctx);

// Calculation Engine
struct BomCalculationRow {
    string rmCode;
    string rmName;
    double recipeQty;
    string recipeUom;
    double usagePerPiece;
    double requiredQty;
    string requiredUom;
    double stockOnHand;
    double balanceAfter;
    bool isShortage;
    double deficit;
    string subgroup;
    MaterialCategory category;
    int leadTimeDays;
};

vector<BomCalculationRow> calculateActivePlanRequirements(const AppContext& ctx);

// Stock Health (SCM) Calculator
struct StockHealthMetrics {
    double stockOnHand;
    double avgMonthlyUsage;
    double stockCoverMonths;        // SCM = SOH / AMU
    double stockCoverDays;          // SCM * 30 days
    int leadTimeDays;
    string healthStatus;            // "CRITICAL REORDER", "LOW STOCK", "HEALTHY", "OVERSTOCKED"
    string badgeColor;
};

StockHealthMetrics calculateStockHealth(const Material& mat);

// Bulletproof Input Validation & String Helpers
void clearScreen();
void pressEnterToContinue();
void printBanner(const string& title, const string& subtitle = "");
void printDivider(char ch = '=', int length = 114);

string formatDouble(double value, int precision);
string getCurrentTimestamp();
string trimString(const string& str);
string toUpperString(const string& str);
string toLowerString(const string& str);
string normalizeCode(const string& str);

int getIntInput(const string& prompt, int minVal, int maxVal, bool& isCancelled);
double getDoubleInput(const string& prompt, double minVal, double maxVal, bool& isCancelled);
string getStringInput(const string& prompt, bool allowEmpty, bool& isCancelled);
bool getConfirmationInput(const string& prompt, bool defaultYes, bool& isCancelled);

// Flexible Material Search Helper (Search by index number, full code, partial code, or description keyword)
const Material* findMaterialByInput(const AppContext& ctx, const string& inputQuery, string& resolvedCode);

// Category Name Converters
string getTransactionCategoryName(TransactionCategory cat);
TransactionCategory promptTransactionCategory(bool isStockIn, bool& isCancelled);

// ==========================================
// MAIN ENTRY POINT
// ==========================================

int main() {
    AppContext ctx;
    ctx.nextTransactionId = 1001;
    ctx.currentOperator = "Operator Adam";

    // Load initial seed dataset extracted from Bom Example.xlsx
    initializeMasterDatabase(ctx);

    // Launch main interactive application loop
    runMainLoop(ctx);

    clearScreen();
    cout << Color::CYAN << Color::BOLD << "\n  HYGR Material Requirement & Stock Card System Terminated.\n" << Color::RESET;
    cout << "  All in-memory transactions and production runs were processed successfully.\n\n";
    return 0;
}

// ==========================================
// DATABASE INITIALIZATION & SEED DATA
// ==========================================

void initializeMasterDatabase(AppContext& ctx) {
    ctx.productCatalog.clear();
    ctx.productOrder.clear();
    ctx.inventoryMaster.clear();
    ctx.materialOrder.clear();
    ctx.bomDatabase.clear();
    ctx.transactionLedger.clear();
    ctx.completedBatches.clear();

    // 1. Finished Products Catalog
    Product p1 = {
        "FG-LB015/109",
        "Lip Balm Paper (Black Cherry) 5g",
        "Lip Care",
        5.0,
        1500.0,
        "Premium moisturizing lip balm with natural waxes and Black Cherry tint."
    };

    ctx.productCatalog[p1.fgCode] = p1;
    ctx.productOrder.push_back(p1.fgCode);

    // 2. Raw Materials & Packaging Master List (from 'Raw Material List' sheet in Bom Example.xlsx)
    // avgMonthlyUsage estimates provided to enable Stock Cover Months (SCM) analytics
    vector<Material> initialMaterials = {
        {"RM-SS001/005", "KAHLWAX 2039L CANDELILA WAX", "ACTIVE", 134, 125.280, "KG", MaterialCategory::RAW_MATERIAL, "", 30.0},
        {"RM-CO007/054", "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)", "ACTIVE", 104, 4.350, "KG", MaterialCategory::RAW_MATERIAL, "", 1.5},
        {"RM-L004/011", "Avocado Oil Cosmetic (23KG/TONG)", "ACTIVE", 30, 23.000, "KG", MaterialCategory::RAW_MATERIAL, "", 20.0},
        {"RM-CO004/043", "DK-PGT Paste R7 (Red) (5KG/PAIL)", "ACTIVE", 194, 7.500, "KG", MaterialCategory::RAW_MATERIAL, "", 1.8},
        {"RM-CO002/027", "DK-PGT Paste IOR (Coral) (5KG/PAIL)", "ACTIVE", 104, 75.000, "KG", MaterialCategory::RAW_MATERIAL, "", 15.0},
        {"RM-SS004/020", "Akogel (20KG/BAG)", "ACTIVE", 74, 33.680, "KG", MaterialCategory::RAW_MATERIAL, "", 10.0},
        {"RM-L005/028", "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)", "ACTIVE", 30, 10.237, "KG", MaterialCategory::RAW_MATERIAL, "", 5.0},
        {"RM-SS003/012", "Beeswax (25KG/DRUM)", "ACTIVE", 30, 103.460, "KG", MaterialCategory::RAW_MATERIAL, "", 35.0},
        {"RM-L001/001", "Palmester 3595 [MCT Oil] (190KG/Drum)", "ACTIVE", 30, 424.225, "KG", MaterialCategory::RAW_MATERIAL, "", 60.0},
        {"RM-CO003/031", "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", "ACTIVE", 0, 34.110, "KG", MaterialCategory::RAW_MATERIAL, "", 4.0},
        {"RM-EO006/023", "Green Mandarin Essential Oil (1KG/BTL)", "ACTIVE", 56, 6.660, "KG", MaterialCategory::RAW_MATERIAL, "", 2.5},
        {"RM-L022/069", "Jojoba Oil Golden (23KG/TONG)", "ACTIVE", 30, 35.550, "KG", MaterialCategory::RAW_MATERIAL, "", 25.0},
        {"RM-L003/010", "Vitamin E Acetate - Care (5KG/TONG)", "ACTIVE", 74, 135.000, "KG", MaterialCategory::RAW_MATERIAL, "", 12.0},
        {"RM-SS007/075", "Shea Butter Refined TYP EPR (25KG/CTN)", "ACTIVE", 120, 377.980, "KG", MaterialCategory::RAW_MATERIAL, "", 50.0},
        {"PM-T031/277", "Tube - Lip Balm Paper (Black Cherry) 5g", "ACTIVE", 65, 21721.0, "PCS", MaterialCategory::PACKAGING_PRIMARY, "Primary Packaging", 5000.0},
        {"PM-BO101/247", "Unitbox - Lip Balm Paper (Black Cherry) 5g", "ACTIVE", 30, 9826.0, "PCS", MaterialCategory::PACKAGING_SECONDARY, "Unitbox", 5000.0}
    };

    for (const auto& mat : initialMaterials) {
        ctx.inventoryMaster[mat.code] = mat;
        ctx.materialOrder.push_back(mat.code);
    }

    // 3. BOM for Product 1: FG-LB015/109 (Black Cherry 5g) - Exact match to Excel Sheet 'bom'
    string fg1 = "FG-LB015/109";
    double sfgBatch1 = 1500.0;
    double unitWeight1 = 5.0;

    ctx.bomDatabase[fg1] = {
        {fg1, "RM-SS001/005", "KAHLWAX 2039L CANDELILA WAX", 81.0, "GM", sfgBatch1, unitWeight1, (81.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-CO007/054", "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)", 16.0, "GM", sfgBatch1, unitWeight1, (16.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-L004/011", "Avocado Oil Cosmetic (23KG/TONG)", 231.0, "GM", sfgBatch1, unitWeight1, (231.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-CO004/043", "DK-PGT Paste R7 (Red) (5KG/PAIL)", 16.0, "GM", sfgBatch1, unitWeight1, (16.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-CO002/027", "DK-PGT Paste IOR (Coral) (5KG/PAIL)", 7.0, "GM", sfgBatch1, unitWeight1, (7.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-SS004/020", "Akogel (20KG/BAG)", 68.0, "GM", sfgBatch1, unitWeight1, (68.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-L005/028", "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)", 68.0, "GM", sfgBatch1, unitWeight1, (68.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-SS003/012", "Beeswax (25KG/DRUM)", 271.0, "GM", sfgBatch1, unitWeight1, (271.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-L001/001", "Palmester 3595 [MCT Oil] (190KG/Drum)", 337.0, "GM", sfgBatch1, unitWeight1, (337.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-CO003/031", "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", 34.0, "GM", sfgBatch1, unitWeight1, (34.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-EO006/023", "Green Mandarin Essential Oil (1KG/BTL)", 24.0, "GM", sfgBatch1, unitWeight1, (24.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-L022/069", "Jojoba Oil Golden (23KG/TONG)", 231.0, "GM", sfgBatch1, unitWeight1, (231.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-L003/010", "Vitamin E Acetate - Care (5KG/TONG)", 14.0, "GM", sfgBatch1, unitWeight1, (14.0 / sfgBatch1) * unitWeight1},
        {fg1, "RM-SS007/075", "Shea Butter Refined TYP EPR (25KG/CTN)", 102.0, "GM", sfgBatch1, unitWeight1, (102.0 / sfgBatch1) * unitWeight1},
        {fg1, "PM-T031/277", "Tube - Lip Balm Paper (Black Cherry) 5g", 1.0, "PCS", 1.0, unitWeight1, 1.0},
        {fg1, "PM-BO101/247", "Unitbox - Lip Balm Paper (Black Cherry) 5g", 1.0, "PCS", 1.0, unitWeight1, 1.0}
    };

    // 4. Default Active Production Context (Matching Excel: 400 pcs / 2.0 kg)
    ctx.activePlan.activeFgCode = "FG-LB015/109";
    ctx.activePlan.mode = PlanningMode::BY_PIECES;
    ctx.activePlan.targetPieces = 400.0;
    ctx.activePlan.targetBulkKg = 2.000;
    ctx.activePlan.batchReference = "BATCH-BC-400PCS";
    ctx.activePlan.operatorName = ctx.currentOperator;
    ctx.activePlan.yieldBufferPercent = 0.0;
}

void resetDatabaseToDefault(AppContext& ctx) {
    clearScreen();
    printBanner("RESET SYSTEM DATA TO DEFAULT EXCEL SEED STATE", "Restoring all 18 materials, BOM recipes, and initial stock balances");

    bool isCancelled = false;
    bool confirm = getConfirmationInput("Are you sure you want to reset all inventory and transactions? [y/n]: ", false, isCancelled);
    if (isCancelled || !confirm) {
        cout << "\n  [i] Reset cancelled. Current data retained.\n";
        pressEnterToContinue();
        return;
    }

    initializeMasterDatabase(ctx);
    cout << "\n  " << Color::GREEN << Color::BOLD << "[✓] System successfully reset to clean default state from 'Bom Example.xlsx'." << Color::RESET << "\n";
    pressEnterToContinue();
}

// ==========================================
// BOM CALCULATION ENGINE
// ==========================================

vector<BomCalculationRow> calculateActivePlanRequirements(const AppContext& ctx) {
    vector<BomCalculationRow> rows;
    auto itBom = ctx.bomDatabase.find(ctx.activePlan.activeFgCode);
    if (itBom == ctx.bomDatabase.end()) {
        return rows;
    }

    double pieces = ctx.activePlan.targetPieces;
    double bufferMultiplier = 1.0 + (ctx.activePlan.yieldBufferPercent / 100.0);

    for (const auto& item : itBom->second) {
        auto itMat = ctx.inventoryMaster.find(item.rmCode);
        if (itMat == ctx.inventoryMaster.end()) {
            continue;
        }

        const Material& mat = itMat->second;
        double requiredQty = 0.0;
        string reqUom = "";

        if (mat.category == MaterialCategory::RAW_MATERIAL) {
            // Formula: (Recipe_g / SFG_Total_g) * UnitSize_g * TargetPieces * (1 + Buffer%) / 1000 -> In KG
            double requiredGrams = item.usagePerPiece * pieces * bufferMultiplier;
            requiredQty = requiredGrams / 1000.0; // In KG
            reqUom = "KG";
        } else {
            // Packaging Materials: 1 unit per finished piece * buffer
            requiredQty = ceil(item.usagePerPiece * pieces * bufferMultiplier);
            reqUom = "PCS";
        }

        double balanceAfter = mat.stockOnHand - requiredQty;
        bool isShortage = (balanceAfter < 0.0);
        double deficit = isShortage ? (requiredQty - mat.stockOnHand) : 0.0;

        rows.push_back({
            mat.code,
            mat.description,
            item.recipeQty,
            item.uom,
            item.usagePerPiece,
            requiredQty,
            reqUom,
            mat.stockOnHand,
            balanceAfter,
            isShortage,
            deficit,
            mat.subgroup,
            mat.category,
            mat.leadTimeDays
        });
    }

    return rows;
}

// ==========================================
// STOCK HEALTH & REORDER ANALYTICS (SCM)
// ==========================================

StockHealthMetrics calculateStockHealth(const Material& mat) {
    StockHealthMetrics metrics;
    metrics.stockOnHand = mat.stockOnHand;
    metrics.avgMonthlyUsage = mat.avgMonthlyUsage;
    metrics.leadTimeDays = mat.leadTimeDays;

    if (mat.avgMonthlyUsage > 0.0) {
        metrics.stockCoverMonths = mat.stockOnHand / mat.avgMonthlyUsage;
        metrics.stockCoverDays = metrics.stockCoverMonths * 30.0;
    } else {
        metrics.stockCoverMonths = 99.0;
        metrics.stockCoverDays = 999.0;
    }

    // Health Status Evaluation against Lead Time
    if (metrics.stockCoverDays <= static_cast<double>(mat.leadTimeDays)) {
        metrics.healthStatus = "REORDER NOW";
        metrics.badgeColor = Color::RED + Color::BOLD;
    } else if (metrics.stockCoverDays <= static_cast<double>(mat.leadTimeDays + 21)) {
        metrics.healthStatus = "LOW STOCK";
        metrics.badgeColor = Color::YELLOW + Color::BOLD;
    } else if (metrics.stockCoverMonths > 6.0) {
        metrics.healthStatus = "OVERSTOCKED";
        metrics.badgeColor = Color::MAGENTA;
    } else {
        metrics.healthStatus = "HEALTHY";
        metrics.badgeColor = Color::GREEN;
    }

    return metrics;
}

// ==========================================
// MAIN NAVIGATION MENU LOOP
// ==========================================

void runMainLoop(AppContext& ctx) {
    bool isRunning = true;
    while (isRunning) {
        showDashboardScreen(ctx);

        bool isCancelled = false;
        int choice = getIntInput("Select Navigation Option [0-9]: ", 0, 9, isCancelled);
        if (isCancelled || choice == 0) {
            isRunning = false;
            break;
        }

        switch (choice) {
            case 1:
                showLiveBomTableScreen(ctx);
                break;
            case 2:
                showProductSelectionScreen(ctx);
                break;
            case 3:
                showChangeTargetScreen(ctx);
                break;
            case 4:
                showExecuteProductionScreen(ctx);
                break;
            case 5:
                showStockCardEntryScreen(ctx);
                break;
            case 6:
                showTransactionHistoryScreen(ctx);
                break;
            case 7:
                showInventorySummaryScreen(ctx);
                break;
            case 8:
                showStockHealthAnalyticsScreen(ctx);
                break;
            case 9:
                exportDataToCsvScreen(ctx);
                break;
            default:
                break;
        }
    }
}

// ==========================================
// SCREEN 0: DASHBOARD / COCKPIT
// ==========================================

void showDashboardScreen(AppContext& ctx) {
    clearScreen();
    printBanner("HYGR MATERIAL REQUIREMENT CALCULATOR & LIVE STOCK CARD SYSTEM", "Production Planning & Warehouse Inventory Management Cockpit");

    Product activeProd = ctx.productCatalog[ctx.activePlan.activeFgCode];
    auto requirements = calculateActivePlanRequirements(ctx);

    int shortageCount = 0;
    double totalRmRequiredKg = 0.0;
    double totalPmRequiredPcs = 0.0;

    for (const auto& r : requirements) {
        if (r.isShortage) shortageCount++;
        if (r.category == MaterialCategory::RAW_MATERIAL) {
            totalRmRequiredKg += r.requiredQty;
        } else {
            totalPmRequiredPcs += r.requiredQty;
        }
    }

    // Active Production Context Header
    cout << Color::CYAN << Color::BOLD << "  [ACTIVE PRODUCTION CONTEXT]" << Color::RESET << "\n";
    cout << "  Product Selected : " << Color::WHITE << Color::BOLD << activeProd.fgCode << " - " << activeProd.name << Color::RESET << "\n";
    cout << "  Planning Mode    : " << (ctx.activePlan.mode == PlanningMode::BY_PIECES ? "By Finished Pieces (Units)" : "By Bulk SFG Mass (KG)") << "\n";
    cout << "  Target Quantity  : " << Color::GREEN << Color::BOLD << fixed << setprecision(0) << ctx.activePlan.targetPieces << " PCS" << Color::RESET
         << " (" << Color::CYAN << fixed << setprecision(3) << ctx.activePlan.targetBulkKg << " KG bulk" << Color::RESET
         << (ctx.activePlan.yieldBufferPercent > 0.0 ? " + " + formatDouble(ctx.activePlan.yieldBufferPercent, 1) + "% scrap buffer" : "") << ")\n";
    cout << "  RM Requirement   : " << fixed << setprecision(3) << totalRmRequiredKg << " KG total bulk formulation\n";
    cout << "  PM Requirement   : " << fixed << setprecision(0) << totalPmRequiredPcs << " PCS total packaging (tubes + unitboxes)\n";

    // Feasibility Banner
    if (shortageCount > 0) {
        cout << "  Production Status: " << Color::RED << Color::BOLD << "[!] INSUFFICIENT STOCK (" << shortageCount << " Material Shortage(s) Flagged)" << Color::RESET << "\n";
    } else {
        cout << "  Production Status: " << Color::GREEN << Color::BOLD << "[OK] 100% SUFFICIENT (All " << requirements.size() << " materials available for immediate issue)" << Color::RESET << "\n";
    }

    printDivider('-', 114);
    cout << Color::BOLD << "  MAIN NAVIGATION MENU:\n" << Color::RESET;
    cout << "  " << Color::CYAN << "[1]" << Color::RESET << " View Live BOM Requirement Table (Detailed Material Calculation & Stock Deduction Breakdown)\n";
    cout << "  " << Color::CYAN << "[2]" << Color::RESET << " Select / Switch Active Product\n";
    cout << "  " << Color::CYAN << "[3]" << Color::RESET << " Change Production Target Batch Size (Pieces or Bulk KG)\n";
    cout << "  " << Color::CYAN << "[4]" << Color::RESET << " Execute Batch Production (Issue Run, Deduct Stock & Generate Stock Card Out Ledger)\n";
    cout << "  " << Color::CYAN << "[5]" << Color::RESET << " Stock Card Entry (Operator Key-in Transaction: STOCK IN / STOCK OUT)\n";
    cout << "  " << Color::CYAN << "[6]" << Color::RESET << " Search Stock Card Transaction Ledger (Filter by Item, Batch, Operator, or Keyword)\n";
    cout << "  " << Color::CYAN << "[7]" << Color::RESET << " View Material Master & Real-Time Warehouse Stock Summary\n";
    cout << "  " << Color::CYAN << "[8]" << Color::RESET << " Stock Health Analytics (Stock Cover Months / SCM & Lead Time Reorder Radar)\n";
    cout << "  " << Color::CYAN << "[9]" << Color::RESET << " Export Stock Card Ledger & Material Reports to CSV\n";
    cout << "  " << Color::YELLOW << "[0] Exit System\n" << Color::RESET;
    printDivider('=', 114);
}

// ==========================================
// SCREEN 1: LIVE BOM CALCULATION TABLE
// ==========================================

void showLiveBomTableScreen(AppContext& ctx) {
    while (true) {
        clearScreen();
        Product prod = ctx.productCatalog[ctx.activePlan.activeFgCode];
        printBanner("LIVE BOM REQUIREMENT & STOCK DEDUCTION TABLE", "Product: " + prod.fgCode + " (" + prod.name + ")");

        cout << "  Target Quantity : " << Color::GREEN << Color::BOLD << fixed << setprecision(0) << ctx.activePlan.targetPieces << " PCS" << Color::RESET
             << " | Bulk SFG Weight: " << Color::CYAN << Color::BOLD << fixed << setprecision(3) << ctx.activePlan.targetBulkKg << " KG" << Color::RESET
             << " | Unit Fill: 5.0g per piece\n";
        printDivider('-', 124);

        // Table Header
        cout << left << setw(16) << "Material Code"
             << setw(36) << "Material Description"
             << right << setw(10) << "Recipe"
             << setw(13) << "Makeup/Pc"
             << setw(14) << "Required"
             << setw(15) << "Stock On Hand"
             << setw(15) << "Balance After"
             << "   " << left << setw(12) << "Status" << "\n";
        printDivider('-', 124);

        auto rows = calculateActivePlanRequirements(ctx);
        int shortages = 0;
        double totalRmRequiredKg = 0.0;

        for (const auto& r : rows) {
            if (r.isShortage) shortages++;
            if (r.category == MaterialCategory::RAW_MATERIAL) {
                totalRmRequiredKg += r.requiredQty;
            }

            ostringstream recipeStr, makeupStr, reqStr, sohStr, balStr;
            recipeStr << fixed << setprecision(r.category == MaterialCategory::RAW_MATERIAL ? 1 : 0) << r.recipeQty << " " << r.recipeUom;
            makeupStr << fixed << setprecision(r.category == MaterialCategory::RAW_MATERIAL ? 4 : 0) << r.usagePerPiece << (r.category == MaterialCategory::RAW_MATERIAL ? "g" : "pc");
            reqStr << fixed << setprecision(r.requiredUom == "KG" ? 4 : 0) << r.requiredQty << " " << r.requiredUom;
            sohStr << fixed << setprecision(r.requiredUom == "KG" ? 3 : 0) << r.stockOnHand << " " << r.requiredUom;
            balStr << fixed << setprecision(r.requiredUom == "KG" ? 3 : 0) << r.balanceAfter << " " << r.requiredUom;

            string statusBadge = r.isShortage ? (Color::RED + Color::BOLD + "[!] SHORT" + Color::RESET) : (Color::GREEN + "[OK] SUFF" + Color::RESET);

            cout << left << setw(16) << r.rmCode
                 << setw(36) << (r.rmName.length() > 34 ? r.rmName.substr(0, 31) + "..." : r.rmName)
                 << right << setw(10) << recipeStr.str()
                 << setw(13) << makeupStr.str()
                 << setw(14) << reqStr.str()
                 << setw(15) << sohStr.str()
                 << setw(15) << balStr.str()
                 << "   " << left << statusBadge << "\n";
        }

        printDivider('=', 124);
        cout << "  Summary: " << rows.size() << " BOM items | Total Bulk Raw Material Demand: " << fixed << setprecision(3) << totalRmRequiredKg << " KG\n";

        if (shortages > 0) {
            cout << "  " << Color::RED << Color::BOLD << ">>> [WARNING] " << shortages << " material shortage(s) detected! Immediate purchase required before batch release. <<<\n" << Color::RESET;
            for (const auto& r : rows) {
                if (r.isShortage) {
                    cout << "      * " << r.rmCode << " (" << r.rmName << "): Need +" << fixed << setprecision(r.requiredUom == "KG" ? 4 : 0)
                         << r.deficit << " " << r.requiredUom << " | Lead Time: " << r.leadTimeDays << " days\n";
                }
            }
        } else {
            cout << "  " << Color::GREEN << Color::BOLD << ">>> [SUCCESS] All materials sufficient on hand to produce this planned batch. <<<\n" << Color::RESET;
        }

        printDivider('-', 124);
        cout << Color::BOLD << "  TABLE ACTIONS:\n" << Color::RESET;
        cout << "  " << Color::CYAN << "[1]" << Color::RESET << " Change Target Batch Quantity\n";
        cout << "  " << Color::CYAN << "[2]" << Color::RESET << " Switch Active Product (BOM Recipe)\n";
        cout << "  " << Color::CYAN << "[3]" << Color::RESET << " Execute Batch Production (Deduct Stock Cards)\n";
        cout << "  " << Color::YELLOW << "[0] Back to Main Dashboard\n" << Color::RESET;
        printDivider('-', 124);

        bool isCancelled = false;
        int action = getIntInput("Choose Action [0-3]: ", 0, 3, isCancelled);
        if (isCancelled || action == 0) {
            break;
        }

        if (action == 1) {
            showChangeTargetScreen(ctx);
        } else if (action == 2) {
            showProductSelectionScreen(ctx);
        } else if (action == 3) {
            showExecuteProductionScreen(ctx);
        }
    }
}

// ==========================================
// SCREEN 2: PRODUCT SELECTION / SWITCHING
// ==========================================

void showProductSelectionScreen(AppContext& ctx) {
    clearScreen();
    printBanner("SELECT / SWITCH ACTIVE FINISHED PRODUCT", "Switching products automatically loads its BOM recipe & updates requirements");

    cout << "  Available Finished Goods in System Catalog:\n\n";
    for (size_t i = 0; i < ctx.productOrder.size(); ++i) {
        string code = ctx.productOrder[i];
        const Product& p = ctx.productCatalog[code];
        bool isActive = (code == ctx.activePlan.activeFgCode);

        cout << "  [" << (i + 1) << "] " << left << setw(16) << p.fgCode
             << setw(38) << p.name
             << setw(12) << p.category
             << (isActive ? (Color::GREEN + Color::BOLD + " [CURRENTLY ACTIVE]" + Color::RESET) : "")
             << "\n";
    }

    cout << "\n  " << Color::YELLOW << "[0] Back / Cancel (Keep Current Product)\n" << Color::RESET;
    printDivider('-', 90);

    bool isCancelled = false;
    int choice = getIntInput("Select Product Number [1-" + to_string(ctx.productOrder.size()) + "] or [0] Back: ", 0, static_cast<int>(ctx.productOrder.size()), isCancelled);

    if (isCancelled || choice == 0) {
        return;
    }

    string selectedCode = ctx.productOrder[choice - 1];
    ctx.activePlan.activeFgCode = selectedCode;

    cout << "\n  " << Color::GREEN << Color::BOLD << "[✓] Active Product switched to: "
         << ctx.productCatalog[selectedCode].fgCode << " - " << ctx.productCatalog[selectedCode].name
         << Color::RESET << "\n";
    cout << "  BOM table and live inventory deductions have updated dynamically.\n";
    pressEnterToContinue();
}

// ==========================================
// SCREEN 3: CHANGE TARGET QUANTITY
// ==========================================

void showChangeTargetScreen(AppContext& ctx) {
    clearScreen();
    Product prod = ctx.productCatalog[ctx.activePlan.activeFgCode];
    printBanner("CHANGE PRODUCTION TARGET BATCH SIZE", "Product: " + prod.fgCode + " - " + prod.name);

    cout << "  Current Active Target: " << Color::GREEN << Color::BOLD << fixed << setprecision(0) << ctx.activePlan.targetPieces << " PCS" << Color::RESET
         << " (" << Color::CYAN << fixed << setprecision(3) << ctx.activePlan.targetBulkKg << " KG bulk SFG" << Color::RESET << ")\n\n";

    cout << "  Select Planning Input Mode:\n";
    cout << "  " << Color::CYAN << "[1]" << Color::RESET << " Plan by Pieces (Target Finished Units, e.g. 400, 1000, 5000 pcs)\n";
    cout << "  " << Color::CYAN << "[2]" << Color::RESET << " Plan by Kilo (Target Bulk SFG Batch Mass, e.g. 2.0 kg, 6.0 kg, 50.0 kg)\n";
    cout << "  " << Color::YELLOW << "[0] Back / Cancel (Keep Current Target)\n" << Color::RESET;
    printDivider('-', 90);

    bool isCancelled = false;
    int modeChoice = getIntInput("Choose Planning Mode [1-2] or [0] Back: ", 0, 2, isCancelled);
    if (isCancelled || modeChoice == 0) {
        return;
    }

    if (modeChoice == 1) {
        double newPieces = getDoubleInput("\nEnter target production quantity in PIECES (or 0 to cancel): ", 0.0, 10000000.0, isCancelled);
        if (isCancelled || newPieces <= 0.0) {
            return;
        }
        ctx.activePlan.mode = PlanningMode::BY_PIECES;
        ctx.activePlan.targetPieces = newPieces;
        ctx.activePlan.targetBulkKg = (newPieces * prod.unitWeightGrams) / 1000.0;
    } else {
        double newKg = getDoubleInput("\nEnter target bulk batch weight in KILOGRAMS / KG (or 0 to cancel): ", 0.0, 50000.0, isCancelled);
        if (isCancelled || newKg <= 0.0) {
            return;
        }
        ctx.activePlan.mode = PlanningMode::BY_BULK_KG;
        ctx.activePlan.targetBulkKg = newKg;
        ctx.activePlan.targetPieces = (newKg * 1000.0) / prod.unitWeightGrams;
    }

    cout << "\n  " << Color::GREEN << Color::BOLD << "[✓] Target successfully updated to: "
         << fixed << setprecision(0) << ctx.activePlan.targetPieces << " PCS ("
         << fixed << setprecision(3) << ctx.activePlan.targetBulkKg << " KG bulk)"
         << Color::RESET << "\n";
    pressEnterToContinue();
}

// ==========================================
// SCREEN 4: EXECUTE BATCH PRODUCTION
// ==========================================

void showExecuteProductionScreen(AppContext& ctx) {
    clearScreen();
    Product prod = ctx.productCatalog[ctx.activePlan.activeFgCode];
    printBanner("EXECUTE PRODUCTION BATCH ISSUE", "Deduct stock from inventory & record stock card transactions");

    auto requirements = calculateActivePlanRequirements(ctx);
    int shortages = 0;
    for (const auto& r : requirements) {
        if (r.isShortage) shortages++;
    }

    cout << "  Product to Produce : " << Color::WHITE << Color::BOLD << prod.fgCode << " - " << prod.name << Color::RESET << "\n";
    cout << "  Target Batch Size  : " << Color::GREEN << Color::BOLD << fixed << setprecision(0) << ctx.activePlan.targetPieces << " PCS ("
         << fixed << setprecision(3) << ctx.activePlan.targetBulkKg << " KG bulk)" << Color::RESET << "\n";
    cout << "  Operator Assigned  : " << ctx.currentOperator << "\n";
    printDivider('-', 90);

    if (shortages > 0) {
        cout << "  " << Color::RED << Color::BOLD << "[!] WARNING: " << shortages << " material shortages detected for this batch.\n" << Color::RESET;
        cout << "  Proceeding with execution will drive short materials into negative balance.\n\n";
    } else {
        cout << "  " << Color::GREEN << Color::BOLD << "[✓] All materials are 100% available and ready for production issue.\n" << Color::RESET << "\n";
    }

    bool isCancelled = false;
    string defaultRef = "BATCH-" + toUpperString(prod.fgCode.substr(3, 5)) + "-" + to_string(static_cast<int>(ctx.activePlan.targetPieces)) + "PCS";
    cout << "  Enter Batch Number / Reference [Default: " << defaultRef << "]\n  (Case-insensitive, or enter '0' to Cancel): ";
    string batchInput = getStringInput("", true, isCancelled);

    if (isCancelled || batchInput == "0") {
        cout << "\n  [i] Batch execution cancelled.\n";
        pressEnterToContinue();
        return;
    }

    string batchRef = batchInput.empty() ? defaultRef : toUpperString(trimString(batchInput));

    cout << "  Enter Operator Name [Default: " << ctx.currentOperator << "]: ";
    string opInput = getStringInput("", true, isCancelled);
    string operatorName = opInput.empty() ? ctx.currentOperator : trimString(opInput);
    ctx.currentOperator = operatorName;

    bool confirm = getConfirmationInput("\n  Confirm issuing batch [" + batchRef + "] and deducting " + to_string(requirements.size()) + " material lines? [y/n]: ", true, isCancelled);
    if (isCancelled || !confirm) {
        cout << "\n  [i] Batch issue aborted. No inventory was deducted.\n";
        pressEnterToContinue();
        return;
    }

    string timestamp = getCurrentTimestamp();

    // Deduct stock and log into Stock Card transaction ledger
    for (const auto& r : requirements) {
        Material& mat = ctx.inventoryMaster[r.rmCode];
        double before = mat.stockOnHand;
        mat.stockOnHand -= r.requiredQty;
        double after = mat.stockOnHand;

        StockTransaction tx;
        tx.transactionId = ctx.nextTransactionId++;
        tx.timestamp = timestamp;
        tx.materialCode = mat.code;
        tx.materialName = mat.description;
        tx.type = TransactionType::STOCK_OUT;
        tx.category = TransactionCategory::PRODUCTION_ISSUE;
        tx.quantity = r.requiredQty;
        tx.balanceBefore = before;
        tx.balanceAfter = after;
        tx.uom = mat.uom;
        tx.referenceDoc = batchRef;
        tx.operatorName = operatorName;
        tx.notes = "Production Issue for " + to_string(static_cast<int>(ctx.activePlan.targetPieces)) + " pcs of " + prod.fgCode;

        ctx.transactionLedger.push_back(tx);
    }

    // Save batch record
    BatchRecord br = {
        batchRef,
        prod.fgCode,
        prod.name,
        timestamp,
        operatorName,
        ctx.activePlan.targetPieces,
        ctx.activePlan.targetBulkKg,
        BatchStatus::COMPLETED,
        static_cast<int>(requirements.size())
    };
    ctx.completedBatches.push_back(br);

    cout << "\n  " << Color::GREEN << Color::BOLD << "[✓] SUCCESS: Batch [" << batchRef << "] executed!" << Color::RESET << "\n";
    cout << "  Deducted " << requirements.size() << " material lines and generated permanent Stock Card ledger records.\n";
    pressEnterToContinue();
}

// ==========================================
// SCREEN 5: STOCK CARD ENTRY (OPERATOR INTERFACE)
// ==========================================

void showStockCardEntryScreen(AppContext& ctx) {
    clearScreen();
    printBanner("STOCK CARD - OPERATOR TRANSACTION ENTRY", "Key in Stock IN (Receipts) or Stock OUT (Issues / Scrap / Samples)");

    cout << "  Available Materials in Warehouse Registry:\n\n";
    for (size_t i = 0; i < ctx.materialOrder.size(); ++i) {
        string code = ctx.materialOrder[i];
        const Material& m = ctx.inventoryMaster[code];
        cout << "  [" << right << setw(2) << (i + 1) << "] "
             << left << setw(16) << m.code
             << setw(40) << (m.description.length() > 38 ? m.description.substr(0, 35) + "..." : m.description)
             << right << setw(12) << fixed << setprecision(m.uom == "KG" ? 3 : 0) << m.stockOnHand << " " << setw(3) << left << m.uom << "\n";
    }

    cout << "\n  " << Color::YELLOW << "[0] Back to Main Menu / Cancel\n" << Color::RESET;
    printDivider('-', 90);

    bool isCancelled = false;
    cout << "  Select by Item Number (1-" << ctx.materialOrder.size() << "), or type Code / Name Keyword (or 0 to cancel): ";
    string query = getStringInput("", false, isCancelled);

    if (isCancelled || query == "0" || query == "b" || query == "B") {
        return;
    }

    string resolvedCode = "";
    const Material* matchedMat = findMaterialByInput(ctx, query, resolvedCode);

    if (!matchedMat) {
        cout << "\n  " << Color::RED << "[!] No material found matching query '" << query << "'. Returning to menu.\n" << Color::RESET;
        pressEnterToContinue();
        return;
    }

    Material& mat = ctx.inventoryMaster[resolvedCode];

    clearScreen();
    printBanner("RECORD TRANSACTION FOR MATERIAL", mat.code + " - " + mat.description);

    cout << "  Current Stock On Hand : " << Color::GREEN << Color::BOLD << fixed << setprecision(mat.uom == "KG" ? 3 : 0) << mat.stockOnHand << " " << mat.uom << Color::RESET << "\n";
    cout << "  Unit of Measure (UOM) : " << mat.uom << "\n";
    cout << "  Procurement Lead Time : " << mat.leadTimeDays << " days\n";
    printDivider('-', 90);

    cout << "\n  Select Transaction Direction:\n";
    cout << "  " << Color::CYAN << "[1] STOCK IN (+)" << Color::RESET << " Purchase delivery, supplier shipment, inventory return/adjustment\n";
    cout << "  " << Color::CYAN << "[2] STOCK OUT (-)" << Color::RESET << " Production issue, QA lab sample, scrap, wastage, return to vendor\n";
    cout << "  " << Color::YELLOW << "[0] Cancel / Go Back\n" << Color::RESET;

    int dirChoice = getIntInput("\nSelect Direction [1-2] or [0] Cancel: ", 0, 2, isCancelled);
    if (isCancelled || dirChoice == 0) {
        return;
    }

    TransactionType txType = (dirChoice == 1) ? TransactionType::STOCK_IN : TransactionType::STOCK_OUT;
    TransactionCategory txCat = promptTransactionCategory(txType == TransactionType::STOCK_IN, isCancelled);
    if (isCancelled) return;

    double qty = getDoubleInput("\nEnter Transaction Quantity (" + mat.uom + ") or 0 to Cancel: ", 0.0, 10000000.0, isCancelled);
    if (isCancelled || qty <= 0.0) {
        return;
    }

    cout << "\nEnter Reference Document # (e.g. PO#9821, GRN-104, QA-TEST-01, SCRAP)\n(Case-insensitive, or '0' to Cancel): ";
    string refDoc = getStringInput("", true, isCancelled);
    if (isCancelled || refDoc == "0") return;
    if (refDoc.empty()) refDoc = (txType == TransactionType::STOCK_IN ? "PO-GENERAL" : "ISSUE-GENERAL");
    refDoc = toUpperString(refDoc);

    cout << "Enter Operator Name [Default: " << ctx.currentOperator << "]: ";
    string opName = getStringInput("", true, isCancelled);
    if (opName.empty()) opName = ctx.currentOperator;
    ctx.currentOperator = opName;

    cout << "Enter Transaction Note / Reason: ";
    string notes = getStringInput("", true, isCancelled);
    if (notes.empty()) notes = getTransactionCategoryName(txCat);

    double before = mat.stockOnHand;
    double after = (txType == TransactionType::STOCK_IN) ? (before + qty) : (before - qty);

    if (txType == TransactionType::STOCK_OUT && after < 0) {
        cout << "\n  " << Color::RED << Color::BOLD << "[!] Warning: This transaction will result in negative stock ("
             << fixed << setprecision(3) << after << " " << mat.uom << ").\n" << Color::RESET;
        bool proceed = getConfirmationInput("  Proceed anyway? [y/n]: ", false, isCancelled);
        if (isCancelled || !proceed) {
            cout << "\n  [i] Transaction cancelled by operator.\n";
            pressEnterToContinue();
            return;
        }
    }

    // Update master inventory
    mat.stockOnHand = after;

    // Log Stock Card entry
    StockTransaction tx;
    tx.transactionId = ctx.nextTransactionId++;
    tx.timestamp = getCurrentTimestamp();
    tx.materialCode = mat.code;
    tx.materialName = mat.description;
    tx.type = txType;
    tx.category = txCat;
    tx.quantity = qty;
    tx.balanceBefore = before;
    tx.balanceAfter = after;
    tx.uom = mat.uom;
    tx.referenceDoc = refDoc;
    tx.operatorName = opName;
    tx.notes = notes;

    ctx.transactionLedger.push_back(tx);

    cout << "\n  " << Color::GREEN << Color::BOLD << "[✓] STOCK TRANSACTION RECORDED SUCCESSFULLY" << Color::RESET << "\n";
    printDivider('-', 80);
    cout << "  Transaction ID : #" << tx.transactionId << "\n";
    cout << "  Timestamp      : " << tx.timestamp << "\n";
    cout << "  Material       : " << tx.materialCode << " (" << tx.materialName << ")\n";
    cout << "  Category       : " << getTransactionCategoryName(tx.category) << "\n";
    cout << "  Action         : " << (tx.type == TransactionType::STOCK_IN ? Color::GREEN + "STOCK IN (+)" : Color::RED + "STOCK OUT (-)") << Color::RESET << "\n";
    cout << "  Qty Transacted : " << fixed << setprecision(mat.uom == "KG" ? 4 : 0) << tx.quantity << " " << mat.uom << "\n";
    cout << "  Prev Balance   : " << fixed << setprecision(mat.uom == "KG" ? 3 : 0) << tx.balanceBefore << " " << mat.uom << "\n";
    cout << "  New Balance    : " << Color::CYAN << Color::BOLD << fixed << setprecision(mat.uom == "KG" ? 3 : 0) << tx.balanceAfter << " " << mat.uom << Color::RESET << "\n";
    cout << "  Reference Doc  : " << tx.referenceDoc << " (Operator: " << tx.operatorName << ")\n";
    cout << "  Notes          : " << tx.notes << "\n";
    printDivider('=', 80);
    pressEnterToContinue();
}

// ==========================================
// SCREEN 6: SEARCH TRANSACTION HISTORY
// ==========================================

void showTransactionHistoryScreen(AppContext& ctx) {
    while (true) {
        clearScreen();
        printBanner("STOCK CARD LEDGER - SEARCH TRANSACTION HISTORY", "Query audit trail by Item Code, Batch #, Operator, Category, or view ALL");

        cout << "  Total Transactions Recorded: " << ctx.transactionLedger.size() << " entries\n";
        cout << "  Enter Material Code, Batch #, Keyword (e.g. 'RM-SS001', 'BATCH', 'Wax', 'Adam', 'ALL')\n";
        cout << "  " << Color::YELLOW << "or enter '0' to return to Main Menu: " << Color::RESET;

        bool isCancelled = false;
        string query = getStringInput("", false, isCancelled);
        if (isCancelled || query == "0" || query == "b" || query == "B") {
            break;
        }

        string queryUpper = toUpperString(trimString(query));

        // Filter transactions (Case-insensitive)
        vector<StockTransaction> filtered;
        for (const auto& tx : ctx.transactionLedger) {
            string codeUpper = toUpperString(tx.materialCode);
            string nameUpper = toUpperString(tx.materialName);
            string refUpper = toUpperString(tx.referenceDoc);
            string opUpper = toUpperString(tx.operatorName);

            if (queryUpper == "ALL" ||
                codeUpper.find(queryUpper) != string::npos ||
                nameUpper.find(queryUpper) != string::npos ||
                refUpper.find(queryUpper) != string::npos ||
                opUpper.find(queryUpper) != string::npos) {
                filtered.push_back(tx);
            }
        }

        clearScreen();
        printBanner("SEARCH RESULTS: '" + query + "'", to_string(filtered.size()) + " transaction record(s) found");

        if (filtered.empty()) {
            cout << "  " << Color::YELLOW << "[i] No transactions found matching query '" << query << "'.\n" << Color::RESET;
            cout << "  (Try issuing a production batch or keying in a transaction first).\n";
        } else {
            printDivider('-', 124);
            cout << left << setw(8) << "Tx ID"
                 << setw(20) << "Date & Time"
                 << setw(16) << "Material Code"
                 << setw(10) << "Type"
                 << right << setw(14) << "Transacted"
                 << setw(15) << "Prev Balance"
                 << setw(15) << "New Balance"
                 << "  " << left << setw(14) << "Ref Doc"
                 << "Operator" << "\n";
            printDivider('-', 124);

            for (const auto& tx : filtered) {
                ostringstream qtyStr, beforeStr, afterStr;
                qtyStr << (tx.type == TransactionType::STOCK_IN ? "+" : "-")
                       << fixed << setprecision(tx.uom == "KG" ? 4 : 0) << tx.quantity << " " << tx.uom;
                beforeStr << fixed << setprecision(tx.uom == "KG" ? 3 : 0) << tx.balanceBefore << " " << tx.uom;
                afterStr << fixed << setprecision(tx.uom == "KG" ? 3 : 0) << tx.balanceAfter << " " << tx.uom;

                cout << left << setw(8) << tx.transactionId
                     << setw(20) << tx.timestamp
                     << setw(16) << tx.materialCode
                     << setw(10) << (tx.type == TransactionType::STOCK_IN ? Color::GREEN + "IN (+)" + Color::RESET : Color::RED + "OUT (-)" + Color::RESET)
                     << right << setw(14) << qtyStr.str()
                     << setw(15) << beforeStr.str()
                     << setw(15) << afterStr.str()
                     << "  " << left << setw(14) << (tx.referenceDoc.length() > 13 ? tx.referenceDoc.substr(0, 11) + ".." : tx.referenceDoc)
                     << tx.operatorName << "\n";
            }
            printDivider('=', 124);
        }

        cout << "\n  " << Color::YELLOW << "[1] Search Again" << Color::RESET << " | " << Color::YELLOW << "[0] Back to Main Menu\n" << Color::RESET;
        int nextAction = getIntInput("Choose [0-1]: ", 0, 1, isCancelled);
        if (isCancelled || nextAction == 0) {
            break;
        }
    }
}

// ==========================================
// SCREEN 7: MATERIAL MASTER & INVENTORY SUMMARY
// ==========================================

void showInventorySummaryScreen(AppContext& ctx) {
    clearScreen();
    printBanner("MATERIAL MASTER & WAREHOUSE INVENTORY SUMMARY", "Live inventory levels, measurement units, and procurement lead times");

    printDivider('-', 116);
    cout << left << setw(16) << "Material Code"
         << setw(40) << "Description"
         << setw(12) << "Category"
         << setw(10) << "Status"
         << right << setw(16) << "Stock On Hand"
         << setw(8) << "UOM"
         << setw(12) << "Lead Time" << "\n";
    printDivider('-', 116);

    double totalRmKg = 0.0;
    double totalPmPcs = 0.0;

    for (const auto& code : ctx.materialOrder) {
        const Material& m = ctx.inventoryMaster[code];
        if (m.uom == "KG") {
            totalRmKg += m.stockOnHand;
        } else {
            totalPmPcs += m.stockOnHand;
        }

        string catStr = (m.category == MaterialCategory::RAW_MATERIAL ? "Raw Material" : (m.category == MaterialCategory::PACKAGING_PRIMARY ? "Primary PM" : "Secondary PM"));

        cout << left << setw(16) << m.code
             << setw(40) << (m.description.length() > 38 ? m.description.substr(0, 35) + "..." : m.description)
             << setw(12) << catStr
             << setw(10) << (m.status == "ACTIVE" ? Color::GREEN + m.status + Color::RESET : Color::YELLOW + m.status + Color::RESET)
             << right << setw(16) << fixed << setprecision(m.uom == "KG" ? 3 : 0) << m.stockOnHand
             << setw(8) << m.uom
             << setw(9) << m.leadTimeDays << " d" << "\n";
    }

    printDivider('=', 116);
    cout << "  Master Registry Summary: " << ctx.materialOrder.size() << " registered materials\n";
    cout << "  Total Raw Material Mass: " << Color::CYAN << Color::BOLD << fixed << setprecision(3) << totalRmKg << " KG" << Color::RESET << "\n";
    cout << "  Total Packaging Units  : " << Color::CYAN << Color::BOLD << fixed << setprecision(0) << totalPmPcs << " PCS" << Color::RESET << "\n";
    printDivider('-', 116);

    pressEnterToContinue();
}

// ==========================================
// SCREEN 8: STOCK HEALTH ANALYTICS (SCM & REORDER RADAR)
// ==========================================

void showStockHealthAnalyticsScreen(AppContext& ctx) {
    clearScreen();
    printBanner("STOCK HEALTH & REORDER PLANNING ANALYTICS", "Stock Cover Months (SCM) vs Supplier Order Lead Times");

    printDivider('-', 124);
    cout << left << setw(16) << "Material Code"
         << setw(36) << "Description"
         << right << setw(12) << "Stock (SOH)"
         << setw(12) << "Monthly(AMU)"
         << setw(11) << "SCM (Mths)"
         << setw(11) << "Cover(Days)"
         << setw(10) << "LeadTime"
         << "   " << left << setw(14) << "Health Status" << "\n";
    printDivider('-', 124);

    int reorderCount = 0;
    int lowCount = 0;

    for (const auto& code : ctx.materialOrder) {
        const Material& m = ctx.inventoryMaster[code];
        StockHealthMetrics health = calculateStockHealth(m);

        if (health.healthStatus == "REORDER NOW") reorderCount++;
        if (health.healthStatus == "LOW STOCK") lowCount++;

        ostringstream sohStr, amuStr, scmStr, daysStr;
        sohStr << fixed << setprecision(m.uom == "KG" ? 1 : 0) << m.stockOnHand << " " << m.uom;
        amuStr << fixed << setprecision(m.uom == "KG" ? 1 : 0) << m.avgMonthlyUsage << " " << m.uom;
        scmStr << fixed << setprecision(1) << health.stockCoverMonths << " m";
        daysStr << fixed << setprecision(0) << health.stockCoverDays << " d";

        cout << left << setw(16) << m.code
             << setw(36) << (m.description.length() > 34 ? m.description.substr(0, 31) + "..." : m.description)
             << right << setw(12) << sohStr.str()
             << setw(12) << amuStr.str()
             << setw(11) << scmStr.str()
             << setw(11) << daysStr.str()
             << setw(8) << health.leadTimeDays << " d"
             << "   " << left << health.badgeColor << health.healthStatus << Color::RESET << "\n";
    }

    printDivider('=', 124);
    cout << "  Inventory Health Indicators:\n";
    cout << "  - " << Color::RED << Color::BOLD << "REORDER NOW (" << reorderCount << " items)" << Color::RESET
         << ": Stock Cover Days < Supplier Lead Time (Immediate PO required to prevent stockout)\n";
    cout << "  - " << Color::YELLOW << Color::BOLD << "LOW STOCK (" << lowCount << " items)" << Color::RESET
         << ": Stock cover within 3 weeks buffer of lead time\n";
    cout << "  - " << Color::GREEN << "HEALTHY (2–4 Months)" << Color::RESET << " | " << Color::MAGENTA << "OVERSTOCKED (>6 Months)" << Color::RESET << "\n";
    printDivider('-', 124);

    pressEnterToContinue();
}

// ==========================================
// SCREEN 9: EXPORT DATA TO CSV
// ==========================================

void exportDataToCsvScreen(AppContext& ctx) {
    clearScreen();
    printBanner("EXPORT DATA TO CSV FILES", "Export Stock Card Ledger and Material Inventory to Excel-ready CSV format");

    cout << "  Available Export Reports:\n";
    cout << "  " << Color::CYAN << "[1] Export Complete Stock Card Transaction Ledger" << Color::RESET << " -> stock_card_ledger.csv\n";
    cout << "  " << Color::CYAN << "[2] Export Material Master & SCM Stock Health Report" << Color::RESET << " -> inventory_health_report.csv\n";
    cout << "  " << Color::CYAN << "[3] Export Both Reports\n" << Color::RESET;
    cout << "  " << Color::YELLOW << "[0] Back to Main Menu\n" << Color::RESET;
    printDivider('-', 90);

    bool isCancelled = false;
    int choice = getIntInput("Select Export Option [0-3]: ", 0, 3, isCancelled);
    if (isCancelled || choice == 0) return;

    if (choice == 1 || choice == 3) {
        ofstream fLedger("stock_card_ledger.csv");
        if (fLedger.is_open()) {
            fLedger << "TransactionID,Timestamp,MaterialCode,MaterialName,Type,Category,Quantity,UOM,BalanceBefore,BalanceAfter,ReferenceDoc,Operator,Notes\n";
            for (const auto& tx : ctx.transactionLedger) {
                fLedger << tx.transactionId << ","
                        << "\"" << tx.timestamp << "\","
                        << "\"" << tx.materialCode << "\","
                        << "\"" << tx.materialName << "\","
                        << (tx.type == TransactionType::STOCK_IN ? "STOCK_IN" : "STOCK_OUT") << ","
                        << "\"" << getTransactionCategoryName(tx.category) << "\","
                        << tx.quantity << ","
                        << tx.uom << ","
                        << tx.balanceBefore << ","
                        << tx.balanceAfter << ","
                        << "\"" << tx.referenceDoc << "\","
                        << "\"" << tx.operatorName << "\","
                        << "\"" << tx.notes << "\"\n";
            }
            fLedger.close();
            cout << "  " << Color::GREEN << "[✓] Exported: stock_card_ledger.csv (" << ctx.transactionLedger.size() << " records)\n" << Color::RESET;
        }
    }

    if (choice == 2 || choice == 3) {
        ofstream fInv("inventory_health_report.csv");
        if (fInv.is_open()) {
            fInv << "MaterialCode,Description,Status,Category,StockOnHand,UOM,LeadTimeDays,AvgMonthlyUsage,StockCoverMonths,StockCoverDays,HealthStatus\n";
            for (const auto& code : ctx.materialOrder) {
                const Material& m = ctx.inventoryMaster[code];
                StockHealthMetrics h = calculateStockHealth(m);
                string catStr = (m.category == MaterialCategory::RAW_MATERIAL ? "Raw Material" : "Packaging");
                fInv << "\"" << m.code << "\","
                     << "\"" << m.description << "\","
                     << m.status << ","
                     << catStr << ","
                     << m.stockOnHand << ","
                     << m.uom << ","
                     << m.leadTimeDays << ","
                     << m.avgMonthlyUsage << ","
                     << h.stockCoverMonths << ","
                     << h.stockCoverDays << ","
                     << h.healthStatus << "\n";
            }
            fInv.close();
            cout << "  " << Color::GREEN << "[✓] Exported: inventory_health_report.csv (" << ctx.materialOrder.size() << " materials)\n" << Color::RESET;
        }
    }

    cout << "\n  Files saved in current working directory for direct viewing in Excel / Sheets.\n";
    pressEnterToContinue();
}

// ==========================================
// FLEXIBLE MATERIAL SEARCH HELPER
// ==========================================

const Material* findMaterialByInput(const AppContext& ctx, const string& inputQuery, string& resolvedCode) {
    string q = trimString(inputQuery);
    if (q.empty()) return nullptr;

    // 1. Try numeric index
    try {
        size_t idx = stoi(q);
        if (idx >= 1 && idx <= ctx.materialOrder.size()) {
            resolvedCode = ctx.materialOrder[idx - 1];
            return &ctx.inventoryMaster.at(resolvedCode);
        }
    } catch (...) {}

    // 2. Try exact material code (case-insensitive)
    string qNorm = normalizeCode(q);
    for (const auto& code : ctx.materialOrder) {
        if (normalizeCode(code) == qNorm) {
            resolvedCode = code;
            return &ctx.inventoryMaster.at(code);
        }
    }

    // 3. Try code prefix / substring
    string qUpper = toUpperString(q);
    for (const auto& code : ctx.materialOrder) {
        if (toUpperString(code).find(qUpper) != string::npos) {
            resolvedCode = code;
            return &ctx.inventoryMaster.at(code);
        }
    }

    // 4. Try material description keyword
    for (const auto& code : ctx.materialOrder) {
        const Material& m = ctx.inventoryMaster.at(code);
        if (toUpperString(m.description).find(qUpper) != string::npos) {
            resolvedCode = code;
            return &ctx.inventoryMaster.at(code);
        }
    }

    return nullptr;
}

// ==========================================
// CATEGORY HELPERS
// ==========================================

string getTransactionCategoryName(TransactionCategory cat) {
    switch (cat) {
        case TransactionCategory::PURCHASE_RECEIPT: return "Purchase Receipt (PO Delivery)";
        case TransactionCategory::PRODUCTION_ISSUE: return "Production Batch Issue";
        case TransactionCategory::QUALITY_CONTROL_SAMPLE: return "QC / Lab Sample Testing";
        case TransactionCategory::SCRAP_WASTAGE: return "Damaged / Scrap Wastage";
        case TransactionCategory::CYCLE_COUNT_ADJUSTMENT: return "Cycle Count Adjustment";
        case TransactionCategory::RETURN_TO_VENDOR: return "Return to Vendor (RTV)";
        default: return "General Transaction";
    }
}

TransactionCategory promptTransactionCategory(bool isStockIn, bool& isCancelled) {
    isCancelled = false;
    cout << "\n  Select Transaction Category Reason:\n";
    if (isStockIn) {
        cout << "  [1] Purchase Receipt (PO Delivery from Vendor)\n";
        cout << "  [2] Inventory Return / Restock\n";
        cout << "  [3] Physical Count / Audit Surplus (+)\n";
        cout << "  [0] Cancel\n";
        int c = getIntInput("Select Category [0-3]: ", 0, 3, isCancelled);
        if (isCancelled || c == 0) { isCancelled = true; return TransactionCategory::GENERAL_TRANSACTION; }
        if (c == 1) return TransactionCategory::PURCHASE_RECEIPT;
        if (c == 2) return TransactionCategory::GENERAL_TRANSACTION;
        return TransactionCategory::CYCLE_COUNT_ADJUSTMENT;
    } else {
        cout << "  [1] Production Batch Issue\n";
        cout << "  [2] QC / Lab Sample Testing\n";
        cout << "  [3] Damaged / Scrap Wastage Write-Off\n";
        cout << "  [4] Cycle Count Discrepancy (-)\n";
        cout << "  [5] Return to Vendor (RTV)\n";
        cout << "  [0] Cancel\n";
        int c = getIntInput("Select Category [0-5]: ", 0, 5, isCancelled);
        if (isCancelled || c == 0) { isCancelled = true; return TransactionCategory::GENERAL_TRANSACTION; }
        if (c == 1) return TransactionCategory::PRODUCTION_ISSUE;
        if (c == 2) return TransactionCategory::QUALITY_CONTROL_SAMPLE;
        if (c == 3) return TransactionCategory::SCRAP_WASTAGE;
        if (c == 4) return TransactionCategory::CYCLE_COUNT_ADJUSTMENT;
        return TransactionCategory::RETURN_TO_VENDOR;
    }
}

// ==========================================
// BULLETPROOF INPUT VALIDATION & UI UTILITIES
// ==========================================

void clearScreen() {
    cout << "\033[2J\033[1;1H\033[3J";
    cout.flush();
}

void pressEnterToContinue() {
    cout << "\n" << Color::WHITE << Color::BOLD << "  Press [Enter] to continue..." << Color::RESET;
    cin.clear();
    while (cin.get() != '\n') {
        // Discard
    }
}

void printBanner(const string& title, const string& subtitle) {
    printDivider('=', 114);
    cout << Color::CYAN << Color::BOLD << "  " << title << Color::RESET << "\n";
    if (!subtitle.empty()) {
        cout << Color::WHITE << "  " << subtitle << Color::RESET << "\n";
    }
    printDivider('=', 114);
    cout << "\n";
}

void printDivider(char ch, int length) {
    cout << string(length, ch) << "\n";
}

string formatDouble(double value, int precision) {
    ostringstream oss;
    oss << fixed << setprecision(precision) << value;
    return oss.str();
}

string getCurrentTimestamp() {
    time_t rawTime;
    time(&rawTime);
    struct tm* timeInfo = localtime(&rawTime);
    char buffer[64];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeInfo);
    return string(buffer);
}

string trimString(const string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

string toUpperString(const string& str) {
    string result = str;
    transform(result.begin(), result.end(), result.begin(), [](unsigned char c) {
        return toupper(c);
    });
    return result;
}

string toLowerString(const string& str) {
    string result = str;
    transform(result.begin(), result.end(), result.begin(), [](unsigned char c) {
        return tolower(c);
    });
    return result;
}

string normalizeCode(const string& str) {
    string res = toUpperString(trimString(str));
    // Strip leading/trailing slashes or spaces
    return res;
}

int getIntInput(const string& prompt, int minVal, int maxVal, bool& isCancelled) {
    isCancelled = false;
    while (true) {
        cout << prompt;
        string line;
        if (!getline(cin, line)) {
            isCancelled = true;
            return 0;
        }

        line = trimString(line);
        if (line.empty()) {
            cout << Color::YELLOW << "  [!] Input cannot be empty. Please enter a valid number.\n" << Color::RESET;
            continue;
        }

        string lLower = toLowerString(line);
        if (lLower == "b" || lLower == "back" || lLower == "cancel" || lLower == "q" || lLower == "exit") {
            isCancelled = true;
            return 0;
        }

        try {
            int val = stoi(line);
            if (val >= minVal && val <= maxVal) {
                return val;
            } else {
                cout << Color::YELLOW << "  [!] Out of range. Please enter a number between " << minVal << " and " << maxVal << ".\n" << Color::RESET;
            }
        } catch (...) {
            cout << Color::YELLOW << "  [!] Invalid number format. Please enter digits only.\n" << Color::RESET;
        }
    }
}

double getDoubleInput(const string& prompt, double minVal, double maxVal, bool& isCancelled) {
    isCancelled = false;
    while (true) {
        cout << prompt;
        string line;
        if (!getline(cin, line)) {
            isCancelled = true;
            return 0.0;
        }

        line = trimString(line);
        if (line.empty()) {
            cout << Color::YELLOW << "  [!] Input cannot be empty. Please enter a valid number.\n" << Color::RESET;
            continue;
        }

        string lLower = toLowerString(line);
        if (lLower == "b" || lLower == "back" || lLower == "cancel" || lLower == "q" || lLower == "exit") {
            isCancelled = true;
            return 0.0;
        }

        try {
            double val = stod(line);
            if (val >= minVal && val <= maxVal) {
                return val;
            } else {
                cout << Color::YELLOW << "  [!] Out of range. Please enter a number between " << minVal << " and " << maxVal << ".\n" << Color::RESET;
            }
        } catch (...) {
            cout << Color::YELLOW << "  [!] Invalid decimal number. Please enter digits only (e.g. 25.5).\n" << Color::RESET;
        }
    }
}

string getStringInput(const string& prompt, bool allowEmpty, bool& isCancelled) {
    isCancelled = false;
    if (!prompt.empty()) {
        cout << prompt;
    }
    string line;
    if (!getline(cin, line)) {
        isCancelled = true;
        return "";
    }
    line = trimString(line);
    if (!allowEmpty && line.empty()) {
        cout << Color::YELLOW << "  [!] Text input cannot be empty.\n" << Color::RESET;
        return getStringInput(prompt, allowEmpty, isCancelled);
    }
    return line;
}

bool getConfirmationInput(const string& prompt, bool defaultYes, bool& isCancelled) {
    isCancelled = false;
    cout << prompt;
    string line;
    if (!getline(cin, line)) {
        isCancelled = true;
        return false;
    }

    line = toLowerString(trimString(line));
    if (line.empty()) {
        return defaultYes;
    }

    if (line == "y" || line == "yes" || line == "1" || line == "true" || line == "ok") {
        return true;
    }
    if (line == "n" || line == "no" || line == "0" || line == "false" || line == "cancel") {
        return false;
    }

    return defaultYes;
}
