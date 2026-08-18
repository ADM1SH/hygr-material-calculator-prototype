#!/usr/bin/env python3
"""
HYGR Material Requirement Calculator & Stock Card System
Backend Server (Zero-dependency Python 3 with built-in http.server and openpyxl)

Compliant with Industrial Minimalism Specification (DESIGN.md)
"""

import os
import sys
import json
import time
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import openpyxl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, "Bom Example.xlsx")
PORT = 8080

# In-memory application state
APP_STATE = {
    "products": {},
    "product_order": [],
    "materials": {},
    "material_order": [],
    "boms": {},
    "ledger": [],
    "batches": [],
    "active_plan": {
        "fg_code": "FG-LB015/109",
        "mode": "BY_PIECES",
        "target_pieces": 400.0,
        "target_bulk_kg": 2.000,
        "batch_ref": "BATCH-BC-400PCS",
        "operator_name": "Operator Adam",
        "yield_buffer_percent": 0.0
    },
    "next_tx_id": 1001
}

def load_data_from_excel():
    """Extract master materials, finished goods, and BOM recipe directly from Excel file."""
    global APP_STATE

    # Master Finished Goods from Excel
    APP_STATE["products"] = {
        "FG-LB015/109": {
            "fg_code": "FG-LB015/109",
            "name": "Lip Balm Paper (Black Cherry) 5g",
            "category": "Lip Care",
            "unit_weight_grams": 5.0,
            "sfg_batch_weight_grams": 1500.0,
            "description": "Deep moisturizing lip balm with natural waxes and Black Cherry tint."
        }
    }
    APP_STATE["product_order"] = ["FG-LB015/109"]

    materials = {}
    material_order = []
    bom_black_cherry = []

    # Monthly usage estimates to calculate Stock Cover Months (SCM)
    amu_defaults = {
        "RM-SS001/005": 30.0,
        "RM-CO007/054": 1.5,
        "RM-L004/011": 20.0,
        "RM-CO004/043": 1.8,
        "RM-CO002/027": 15.0,
        "RM-SS004/020": 10.0,
        "RM-L005/028": 5.0,
        "RM-SS003/012": 35.0,
        "RM-L001/001": 60.0,
        "RM-CO003/031": 4.0,
        "RM-EO006/023": 2.5,
        "RM-L022/069": 25.0,
        "RM-L003/010": 12.0,
        "RM-SS007/075": 50.0,
        "PM-T031/277": 5000.0,
        "PM-BO101/247": 5000.0
    }

    if os.path.exists(EXCEL_PATH):
        try:
            wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
            
            # 1. Parse 'Raw Material List' sheet
            if "Raw Material List" in wb.sheetnames:
                ws_rm = wb["Raw Material List"]
                for r in range(2, ws_rm.max_row + 1):
                    code = ws_rm.cell(r, 1).value
                    if not code:
                        continue
                    desc = ws_rm.cell(r, 2).value or ""
                    status = ws_rm.cell(r, 3).value or "ACTIVE"
                    lead_time = ws_rm.cell(r, 4).value or 0
                    soh = ws_rm.cell(r, 5).value or 0.0
                    subgroup = ws_rm.cell(r, 8).value or ""
                    
                    is_pm = str(code).startswith("PM")
                    uom = "PCS" if is_pm else "KG"
                    cat = "PACKAGING_PRIMARY" if "Primary" in subgroup else ("PACKAGING_SECONDARY" if is_pm else "RAW_MATERIAL")
                    amu = amu_defaults.get(str(code), 10.0 if not is_pm else 2000.0)

                    materials[str(code)] = {
                        "code": str(code),
                        "description": str(desc),
                        "status": str(status),
                        "lead_time_days": int(lead_time),
                        "stock_on_hand": float(soh),
                        "uom": uom,
                        "category": cat,
                        "subgroup": str(subgroup),
                        "avg_monthly_usage": float(amu)
                    }
                    material_order.append(str(code))

            # 2. Parse 'bom' sheet
            if "bom" in wb.sheetnames:
                ws_bom = wb["bom"]
                for r in range(2, ws_bom.max_row + 1):
                    fg_code = ws_bom.cell(r, 1).value
                    if not fg_code:
                        continue
                    rm_code = ws_bom.cell(r, 3).value
                    recipe_qty = ws_bom.cell(r, 4).value or 0.0
                    uom = ws_bom.cell(r, 5).value or "GM"
                    rm_name = ws_bom.cell(r, 6).value or ""
                    sfg_total = ws_bom.cell(r, 7).value or 1500.0
                    unit_size = ws_bom.cell(r, 8).value or 5.0
                    usage_per_pc = ws_bom.cell(r, 9).value

                    if usage_per_pc is None or str(usage_per_pc).startswith("="):
                        if str(uom).upper() == "GM":
                            usage_per_pc = (float(recipe_qty) / float(sfg_total)) * float(unit_size)
                        else:
                            usage_per_pc = 1.0

                    bom_black_cherry.append({
                        "fg_code": str(fg_code),
                        "rm_code": str(rm_code),
                        "rm_name": str(rm_name),
                        "recipe_qty": float(recipe_qty),
                        "uom": str(uom),
                        "sfg_total_output": float(sfg_total),
                        "unit_size": float(unit_size),
                        "usage_per_piece": float(usage_per_pc)
                    })

        except Exception as e:
            print(f"[!] Warning reading Excel file: {e}")

    APP_STATE["materials"] = materials
    APP_STATE["material_order"] = material_order
    APP_STATE["boms"] = {
        "FG-LB015/109": bom_black_cherry
    }
    APP_STATE["active_plan"]["fg_code"] = "FG-LB015/109"
    APP_STATE["ledger"] = []
    APP_STATE["batches"] = []
    APP_STATE["next_tx_id"] = 1001

def calculate_plan_requirements(fg_code, target_pieces, buffer_percent=0.0):
    """Compute exact material demand matching the Excel calculation logic."""
    boms = APP_STATE["boms"].get(fg_code, [])
    materials = APP_STATE["materials"]
    
    multiplier = 1.0 + (buffer_percent / 100.0)
    rows = []
    shortage_count = 0
    total_rm_kg = 0.0
    total_pm_pcs = 0.0

    for item in boms:
        rm_code = item["rm_code"]
        mat = materials.get(rm_code)
        if not mat:
            continue

        if mat["category"] == "RAW_MATERIAL":
            # Usage per piece in grams * pieces * buffer / 1000 -> in KG
            req_grams = item["usage_per_piece"] * target_pieces * multiplier
            req_qty = req_grams / 1000.0
            req_uom = "KG"
            total_rm_kg += req_qty
        else:
            req_qty = float(int(item["usage_per_piece"] * target_pieces * multiplier + 0.9999))
            req_uom = "PCS"
            total_pm_pcs += req_qty

        bal_after = mat["stock_on_hand"] - req_qty
        is_short = bal_after < 0.0
        deficit = (req_qty - mat["stock_on_hand"]) if is_short else 0.0

        if is_short:
            shortage_count += 1

        rows.append({
            "rm_code": rm_code,
            "rm_name": mat["description"],
            "recipe_qty": item["recipe_qty"],
            "recipe_uom": item["uom"],
            "usage_per_piece": item["usage_per_piece"],
            "required_qty": req_qty,
            "required_uom": req_uom,
            "stock_on_hand": mat["stock_on_hand"],
            "balance_after": bal_after,
            "is_shortage": is_short,
            "deficit": deficit,
            "category": mat["category"],
            "lead_time_days": mat["lead_time_days"]
        })

    return {
        "rows": rows,
        "shortage_count": shortage_count,
        "total_rm_kg": total_rm_kg,
        "total_pm_pcs": total_pm_pcs,
        "is_sufficient": (shortage_count == 0)
    }

class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/state":
            self.handle_get_state()
        elif path == "/api/export/ledger.csv":
            self.handle_export_ledger()
        elif path == "/api/export/inventory.csv":
            self.handle_export_inventory()
        else:
            # Serve static files (HTML, CSS, JS) with no-cache headers
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if path == "/api/plan":
            self.handle_update_plan(data)
        elif path == "/api/batch/issue":
            self.handle_issue_batch(data)
        elif path == "/api/transaction":
            self.handle_create_transaction(data)
        elif path == "/api/reset":
            self.handle_reset_data()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_get_state(self):
        plan = APP_STATE["active_plan"]
        reqs = calculate_plan_requirements(plan["fg_code"], plan["target_pieces"], plan.get("yield_buffer_percent", 0.0))
        
        response = {
            "products": APP_STATE["products"],
            "product_order": APP_STATE["product_order"],
            "materials": APP_STATE["materials"],
            "material_order": APP_STATE["material_order"],
            "boms": APP_STATE["boms"],
            "ledger": APP_STATE["ledger"],
            "batches": APP_STATE["batches"],
            "active_plan": APP_STATE["active_plan"],
            "calculation": reqs,
            "recent_batch_summary": APP_STATE.get("recent_batch_summary", None),
            "server_time": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.send_json_response(response)

    def handle_update_plan(self, data):
        plan = APP_STATE["active_plan"]
        if "fg_code" in data and data["fg_code"] in APP_STATE["products"]:
            plan["fg_code"] = data["fg_code"]
        
        if "mode" in data:
            plan["mode"] = data["mode"]

        unit_weight = APP_STATE["products"][plan["fg_code"]]["unit_weight_grams"]

        if plan["mode"] == "BY_PIECES":
            if "target_pieces" in data and float(data["target_pieces"]) > 0:
                plan["target_pieces"] = float(data["target_pieces"])
                plan["target_bulk_kg"] = (plan["target_pieces"] * unit_weight) / 1000.0
        else:
            if "target_bulk_kg" in data and float(data["target_bulk_kg"]) > 0:
                plan["target_bulk_kg"] = float(data["target_bulk_kg"])
                plan["target_pieces"] = (plan["target_bulk_kg"] * 1000.0) / unit_weight

        if "yield_buffer_percent" in data:
            plan["yield_buffer_percent"] = max(0.0, float(data["yield_buffer_percent"]))

        if "operator_name" in data and data["operator_name"]:
            plan["operator_name"] = str(data["operator_name"]).strip()

        if "batch_ref" in data and data["batch_ref"]:
            plan["batch_ref"] = str(data["batch_ref"]).strip().upper()

        self.handle_get_state()

    def handle_issue_batch(self, data):
        plan = APP_STATE["active_plan"]
        fg_code = plan["fg_code"]
        target_pieces = plan["target_pieces"]
        buffer_pct = plan.get("yield_buffer_percent", 0.0)
        
        batch_ref = str(data.get("batch_ref", plan.get("batch_ref", "BATCH-01"))).strip().upper()
        operator_name = str(data.get("operator_name", plan.get("operator_name", "Operator Adam"))).strip()
        
        calc = calculate_plan_requirements(fg_code, target_pieces, buffer_pct)
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        # Deduct inventory & record Stock Card OUT transactions
        for row in calc["rows"]:
            code = row["rm_code"]
            mat = APP_STATE["materials"][code]
            before = mat["stock_on_hand"]
            mat["stock_on_hand"] -= row["required_qty"]
            after = mat["stock_on_hand"]

            tx = {
                "transaction_id": APP_STATE["next_tx_id"],
                "timestamp": timestamp,
                "material_code": mat["code"],
                "material_name": mat["description"],
                "type": "STOCK_OUT",
                "category": "Production Batch Issue",
                "quantity": row["required_qty"],
                "balance_before": before,
                "balance_after": after,
                "uom": mat["uom"],
                "reference_doc": batch_ref,
                "operator_name": operator_name,
                "notes": f"Production Issue: {int(target_pieces)} pcs of {fg_code}"
            }
            APP_STATE["next_tx_id"] += 1
            APP_STATE["ledger"].insert(0, tx) # Latest first

        # Record batch run
        batch_record = {
            "batch_number": batch_ref,
            "fg_code": fg_code,
            "fg_name": APP_STATE["products"][fg_code]["name"],
            "timestamp": timestamp,
            "operator_name": operator_name,
            "target_pieces": target_pieces,
            "bulk_kg": plan["target_bulk_kg"],
            "status": "COMPLETED",
            "material_lines": len(calc["rows"])
        }
        APP_STATE["batches"].insert(0, batch_record)

        # Finished good stock increment
        prod = APP_STATE["products"].get(fg_code)
        if prod:
            prod["stock_on_hand"] = prod.get("stock_on_hand", 0.0) + target_pieces

        APP_STATE["recent_batch_summary"] = {
            "batch_number": batch_ref,
            "fg_code": fg_code,
            "target_pieces": target_pieces,
            "timestamp": timestamp,
            "material_lines_deducted": len(calc["rows"]),
            "total_rm_kg_deducted": calc["total_rm_kg"],
            "total_pm_pcs_deducted": calc["total_pm_pcs"]
        }

        self.handle_get_state()

    def handle_create_transaction(self, data):
        code = str(data.get("material_code", "")).strip().upper()
        if code not in APP_STATE["materials"]:
            self.send_error(400, "Invalid material code")
            return

        mat = APP_STATE["materials"][code]
        tx_type = str(data.get("type", "STOCK_IN")).upper()
        category = str(data.get("category", "General Adjustment"))
        qty = float(data.get("quantity", 0.0))
        ref_doc = str(data.get("reference_doc", "MANUAL")).strip().upper()
        operator = str(data.get("operator_name", "Operator")).strip()
        notes = str(data.get("notes", "")).strip()

        if qty <= 0:
            self.send_error(400, "Quantity must be greater than zero")
            return

        before = mat["stock_on_hand"]
        after = (before + qty) if tx_type == "STOCK_IN" else (before - qty)
        mat["stock_on_hand"] = after

        tx = {
            "transaction_id": APP_STATE["next_tx_id"],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "material_code": mat["code"],
            "material_name": mat["description"],
            "type": tx_type,
            "category": category,
            "quantity": qty,
            "balance_before": before,
            "balance_after": after,
            "uom": mat["uom"],
            "reference_doc": ref_doc,
            "operator_name": operator,
            "notes": notes
        }
        APP_STATE["next_tx_id"] += 1
        APP_STATE["ledger"].insert(0, tx)

        self.handle_get_state()

    def handle_reset_data(self):
        load_data_from_excel()
        self.handle_get_state()

    def handle_export_ledger(self):
        csv_content = "Transaction ID,Timestamp,Material Code,Material Name,Type,Category,Quantity,UOM,Balance Before,Balance After,Reference Doc,Operator,Notes\n"
        for tx in APP_STATE["ledger"]:
            csv_content += f"{tx['transaction_id']},\"{tx['timestamp']}\",\"{tx['material_code']}\",\"{tx['material_name']}\",{tx['type']},\"{tx['category']}\",{tx['quantity']},{tx['uom']},{tx['balance_before']},{tx['balance_after']},\"{tx['reference_doc']}\",\"{tx['operator_name']}\",\"{tx['notes']}\"\n"

        self.send_response(200)
        self.send_header('Content-Type', 'text/csv; charset=utf-8')
        self.send_header('Content-Disposition', 'attachment; filename="stock_card_ledger.csv"')
        self.end_headers()
        self.wfile.write(csv_content.encode('utf-8'))

    def handle_export_inventory(self):
        csv_content = "Material Code,Description,Status,Category,Stock On Hand,UOM,Lead Time (Days),Avg Monthly Usage,Stock Cover (Months),Stock Cover (Days),Health Status\n"
        for code in APP_STATE["material_order"]:
            m = APP_STATE["materials"][code]
            amu = m["avg_monthly_usage"]
            scm = (m["stock_on_hand"] / amu) if amu > 0 else 99.0
            days = scm * 30.0
            
            status = "HEALTHY"
            if days <= m["lead_time_days"]:
                status = "REORDER NOW"
            elif days <= m["lead_time_days"] + 21:
                status = "LOW STOCK"
            elif scm > 6.0:
                status = "OVERSTOCKED"

            cat_str = "Raw Material" if m["category"] == "RAW_MATERIAL" else "Packaging"
            csv_content += f"\"{m['code']}\",\"{m['description']}\",{m['status']},{cat_str},{m['stock_on_hand']},{m['uom']},{m['lead_time_days']},{amu},{scm:.1f},{days:.0f},{status}\n"

        self.send_response(200)
        self.send_header('Content-Type', 'text/csv; charset=utf-8')
        self.send_header('Content-Disposition', 'attachment; filename="inventory_health_report.csv"')
        self.end_headers()
        self.wfile.write(csv_content.encode('utf-8'))

    def send_json_response(self, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(payload)

def run():
    load_data_from_excel()
    server = ThreadingHTTPServer(('0.0.0.0', PORT), RequestHandler)
    print(f"=================================================================")
    print(f"  HYGR Material Requirement Calculator & Stock Card Prototype")
    print(f"  Design Spec : Industrial Minimalism (DESIGN.md)")
    print(f"  Web Server  : http://localhost:{PORT}")
    print(f"=================================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()

if __name__ == '__main__':
    run()
