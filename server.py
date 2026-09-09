#!/usr/bin/env python3
"""
HYGR Material Requirement Calculator & Stock Card System
Backend Server (Zero-dependency Python 3 with built-in http.server and openpyxl)

Compliant with Industrial Minimalism Specification (DESIGN.md)
Provides Multi-SKU Weekly Production Planning, Chronological Stock Runout Simulation,
Editable BOM Mass Deduction Staging, and Two-Tier Access Control.
"""

import os
import sys
import json
import time
import math
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import openpyxl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, "Bom Example.xlsx")
SCHEDULE_EXCEL_PATH = "/Users/adamanwar/Downloads/13.1.2025 HYGR Production Schedule.xlsx"
PORT = 8080

APP_STATE = {
    "products": {},
    "product_order": [],
    "materials": {},
    "material_order": [],
    "substitutes": {},
    "boms": {},
    "ledger": [],
    "batches": [],
    "weekly_plan": [],
    "user_role": "admin",
    "next_tx_id": 1001,
    "next_batch_id": 1,
    "recent_batch_summary": None
}

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

def get_base_substitutes():
    return {
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
    }

def get_master_products():
    return {
        "FG-LB015/109": {
            "fg_code": "FG-LB015/109",
            "name": "Lip Balm Paper (Black Cherry) 5g",
            "category": "Lip Care",
            "unit_weight_grams": 5.0,
            "sfg_batch_weight_grams": 1500.0,
            "stock_on_hand": 340.0,
            "description": "Standard 5g lip balm paper packaging with Black Cherry tint."
        },
        "FG-LB008/040": {
            "fg_code": "FG-LB008/040",
            "name": "Lip Balm Coral Red (Refill) 4g",
            "category": "Lip Care",
            "unit_weight_grams": 4.0,
            "sfg_batch_weight_grams": 1500.0,
            "stock_on_hand": 120.0,
            "description": "Natural tinted lip balm refill 4g with Coral Red tint."
        },
        "FG-LB005/037": {
            "fg_code": "FG-LB005/037",
            "name": "Lip Balm Raw Paper 5g",
            "category": "Lip Care",
            "unit_weight_grams": 5.0,
            "sfg_batch_weight_grams": 1500.0,
            "stock_on_hand": 450.0,
            "description": "Raw unflavored nourishing lip balm 5g paper tube."
        },
        "FG-LB037/281": {
            "fg_code": "FG-LB037/281",
            "name": "Lip Balm Sandstone / Sunkissed Paper 5g",
            "category": "Lip Care",
            "unit_weight_grams": 5.0,
            "sfg_batch_weight_grams": 1500.0,
            "stock_on_hand": 210.0,
            "description": "Sunkissed warm pigment tint 5g lip balm."
        },
        "FG-LB038/282": {
            "fg_code": "FG-LB038/282",
            "name": "Lip Balm Rose Quartz / Pink Rose (Refill) 4g",
            "category": "Lip Care",
            "unit_weight_grams": 4.0,
            "sfg_batch_weight_grams": 1500.0,
            "stock_on_hand": 90.0,
            "description": "Natural Pink Rose tint 4g refill balm."
        },
        "FG-D017/017": {
            "fg_code": "FG-D017/017",
            "name": "Deodorant Zen 40g",
            "category": "Deodorant",
            "unit_weight_grams": 40.0,
            "sfg_batch_weight_grams": 51000.0,
            "stock_on_hand": 480.0,
            "description": "Natural deodorant stick with Bergamot, Citrus Verbena, and Patchouli."
        },
        "FG-D001/001": {
            "fg_code": "FG-D001/001",
            "name": "Deodorant Citrus 25g",
            "category": "Deodorant",
            "unit_weight_grams": 25.0,
            "sfg_batch_weight_grams": 34000.0,
            "stock_on_hand": 310.0,
            "description": "Zesty citrus essential oil blend in compact 25g stick."
        },
        "FG-D026/073": {
            "fg_code": "FG-D026/073",
            "name": "Deodorant Creme Cloud 40g",
            "category": "Deodorant",
            "unit_weight_grams": 40.0,
            "sfg_batch_weight_grams": 51000.0,
            "stock_on_hand": 520.0,
            "description": "Gentle gourmand vanilla and coconut deodorant formulation."
        },
        "FG-D003/003": {
            "fg_code": "FG-D003/003",
            "name": "Deodorant Rose Geranium 25g",
            "category": "Deodorant",
            "unit_weight_grams": 25.0,
            "sfg_batch_weight_grams": 34000.0,
            "stock_on_hand": 200.0,
            "description": "Floral rose geranium natural deodorant."
        },
        "FG-D004/004": {
            "fg_code": "FG-D004/004",
            "name": "Deodorant Lavender 25g",
            "category": "Deodorant",
            "unit_weight_grams": 25.0,
            "sfg_batch_weight_grams": 34000.0,
            "stock_on_hand": 180.0,
            "description": "Calming French lavender and rose natural deodorant 25g."
        },
        "FG-D006/006": {
            "fg_code": "FG-D006/006",
            "name": "Deodorant Woody 40g",
            "category": "Deodorant",
            "unit_weight_grams": 40.0,
            "sfg_batch_weight_grams": 51000.0,
            "stock_on_hand": 150.0,
            "description": "Crisp Siberian fir needle woody deodorant stick."
        },
        "FG-HO001/056": {
            "fg_code": "FG-HO001/056",
            "name": "Natural Hair Oil 30ml",
            "category": "Hair Care",
            "unit_weight_grams": 30.0,
            "sfg_batch_weight_grams": 40000.0,
            "stock_on_hand": 410.0,
            "description": "Argan, Jojoba, and Rosemary stimulating hair nourishment oil."
        },
        "FG-SB001/050": {
            "fg_code": "FG-SB001/050",
            "name": "Lip Scrub 15g",
            "category": "Lip Care",
            "unit_weight_grams": 15.0,
            "sfg_batch_weight_grams": 10000.0,
            "stock_on_hand": 260.0,
            "description": "Exfoliating cellulose and avocado oil gentle lip polish."
        }
    }

def get_master_boms():
    # Formulas expressed in grams per 1000g of Bulk Semi-Finished Goods (SFG)
    # Packaging items expressed in pieces per piece (1.0)
    
    # 1. Lip Balm Base (per 1kg):
    lip_base = [
        {"rm_code": "RM-L001/001", "rm_name": "Palmester 3595 [MCT Oil] (190KG/DRUM)", "g_per_kg": 280.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-SS003/012", "rm_name": "Beeswax (25KG/DRUM)", "g_per_kg": 200.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-L004/011", "rm_name": "Avocado Oil Cosmetic (23KG/TONG)", "g_per_kg": 170.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-L022/069", "rm_name": "Jojoba Oil Golden (23KG/TONG)", "g_per_kg": 170.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-SS007/075", "rm_name": "Shea Butter Refined TYP EPR (25KG/CTN)", "g_per_kg": 75.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-SS001/005", "rm_name": "KAHLWAX 2039L CANDELILA WAX", "g_per_kg": 60.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-SS004/020", "rm_name": "Akogel (20KG/BAG)", "g_per_kg": 50.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-L005/028", "rm_name": "Primalhyal Gold (Hyaluronic Acid) (5KG/TONG)", "g_per_kg": 18.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-EO006/023", "rm_name": "Green Mandarin Essential Oil (5KG/BTL)", "g_per_kg": 18.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-L003/010", "rm_name": "Vitamin E Acetate - Care (5KG/TONG)", "g_per_kg": 10.0, "category": "RAW_MATERIAL"}
    ]

    # 2. Deodorant Base (per 1kg):
    deo_base = [
        {"rm_code": "RM-L001/001", "rm_name": "Palmester 3595 [MCT Oil] (190KG/DRUM)", "g_per_kg": 395.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-SS001/005", "rm_name": "KAHLWAX 2039L CANDELILA WAX", "g_per_kg": 160.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-S001/003", "rm_name": "Magnesium Hydroxide (25kg/Bag)", "g_per_kg": 130.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-S002/004", "rm_name": "FARMAL 21T (25KG/BAG)", "g_per_kg": 105.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-S003/006", "rm_name": "Farmal AF1100 (20KG/CTN)", "g_per_kg": 75.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-SS007/075", "rm_name": "Shea Butter Refined TYP EPR (25KG/CTN)", "g_per_kg": 65.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-L003/010", "rm_name": "Vitamin E Acetate - Care (5KG/TONG)", "g_per_kg": 25.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-S004/009", "rm_name": "Colloidal Oatmeal (5KG/PAIL)", "g_per_kg": 22.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-S005/014", "rm_name": "Tegodeo PY 88 G (25KG/BAG)", "g_per_kg": 15.0, "category": "RAW_MATERIAL"},
        {"rm_code": "RM-EO003/015", "rm_name": "Tea Tree Oil BP (20KG/TONG)", "g_per_kg": 15.0, "category": "RAW_MATERIAL"}
    ]

    return {
        # Lip Balm: Black Cherry Paper 5g
        "FG-LB015/109": lip_base + [
            {"rm_code": "RM-CO007/054", "rm_name": "DK-PGT PASTE IOB (BLACK) (5KG/PAIL)", "g_per_kg": 10.67, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO004/043", "rm_name": "DK-PGT Paste R7 (Red) (5KG/PAIL)", "g_per_kg": 10.67, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO002/027", "rm_name": "DK-PGT Paste IOR (Coral) (5KG/PAIL)", "g_per_kg": 4.67, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO003/031", "rm_name": "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", "g_per_kg": 22.67, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-T031/277", "rm_name": "Tube - Lip Balm Paper 5g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"},
            {"rm_code": "PM-BO101/247", "rm_name": "Unitbox - Lip Balm Paper 5g", "g_per_kg": 1.0, "category": "PACKAGING_SECONDARY"}
        ],
        # Lip Balm: Coral Red Refill 4g
        "FG-LB008/040": lip_base + [
            {"rm_code": "RM-CO002/027", "rm_name": "DK-PGT Paste IOR (Coral) (5KG/PAIL)", "g_per_kg": 30.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO003/031", "rm_name": "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", "g_per_kg": 15.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO001/022", "rm_name": "DK-PGT Paste Ti (White) (5KG/PAIL)", "g_per_kg": 3.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-R004/104", "rm_name": "Refill Mechanism - Lip Balm 4g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Lip Balm: Raw Paper 5g
        "FG-LB005/037": lip_base + [
            {"rm_code": "RM-CO002/027", "rm_name": "DK-PGT Paste IOR (Coral) (5KG/PAIL)", "g_per_kg": 37.5, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO001/022", "rm_name": "DK-PGT Paste Ti (White) (5KG/PAIL)", "g_per_kg": 60.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO004/043", "rm_name": "DK-PGT Paste R7 (Red) (5KG/PAIL)", "g_per_kg": 6.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO005/046", "rm_name": "DK-PGT Paste R28L (Pink) (1KG/PAIL)", "g_per_kg": 10.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO006/050", "rm_name": "DK-PGT Paste B1L (Blue) (5KG/PAIL)", "g_per_kg": 4.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-T031/277", "rm_name": "Tube - Lip Balm Paper 5g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Lip Balm: Sunkissed Paper 5g
        "FG-LB037/281": lip_base + [
            {"rm_code": "RM-CO002/027", "rm_name": "DK-PGT Paste IOR (Coral) (5KG/PAIL)", "g_per_kg": 18.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO003/031", "rm_name": "DK-PGT Paste Y6L (Orange) (5KG/PAIL)", "g_per_kg": 24.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO001/022", "rm_name": "DK-PGT Paste Ti (White) (5KG/PAIL)", "g_per_kg": 30.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO005/046", "rm_name": "DK-PGT Paste R28L (Pink) (1KG/PAIL)", "g_per_kg": 6.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO006/050", "rm_name": "DK-PGT Paste B1L (Blue) (5KG/PAIL)", "g_per_kg": 1.8, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-T031/277", "rm_name": "Tube - Lip Balm Paper 5g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Lip Balm: Pink Rose Refill 4g
        "FG-LB038/282": lip_base + [
            {"rm_code": "RM-CO005/046", "rm_name": "DK-PGT Paste R28L (Pink) (1KG/PAIL)", "g_per_kg": 15.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-CO001/022", "rm_name": "DK-PGT Paste Ti (White) (5KG/PAIL)", "g_per_kg": 12.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-R004/104", "rm_name": "Refill Mechanism - Lip Balm 4g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Deodorant: Zen 40g
        "FG-D017/017": deo_base + [
            {"rm_code": "RM-EO001/002", "rm_name": "Bergamot Essential Oil (1KG/BTL)", "g_per_kg": 40.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-EO004/016", "rm_name": "FNLEMVERB 125 CITRUS VERBENA 39125", "g_per_kg": 29.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-EO002/013", "rm_name": "PATCHOULI ESSENTIAL OIL", "g_per_kg": 9.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-D040/102", "rm_name": "Deodorant Paper Stick 40g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Deodorant: Citrus 25g
        "FG-D001/001": deo_base + [
            {"rm_code": "RM-EO001/002", "rm_name": "Bergamot Essential Oil (1KG/BTL)", "g_per_kg": 90.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-EO007/024", "rm_name": "Lavender Essential oil (25KG/TONG)", "g_per_kg": 10.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-D025/101", "rm_name": "Deodorant Paper Stick 25g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Deodorant: Creme Cloud 40g
        "FG-D026/073": deo_base + [
            {"rm_code": "RM-FO002/062", "rm_name": "Shea Coconut Fragrance NQ6189", "g_per_kg": 40.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-FO003/063", "rm_name": "Sweet Vanilla Fragrance K9083", "g_per_kg": 20.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-FO004/064", "rm_name": "Sweet Caramel Fragrance 152387", "g_per_kg": 8.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-D040/102", "rm_name": "Deodorant Paper Stick 40g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Deodorant: Rose Geranium 25g
        "FG-D003/003": deo_base + [
            {"rm_code": "RM-EO016/079", "rm_name": "Rose Geranium Essential Oil (25KG/TONG)", "g_per_kg": 60.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-D025/101", "rm_name": "Deodorant Paper Stick 25g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Deodorant: Lavender 25g
        "FG-D004/004": deo_base + [
            {"rm_code": "RM-EO007/024", "rm_name": "Lavender Essential oil (25KG/TONG)", "g_per_kg": 50.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-D025/101", "rm_name": "Deodorant Paper Stick 25g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Deodorant: Woody 40g
        "FG-D006/006": deo_base + [
            {"rm_code": "RM-EO009/026", "rm_name": "Fir Needle Essential Oil", "g_per_kg": 30.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-D040/102", "rm_name": "Deodorant Paper Stick 40g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Hair Oil 30ml
        "FG-HO001/056": [
            {"rm_code": "RM-L008/035", "rm_name": "Argan Oil Cosmetic (23KG/TONG)", "g_per_kg": 220.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L022/069", "rm_name": "Jojoba Oil Golden (23KG/TONG)", "g_per_kg": 200.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L001/001", "rm_name": "Palmester 3595 [MCT Oil] (190KG/DRUM)", "g_per_kg": 200.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L025/072", "rm_name": "Grapeseed Oil Cosmetic (25KG/TONG)", "g_per_kg": 150.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L026/073", "rm_name": "Castor Oil Cosmetic (25KG/TONG)", "g_per_kg": 150.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-EO017/080", "rm_name": "Rosemary Essential Oil (5KG/BTL)", "g_per_kg": 45.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-EO003/015", "rm_name": "Tea Tree Oil BP (20KG/TONG)", "g_per_kg": 10.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L003/010", "rm_name": "Vitamin E Acetate - Care (5KG/TONG)", "g_per_kg": 10.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-HO030/103", "rm_name": "Glass Dropper Bottle 30ml", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ],
        # Lip Scrub 15g
        "FG-SB001/050": [
            {"rm_code": "RM-SS005/019", "rm_name": "Emulsifying Wax NF (25KG/BAG)", "g_per_kg": 200.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L004/011", "rm_name": "Avocado Oil Cosmetic (23KG/TONG)", "g_per_kg": 280.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L025/072", "rm_name": "Grapeseed Oil Cosmetic (25KG/TONG)", "g_per_kg": 170.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L003/010", "rm_name": "Vitamin E Acetate - Care (5KG/TONG)", "g_per_kg": 170.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-SS007/075", "rm_name": "Shea Butter Refined TYP EPR (25KG/CTN)", "g_per_kg": 75.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-L022/069", "rm_name": "Jojoba Oil Golden (23KG/TONG)", "g_per_kg": 50.0, "category": "RAW_MATERIAL"},
            {"rm_code": "RM-S006/018", "rm_name": "Celluloscrub 300 (20KG/BAG)", "g_per_kg": 18.0, "category": "RAW_MATERIAL"},
            {"rm_code": "PM-SB015/105", "rm_name": "Aluminium Jar 15g", "g_per_kg": 1.0, "category": "PACKAGING_PRIMARY"}
        ]
    }

def get_default_weekly_plan():
    # Pre-loads Xiao's verified weekly production schedule
    return [
        {
            "id": "batch-1",
            "day": "Monday",
            "fg_code": "FG-HO001/056",
            "unit_type": "BULK_KG",
            "target_qty": 40.0,
            "target_bulk_kg": 40.0,
            "target_pieces": 1333,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-06",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-2",
            "day": "Monday",
            "fg_code": "FG-LB038/282",
            "unit_type": "POTS",
            "target_qty": 3.0,
            "target_bulk_kg": 4.5,
            "target_pieces": 1125,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26002-27",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-3",
            "day": "Tuesday",
            "fg_code": "FG-D017/017",
            "unit_type": "BULK_KG",
            "target_qty": 51.0,
            "target_bulk_kg": 51.0,
            "target_pieces": 1275,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-19",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-4",
            "day": "Tuesday",
            "fg_code": "FG-D026/073",
            "unit_type": "BULK_KG",
            "target_qty": 51.0,
            "target_bulk_kg": 51.0,
            "target_pieces": 1275,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-27",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-5",
            "day": "Tuesday",
            "fg_code": "FG-LB008/040",
            "unit_type": "BULK_KG",
            "target_qty": 6.3,
            "target_bulk_kg": 6.3,
            "target_pieces": 1575,
            "yield_buffer_percent": 0.0,
            "batch_ref": "G26002-07",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-6",
            "day": "Wednesday",
            "fg_code": "FG-D001/001",
            "unit_type": "BULK_KG",
            "target_qty": 51.0,
            "target_bulk_kg": 51.0,
            "target_pieces": 2040,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-24",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-7",
            "day": "Wednesday",
            "fg_code": "FG-LB037/281",
            "unit_type": "POTS",
            "target_qty": 3.0,
            "target_bulk_kg": 4.5,
            "target_pieces": 900,
            "yield_buffer_percent": 0.0,
            "batch_ref": "G26008-20",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-8",
            "day": "Thursday",
            "fg_code": "FG-D003/003",
            "unit_type": "BULK_KG",
            "target_qty": 34.0,
            "target_bulk_kg": 34.0,
            "target_pieces": 1360,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-10",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-9",
            "day": "Thursday",
            "fg_code": "FG-LB005/037",
            "unit_type": "BULK_KG",
            "target_qty": 6.0,
            "target_bulk_kg": 6.0,
            "target_pieces": 1200,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-07",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-10",
            "day": "Friday",
            "fg_code": "FG-LB015/109",
            "unit_type": "BULK_KG",
            "target_qty": 6.0,
            "target_bulk_kg": 6.0,
            "target_pieces": 1200,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-15",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        },
        {
            "id": "batch-11",
            "day": "Friday",
            "fg_code": "FG-D004/004",
            "unit_type": "BULK_KG",
            "target_qty": 34.0,
            "target_bulk_kg": 34.0,
            "target_pieces": 1360,
            "yield_buffer_percent": 0.0,
            "batch_ref": "H26001-18",
            "status": "PLANNED",
            "operator_name": "Operator Adam"
        }
    ]

def load_data():
    global APP_STATE
    materials = {}
    material_order = []

    # Packaging master definitions
    packaging_defaults = {
        "PM-T031/277": {"description": "Tube - Lip Balm Paper 5g", "stock": 21721.0, "lead": 65, "uom": "PCS", "cat": "PACKAGING_PRIMARY", "pack_size": 1000.0},
        "PM-BO101/247": {"description": "Unitbox - Lip Balm Paper 5g", "stock": 9826.0, "lead": 30, "uom": "PCS", "cat": "PACKAGING_SECONDARY", "pack_size": 1000.0},
        "PM-R004/104": {"description": "Refill Mechanism - Lip Balm 4g", "stock": 14500.0, "lead": 45, "uom": "PCS", "cat": "PACKAGING_PRIMARY", "pack_size": 1000.0},
        "PM-D025/101": {"description": "Deodorant Paper Stick 25g", "stock": 8500.0, "lead": 50, "uom": "PCS", "cat": "PACKAGING_PRIMARY", "pack_size": 500.0},
        "PM-D040/102": {"description": "Deodorant Paper Stick 40g", "stock": 6200.0, "lead": 50, "uom": "PCS", "cat": "PACKAGING_PRIMARY", "pack_size": 500.0},
        "PM-HO030/103": {"description": "Glass Dropper Bottle 30ml", "stock": 3400.0, "lead": 40, "uom": "PCS", "cat": "PACKAGING_PRIMARY", "pack_size": 500.0},
        "PM-SB015/105": {"description": "Aluminium Jar 15g", "stock": 4100.0, "lead": 30, "uom": "PCS", "cat": "PACKAGING_PRIMARY", "pack_size": 1000.0}
    }

    # Monthly usage estimates
    amu_defaults = {
        "RM-L001/001": 60.0, "RM-L021/068": 60.0, "RM-SS001/005": 30.0, "RM-SS008/081": 15.0,
        "RM-SS007/075": 50.0, "RM-SS002/007": 30.0, "RM-SS003/012": 35.0, "RM-L004/011": 20.0,
        "RM-L022/069": 25.0, "RM-S001/003": 25.0, "RM-S002/004": 20.0, "RM-S003/006": 15.0,
        "RM-SS004/020": 10.0, "RM-L003/010": 12.0, "RM-L005/028": 5.0, "RM-EO006/023": 2.5,
        "RM-EO001/002": 8.0, "RM-EO004/016": 4.0, "RM-EO002/013": 2.0, "RM-EO003/015": 3.0,
        "RM-EO016/079": 5.0, "RM-EO007/024": 5.0, "RM-CO001/022": 4.0, "RM-CO002/027": 15.0,
        "RM-CO003/031": 4.0, "RM-CO004/043": 1.8, "RM-CO005/046": 2.0, "RM-CO006/050": 1.0,
        "RM-CO007/054": 1.5
    }

    # 1. Try reading live from production schedule xlsx
    if os.path.exists(SCHEDULE_EXCEL_PATH):
        try:
            wb = openpyxl.load_workbook(SCHEDULE_EXCEL_PATH, data_only=True)
            if "Raw Material & Expired Date " in wb.sheetnames:
                ws_rm = wb["Raw Material & Expired Date "]
                for r in range(2, ws_rm.max_row + 1):
                    code_new = ws_rm.cell(r, 3).value
                    code_old = ws_rm.cell(r, 2).value
                    name = ws_rm.cell(r, 4).value
                    pack_val = ws_rm.cell(r, 5).value
                    stock_g = ws_rm.cell(r, 7).value
                    lot_val = ws_rm.cell(r, 8).value
                    if not name:
                        continue
                    code = str(code_new or code_old or f"RM-ROW-{r}").strip()
                    soh_kg = float(stock_g or 0.0) / 1000.0
                    lead = 30
                    amu = amu_defaults.get(code, 15.0)

                    pack_size = 25.0
                    if pack_val is not None:
                        try:
                            pv = float(pack_val)
                            if pv > 0:
                                pack_size = pv
                        except (ValueError, TypeError):
                            pass

                    lot_str = str(lot_val).strip() if lot_val and str(lot_val).strip() not in ["-", "None"] else ""

                    if code not in materials:
                        materials[code] = {
                            "code": code,
                            "description": str(name).strip(),
                            "status": "ACTIVE",
                            "lead_time_days": lead,
                            "stock_on_hand": soh_kg,
                            "uom": "KG",
                            "category": "RAW_MATERIAL",
                            "subgroup": "Active Raw Material",
                            "avg_monthly_usage": amu,
                            "pack_size": pack_size,
                            "current_lot_no": lot_str
                        }
                        material_order.append(code)
        except Exception as e:
            print(f"[!] Warning reading Schedule Excel: {e}")

    # Fallback to Bom Example.xlsx if needed
    if len(materials) < 10 and os.path.exists(EXCEL_PATH):
        try:
            wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
            if "Raw Material List" in wb.sheetnames:
                ws_rm = wb["Raw Material List"]
                for r in range(2, ws_rm.max_row + 1):
                    code = ws_rm.cell(r, 1).value
                    if not code: continue
                    desc = ws_rm.cell(r, 2).value or ""
                    lead = ws_rm.cell(r, 4).value or 0
                    soh = ws_rm.cell(r, 5).value or 0.0
                    is_pm = str(code).startswith("PM")
                    uom = "PCS" if is_pm else "KG"
                    cat = "PACKAGING_PRIMARY" if is_pm else "RAW_MATERIAL"
                    code_str = str(code).strip()
                    psize = 1000.0 if is_pm else 25.0
                    materials[code_str] = {
                        "code": code_str,
                        "description": str(desc).strip(),
                        "status": "ACTIVE",
                        "lead_time_days": int(lead),
                        "stock_on_hand": float(soh),
                        "uom": uom,
                        "category": cat,
                        "subgroup": "Excel Seed",
                        "avg_monthly_usage": amu_defaults.get(code_str, 10.0),
                        "pack_size": psize,
                        "current_lot_no": ""
                    }
                    if code_str not in material_order:
                        material_order.append(code_str)
        except Exception as e:
            print(f"[!] Warning reading Bom Example: {e}")

    # Add missing packaging items
    for pcode, pdata in packaging_defaults.items():
        if pcode not in materials:
            materials[pcode] = {
                "code": pcode,
                "description": pdata["description"],
                "status": "ACTIVE",
                "lead_time_days": pdata["lead"],
                "stock_on_hand": pdata["stock"],
                "uom": pdata["uom"],
                "category": pdata["cat"],
                "subgroup": "Packaging",
                "avg_monthly_usage": 3000.0,
                "pack_size": pdata.get("pack_size", 1000.0),
                "current_lot_no": ""
            }
            material_order.append(pcode)

    # Extra active raw materials with confirmed non-zero inventory
    supplementary_rms = {
        "RM-FO002/062": {"desc": "Shea Coconut Fragrance NQ6189", "soh": 24.500, "lead": 45, "amu": 3.0, "pack_size": 5.0},
        "RM-FO003/063": {"desc": "Sweet Vanilla Fragrance K9083", "soh": 18.000, "lead": 45, "amu": 2.0, "pack_size": 5.0},
        "RM-FO004/064": {"desc": "Sweet Caramel Fragrance 152387", "soh": 12.000, "lead": 45, "amu": 1.5, "pack_size": 5.0},
        "RM-EO009/026": {"desc": "Fir Needle Essential Oil", "soh": 15.000, "lead": 60, "amu": 2.5, "pack_size": 5.0},
        "RM-L025/072": {"desc": "Grapeseed Oil Cosmetic (25KG/TONG)", "soh": 45.000, "lead": 30, "amu": 15.0, "pack_size": 25.0},
        "RM-L026/073": {"desc": "Castor Oil Cosmetic (25KG/TONG)", "soh": 60.000, "lead": 30, "amu": 20.0, "pack_size": 25.0},
        "RM-SS005/019": {"desc": "Emulsifying Wax NF (25KG/BAG)", "soh": 35.000, "lead": 45, "amu": 10.0, "pack_size": 25.0}
    }
    for scode, sdata in supplementary_rms.items():
        if scode not in materials:
            materials[scode] = {
                "code": scode,
                "description": sdata["desc"],
                "status": "ACTIVE",
                "lead_time_days": sdata["lead"],
                "stock_on_hand": sdata["soh"],
                "uom": "KG",
                "category": "RAW_MATERIAL",
                "subgroup": "Active Raw Material",
                "avg_monthly_usage": sdata["amu"],
                "pack_size": sdata["pack_size"],
                "current_lot_no": ""
            }
            material_order.append(scode)

    products = get_master_products()
    boms = get_master_boms()

    APP_STATE["materials"] = materials
    APP_STATE["material_order"] = material_order
    APP_STATE["products"] = products
    APP_STATE["product_order"] = list(products.keys())
    APP_STATE["boms"] = boms
    APP_STATE["substitutes"] = get_base_substitutes()
    APP_STATE["weekly_plan"] = get_default_weekly_plan()
    APP_STATE["next_batch_id"] = len(APP_STATE["weekly_plan"]) + 1
    APP_STATE["user_role"] = "admin"
    APP_STATE["ledger"] = []
    APP_STATE["batches"] = []
    APP_STATE["next_tx_id"] = 1001

def calculate_weekly_simulation():
    """
    Performs full multi-SKU aggregation and chronological day-by-day stock simulation.
    Tracks: Monday -> Saturday balances, first deficit days, and per-material drill-down batches.
    """
    weekly_plan = APP_STATE["weekly_plan"]
    materials = APP_STATE["materials"]
    boms = APP_STATE["boms"]
    products = APP_STATE["products"]

    day_demands = {d: {} for d in DAYS_OF_WEEK}
    mat_breakdown = {}
    total_committed = {}
    day_kpis = {d: {"bulk_kg": 0.0, "pieces": 0, "batch_count": 0, "shortage_count": 0} for d in DAYS_OF_WEEK}

    # 1. Aggregate demands per batch
    for b in weekly_plan:
        day = b.get("day", "Monday")
        fg = b.get("fg_code")
        status = b.get("status", "PLANNED")
        bulk_kg = float(b.get("target_bulk_kg", 0.0))
        target_pieces = float(b.get("target_pieces", 0.0))
        buffer_pct = float(b.get("yield_buffer_percent", 0.0))
        multiplier = 1.0 + (buffer_pct / 100.0)

        # Finished good information
        prod = products.get(fg, {"name": fg, "unit_weight_grams": 5.0})
        unit_weight = prod.get("unit_weight_grams", 5.0)

        if day in day_kpis:
            day_kpis[day]["batch_count"] += 1
            day_kpis[day]["bulk_kg"] += bulk_kg
            day_kpis[day]["pieces"] += int(target_pieces)

        # If already completed, its demand has already been deducted from physical SOH
        if status == "COMPLETED":
            continue

        recipe = boms.get(fg, [])
        for item in recipe:
            code = item["rm_code"]
            mat = materials.get(code)
            is_pm = str(code).startswith("PM") or (mat and mat.get("category") != "RAW_MATERIAL")

            if is_pm:
                req_qty = float(math.ceil(item["g_per_kg"] * target_pieces * multiplier))
                uom = "PCS"
            else:
                # Formula is grams per 1000g bulk. So req_kg = (g_per_kg / 1000) * bulk_kg
                req_qty = (item["g_per_kg"] / 1000.0) * bulk_kg * multiplier
                uom = "KG"

            if day in day_demands:
                day_demands[day][code] = day_demands[day].get(code, 0.0) + req_qty
            total_committed[code] = total_committed.get(code, 0.0) + req_qty

            if code not in mat_breakdown:
                mat_breakdown[code] = []
            mat_breakdown[code].append({
                "batch_id": b.get("id"),
                "batch_ref": b.get("batch_ref", "BATCH"),
                "day": day,
                "fg_code": fg,
                "fg_name": prod.get("name", fg),
                "batch_size_str": f"{bulk_kg:.2f} KG ({int(target_pieces)} pcs)",
                "qty_required": req_qty,
                "uom": uom
            })

    # 2. Chronological simulation across Monday -> Saturday
    material_rows = []
    shortage_count_total = 0

    for code in APP_STATE["material_order"]:
        mat = materials.get(code)
        if not mat:
            continue

        running_balance = mat["stock_on_hand"]
        daily_balances = {}
        first_deficit_day = None

        for d in DAYS_OF_WEEK:
            use = day_demands[d].get(code, 0.0)
            running_balance -= use
            daily_balances[d] = running_balance
            if running_balance < 0 and first_deficit_day is None and use > 0:
                first_deficit_day = d
                day_kpis[d]["shortage_count"] += 1

        total_req = total_committed.get(code, 0.0)
        proj_balance = mat["stock_on_hand"] - total_req
        is_short = (proj_balance < 0.0)
        deficit = abs(proj_balance) if is_short else 0.0

        if is_short:
            shortage_count_total += 1

        material_rows.append({
            "code": code,
            "description": mat["description"],
            "category": mat["category"],
            "uom": mat["uom"],
            "stock_on_hand": mat["stock_on_hand"],
            "total_committed": total_req,
            "projected_balance": proj_balance,
            "is_shortage": is_short,
            "deficit": deficit,
            "pack_size": mat.get("pack_size", 25.0 if mat.get("uom") == "KG" else 1000.0),
            "current_lot_no": mat.get("current_lot_no", ""),
            "first_deficit_day": first_deficit_day,
            "daily_balances": daily_balances,
            "lead_time_days": mat["lead_time_days"],
            "breakdown": mat_breakdown.get(code, [])
        })

    # Sort shortage items first, then by alphabetical code
    material_rows.sort(key=lambda r: (not r["is_shortage"], r["code"]))

    return {
        "material_rows": material_rows,
        "shortage_count_total": shortage_count_total,
        "day_kpis": day_kpis,
        "active_batches_count": sum(1 for b in weekly_plan if b.get("status") != "COMPLETED"),
        "completed_batches_count": sum(1 for b in weekly_plan if b.get("status") == "COMPLETED")
    }

def calculate_reorder_draft():
    """
    Evaluates net projected shortages from weekly simulation and calculates
    procurement reorder quantities rounded up to supplier pack sizes.
    """
    sim = calculate_weekly_simulation()
    materials = APP_STATE["materials"]
    reorder_items = []
    total_packs = 0
    urgent_count = 0

    for row in sim["material_rows"]:
        if not row["is_shortage"]:
            continue

        code = row["code"]
        mat = materials.get(code, {})
        uom = row["uom"]
        deficit = row["deficit"]
        pack_size = float(mat.get("pack_size", 25.0 if uom == "KG" else 1000.0))
        if pack_size <= 0:
            pack_size = 1.0

        packs_to_order = int(math.ceil(deficit / pack_size))
        suggested_qty = packs_to_order * pack_size
        lead_time = int(row.get("lead_time_days", 30))
        is_critical = lead_time >= 30
        if is_critical:
            urgent_count += 1

        total_packs += packs_to_order

        reorder_items.append({
            "code": code,
            "description": row["description"],
            "category": row["category"],
            "uom": uom,
            "stock_on_hand": row["stock_on_hand"],
            "total_committed": row["total_committed"],
            "deficit": deficit,
            "pack_size": pack_size,
            "packs_to_order": packs_to_order,
            "suggested_order_qty": suggested_qty,
            "surplus_after_order": suggested_qty - deficit,
            "lead_time_days": lead_time,
            "is_critical_lead": is_critical,
            "first_deficit_day": row["first_deficit_day"]
        })

    # Sort critical lead times first, then highest deficit
    reorder_items.sort(key=lambda x: (not x["is_critical_lead"], -x["deficit"]))

    return {
        "items": reorder_items,
        "total_items": len(reorder_items),
        "total_packs": total_packs,
        "urgent_count": urgent_count
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
        elif path == "/api/reorder/draft":
            self.handle_get_reorder_draft()
        elif path == "/api/export/reorder.csv":
            self.handle_export_reorder_csv()
        elif path == "/api/export/ledger.csv":
            self.handle_export_ledger()
        elif path == "/api/export/inventory.csv":
            self.handle_export_inventory()
        else:
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

        if path == "/api/plan/batch/add":
            self.handle_add_batch(data)
        elif path == "/api/plan/batch/update":
            self.handle_update_batch(data)
        elif path == "/api/plan/batch/delete":
            self.handle_delete_batch(data)
        elif path == "/api/plan/reset_week":
            self.handle_reset_week()
        elif path == "/api/batch/execute":
            self.handle_execute_batch(data)
        elif path == "/api/batch/cancel":
            self.handle_cancel_batch(data)
        elif path == "/api/role":
            self.handle_set_role(data)
        elif path == "/api/transaction":
            self.handle_create_transaction(data)
        elif path == "/api/reset":
            self.handle_reset_data()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_get_state(self):
        sim = calculate_weekly_simulation()
        response = {
            "products": APP_STATE["products"],
            "product_order": APP_STATE["product_order"],
            "materials": APP_STATE["materials"],
            "material_order": APP_STATE["material_order"],
            "substitutes": APP_STATE["substitutes"],
            "boms": APP_STATE["boms"],
            "weekly_plan": APP_STATE["weekly_plan"],
            "simulation": sim,
            "ledger": APP_STATE["ledger"],
            "batches": APP_STATE["batches"],
            "user_role": APP_STATE["user_role"],
            "recent_batch_summary": APP_STATE.get("recent_batch_summary"),
            "server_time": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.send_json_response(response)

    def handle_set_role(self, data):
        role = str(data.get("role", "admin")).strip().lower()
        if role in ["admin", "operator"]:
            APP_STATE["user_role"] = role
        self.handle_get_state()

    def handle_add_batch(self, data):
        fg_code = str(data.get("fg_code", "FG-LB015/109")).strip()
        day = str(data.get("day", "Monday")).strip()
        unit_type = str(data.get("unit_type", "BULK_KG")).strip().upper()
        target_qty = float(data.get("target_qty", 5.0))
        prod = APP_STATE["products"].get(fg_code, {"unit_weight_grams": 5.0})
        unit_weight = prod.get("unit_weight_grams", 5.0)

        if unit_type == "POTS":
            bulk_kg = target_qty * 1.5
            pieces = int(round((bulk_kg * 1000.0) / unit_weight))
        elif unit_type == "PIECES":
            pieces = int(target_qty)
            bulk_kg = (pieces * unit_weight) / 1000.0
        else: # BULK_KG
            bulk_kg = target_qty
            pieces = int(round((bulk_kg * 1000.0) / unit_weight))

        batch_id = f"batch-{APP_STATE['next_batch_id']}"
        APP_STATE["next_batch_id"] += 1
        ref = f"BATCH-{fg_code.replace('FG-', '')}-{int(pieces)}PCS"

        new_batch = {
            "id": batch_id,
            "day": day if day in DAYS_OF_WEEK else "Monday",
            "fg_code": fg_code,
            "unit_type": unit_type,
            "target_qty": target_qty,
            "target_bulk_kg": bulk_kg,
            "target_pieces": pieces,
            "yield_buffer_percent": float(data.get("yield_buffer_percent", 0.0)),
            "batch_ref": str(data.get("batch_ref", ref)).strip().upper(),
            "status": "PLANNED",
            "operator_name": str(data.get("operator_name", "Operator Adam")).strip()
        }
        APP_STATE["weekly_plan"].append(new_batch)
        self.handle_get_state()

    def handle_update_batch(self, data):
        batch_id = str(data.get("id", ""))
        for b in APP_STATE["weekly_plan"]:
            if b["id"] == batch_id:
                # Disallow editing completed batch unless admin
                if b["status"] == "COMPLETED" and APP_STATE["user_role"] != "admin":
                    self.send_error(403, "Only Admin can modify completed batches")
                    return

                if "day" in data and data["day"] in DAYS_OF_WEEK:
                    b["day"] = data["day"]
                if "fg_code" in data and data["fg_code"] in APP_STATE["products"]:
                    b["fg_code"] = data["fg_code"]
                if "unit_type" in data:
                    b["unit_type"] = str(data["unit_type"]).upper()

                unit_type = b.get("unit_type", "BULK_KG")
                prod = APP_STATE["products"].get(b["fg_code"], {"unit_weight_grams": 5.0})
                unit_weight = prod.get("unit_weight_grams", 5.0)

                if "target_qty" in data and float(data["target_qty"]) > 0:
                    b["target_qty"] = float(data["target_qty"])
                    if unit_type == "POTS":
                        b["target_bulk_kg"] = b["target_qty"] * 1.5
                        b["target_pieces"] = int(round((b["target_bulk_kg"] * 1000.0) / unit_weight))
                    elif unit_type == "PIECES":
                        b["target_pieces"] = int(b["target_qty"])
                        b["target_bulk_kg"] = (b["target_pieces"] * unit_weight) / 1000.0
                    else: # BULK_KG
                        b["target_bulk_kg"] = b["target_qty"]
                        b["target_pieces"] = int(round((b["target_bulk_kg"] * 1000.0) / unit_weight))

                if "batch_ref" in data and data["batch_ref"]:
                    b["batch_ref"] = str(data["batch_ref"]).strip().upper()
                if "yield_buffer_percent" in data:
                    b["yield_buffer_percent"] = max(0.0, float(data["yield_buffer_percent"]))
                if "status" in data and data["status"] in ["PLANNED", "IN_PROGRESS", "COMPLETED"]:
                    b["status"] = data["status"]
                break

        self.handle_get_state()

    def handle_delete_batch(self, data):
        batch_id = str(data.get("id", ""))
        batch_to_delete = None
        for b in APP_STATE["weekly_plan"]:
            if b["id"] == batch_id:
                batch_to_delete = b
                break

        if not batch_to_delete:
            self.send_error(404, "Batch not found")
            return

        if batch_to_delete["status"] == "COMPLETED" and APP_STATE["user_role"] != "admin":
            self.send_error(403, "Admin permission required to delete completed batches")
            return

        APP_STATE["weekly_plan"] = [b for b in APP_STATE["weekly_plan"] if b["id"] != batch_id]
        self.handle_get_state()

    def handle_reset_week(self):
        APP_STATE["weekly_plan"] = get_default_weekly_plan()
        APP_STATE["next_batch_id"] = len(APP_STATE["weekly_plan"]) + 1
        self.handle_get_state()

    def handle_execute_batch(self, data):
        """
        BOM Mass Deduction Execution:
        Accepts actual scale quantities, applies material substitutions,
        deducts physical SOH, writes itemized stock card entries with variances,
        and marks batch COMPLETED.
        """
        batch_id = str(data.get("batch_id", ""))
        target_batch = None
        for b in APP_STATE["weekly_plan"]:
            if b["id"] == batch_id:
                target_batch = b
                break

        if not target_batch:
            self.send_error(404, "Batch not found in plan")
            return

        items = data.get("items", [])
        if not items:
            self.send_error(400, "No material lines submitted for execution")
            return

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        batch_ref = str(data.get("batch_ref", target_batch["batch_ref"])).strip().upper()
        operator_name = str(data.get("operator_name", target_batch["operator_name"])).strip()
        fg_code = target_batch["fg_code"]
        target_pieces = target_batch["target_pieces"]
        total_rm_deducted = 0.0
        total_pm_deducted = 0

        # Process each staged deduction line
        for item in items:
            rm_code = str(item.get("rm_code", "")).strip()
            mat = APP_STATE["materials"].get(rm_code)
            if not mat:
                continue

            actual_qty = float(item.get("actual_qty", 0.0))
            theo_qty = float(item.get("theoretical_qty", actual_qty))
            variance = actual_qty - theo_qty

            before = mat["stock_on_hand"]
            mat["stock_on_hand"] -= actual_qty
            after = mat["stock_on_hand"]

            if mat["uom"] == "KG":
                total_rm_deducted += actual_qty
            else:
                total_pm_deducted += int(actual_qty)

            # Record Stock Card Transaction
            sub_info = f" [Substituted for {item.get('substitute_for')}]" if item.get("substitute_for") else ""
            notes = f"Batch {batch_ref} Execution ({target_batch['fg_code']}): Actual {actual_qty:.3f} {mat['uom']} (Theo: {theo_qty:.3f}, Var: {variance:+.3f}){sub_info}"
            tx = {
                "transaction_id": APP_STATE["next_tx_id"],
                "timestamp": timestamp,
                "material_code": mat["code"],
                "material_name": mat["description"],
                "type": "STOCK_OUT",
                "category": "Production Batch Issue",
                "quantity": actual_qty,
                "balance_before": before,
                "balance_after": after,
                "uom": mat["uom"],
                "reference_doc": batch_ref,
                "operator_name": operator_name,
                "notes": notes
            }
            APP_STATE["next_tx_id"] += 1
            APP_STATE["ledger"].insert(0, tx)

        # Mark batch as completed
        target_batch["status"] = "COMPLETED"
        target_batch["completed_at"] = timestamp
        target_batch["executed_items"] = items

        # Increment Finished Good Inventory
        prod = APP_STATE["products"].get(fg_code)
        if prod:
            prod["stock_on_hand"] = prod.get("stock_on_hand", 0.0) + target_pieces

        # Record in manufacturing batch log
        batch_record = {
            "batch_number": batch_ref,
            "batch_id": batch_id,
            "fg_code": fg_code,
            "fg_name": prod.get("name", fg_code) if prod else fg_code,
            "timestamp": timestamp,
            "operator_name": operator_name,
            "target_pieces": target_pieces,
            "bulk_kg": target_batch["target_bulk_kg"],
            "status": "COMPLETED",
            "material_lines": len(items),
            "executed_items": items
        }
        APP_STATE["batches"].insert(0, batch_record)

        APP_STATE["recent_batch_summary"] = {
            "batch_number": batch_ref,
            "fg_code": fg_code,
            "target_pieces": target_pieces,
            "timestamp": timestamp,
            "material_lines_deducted": len(items),
            "total_rm_kg_deducted": total_rm_deducted,
            "total_pm_pcs_deducted": total_pm_deducted
        }

        self.handle_get_state()

    def handle_cancel_batch(self, data):
        """Revert a completed batch. Only Admin permitted."""
        if APP_STATE["user_role"] != "admin":
            self.send_error(403, "Admin privilege required to cancel completed batches")
            return

        batch_id = str(data.get("batch_id", ""))
        target_batch = None
        for b in APP_STATE["weekly_plan"]:
            if b["id"] == batch_id:
                target_batch = b
                break

        if not target_batch or target_batch["status"] != "COMPLETED":
            self.send_error(400, "Target batch is not completed or does not exist")
            return

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        batch_ref = target_batch["batch_ref"]
        items = target_batch.get("executed_items", [])

        # Revert stock deductions
        for item in items:
            rm_code = item["rm_code"]
            mat = APP_STATE["materials"].get(rm_code)
            if not mat: continue
            qty = float(item.get("actual_qty", 0.0))
            before = mat["stock_on_hand"]
            mat["stock_on_hand"] += qty
            after = mat["stock_on_hand"]

            # Record reversing transaction
            tx = {
                "transaction_id": APP_STATE["next_tx_id"],
                "timestamp": timestamp,
                "material_code": mat["code"],
                "material_name": mat["description"],
                "type": "STOCK_IN",
                "category": "Batch Cancellation Reversal",
                "quantity": qty,
                "balance_before": before,
                "balance_after": after,
                "uom": mat["uom"],
                "reference_doc": f"CANCEL-{batch_ref}",
                "operator_name": "Admin Adam",
                "notes": f"Reversal for cancelled batch {batch_ref}"
            }
            APP_STATE["next_tx_id"] += 1
            APP_STATE["ledger"].insert(0, tx)

        # Revert finished good inventory
        prod = APP_STATE["products"].get(target_batch["fg_code"])
        if prod:
            prod["stock_on_hand"] = max(0.0, prod.get("stock_on_hand", 0.0) - target_batch["target_pieces"])

        # Update batch status back to PLANNED
        target_batch["status"] = "PLANNED"
        target_batch.pop("completed_at", None)
        target_batch.pop("executed_items", None)

        # Mark in batches log
        for blog in APP_STATE["batches"]:
            if blog.get("batch_number") == batch_ref:
                blog["status"] = "CANCELLED"

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
        operator = str(data.get("operator_name", "Operator Adam")).strip()
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
        load_data()
        self.handle_get_state()

    def handle_get_reorder_draft(self):
        draft = calculate_reorder_draft()
        self.send_json_response(draft)

    def handle_export_reorder_csv(self):
        draft = calculate_reorder_draft()
        csv_content = "Material Code,Description,Category,UOM,Physical SOH,Committed in Plan,Net Deficit,Supplier Pack Size,Suggested Packs to Order,Total Order Qty,Lead Time (Days),Order Urgency,First Deficit Day\n"
        for item in draft["items"]:
            urgency = "CRITICAL LEAD TIME" if item["is_critical_lead"] else "STANDARD"
            day_str = item["first_deficit_day"] or "N/A"
            csv_content += f"\"{item['code']}\",\"{item['description']}\",\"{item['category']}\",{item['uom']},{item['stock_on_hand']:.3f},{item['total_committed']:.3f},{item['deficit']:.3f},{item['pack_size']:.2f},{item['packs_to_order']},{item['suggested_order_qty']:.2f},{item['lead_time_days']},\"{urgency}\",\"{day_str}\"\n"

        self.send_response(200)
        self.send_header('Content-Type', 'text/csv; charset=utf-8')
        self.send_header('Content-Disposition', 'attachment; filename="reorder_draft_po.csv"')
        self.end_headers()
        self.wfile.write(csv_content.encode('utf-8'))

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
    load_data()
    server = ThreadingHTTPServer(('0.0.0.0', PORT), RequestHandler)
    print(f"=================================================================")
    print(f"  HYGR Multi-SKU Production Planner & Stock Card System")
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
