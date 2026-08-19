"""
Mock data for the Factory Inventory Management System
This module loads sample data from JSON files for inventory items, orders, demand forecasts, and backlog items.
All data is from September 2025 and includes warehouse, category, and date fields for filtering.
"""

import json
import os

# Get the directory where this file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

def load_json_file(filename):
    """Load data from a JSON file in the data directory"""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r') as f:
        return json.load(f)

def save_json_file(filename, data):
    """Write data back to a JSON file in the data directory.
    Writes to a temp file first and renames it into place so a crash
    mid-write can't leave the JSON file truncated/corrupted."""
    filepath = os.path.join(DATA_DIR, filename)
    tmp_filepath = filepath + '.tmp'
    with open(tmp_filepath, 'w') as f:
        json.dump(data, f, indent=2)
    os.replace(tmp_filepath, filepath)

# Load all datasets from JSON files
inventory_items = load_json_file('inventory.json')
orders = load_json_file('orders.json')
demand_forecasts = load_json_file('demand_forecasts.json')
backlog_items = load_json_file('backlog_items.json')

# Load spending data
spending_data = load_json_file('spending.json')
spending_summary = spending_data['spending_summary']
monthly_spending = spending_data['monthly_spending']
category_spending = spending_data['category_spending']

# Load transactions
recent_transactions = load_json_file('transactions.json')

# Load purchase orders
purchase_orders = load_json_file('purchase_orders.json')

# Load restock orders (submitted via the Restocking tab)
restock_orders = load_json_file('restock_orders.json')

def save_restock_orders():
    """Persist restock_orders to disk. Unlike the rest of this app's mock
    data (in-memory only, reset on restart), restock orders represent a
    user-submitted action, so they're written back to restock_orders.json
    to survive a server restart."""
    save_json_file('restock_orders.json', restock_orders)

def save_purchase_orders():
    """Persist purchase_orders to disk, same rationale as save_restock_orders."""
    save_json_file('purchase_orders.json', purchase_orders)

# All data is now loaded from JSON files in the data/ directory
# This allows for easier maintenance and updates of the sample data
