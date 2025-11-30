#!/usr/bin/env python3
"""
MongoDB Import Script for AI Bot Detection System
Usage: python import_mongodb.py
"""

import json
import sys
from pymongo import MongoClient
from datetime import datetime

def import_database(mongo_url="mongodb://localhost:27017", db_name="aibot_detect_db", json_file="mongodb_export.json"):
    """Import MongoDB database from JSON export file"""
    
    print("=" * 60)
    print("AI Bot Detection System - MongoDB Import")
    print("=" * 60)
    print()
    
    # Load export file
    print(f"📂 Loading export file: {json_file}")
    try:
        with open(json_file, 'r') as f:
            export_data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{json_file}' not found!")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON file - {e}")
        sys.exit(1)
    
    print(f"✅ Loaded export from {export_data['export_date']}")
    print(f"📊 Collections: {len(export_data['collections'])}")
    print()
    
    # Connect to MongoDB
    print(f"🔌 Connecting to MongoDB: {mongo_url}")
    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        # Test connection
        client.server_info()
        print("✅ Connected successfully")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    db = client[db_name]
    print(f"🗄️  Using database: {db_name}")
    print()
    
    # Import each collection
    print("📥 Importing collections...")
    print("-" * 60)
    
    total_imported = 0
    
    for collection_name, collection_data in export_data['collections'].items():
        documents = collection_data['documents']
        count = len(documents)
        
        if count == 0:
            print(f"⚠️  {collection_name}: No documents to import")
            continue
        
        # Drop existing collection (optional - comment out if you want to merge)
        db[collection_name].drop()
        
        # Insert documents
        try:
            result = db[collection_name].insert_many(documents)
            imported = len(result.inserted_ids)
            total_imported += imported
            print(f"✅ {collection_name}: Imported {imported}/{count} documents")
        except Exception as e:
            print(f"❌ {collection_name}: Import failed - {e}")
            continue
    
    print("-" * 60)
    print(f"✅ Total documents imported: {total_imported}")
    print()
    
    # Verification
    print("🔍 Verifying import...")
    print("-" * 60)
    
    verification = {
        'users': db.users.count_documents({}),
        'domains': db.domains.count_documents({}),
        'traffic_logs': db.traffic_logs.count_documents({}),
        'api_keys': db.api_keys.count_documents({}),
        'alerts': db.alerts.count_documents({})
    }
    
    for collection, count in verification.items():
        expected = export_data['collections'][collection]['count']
        status = "✅" if count == expected else "⚠️"
        print(f"{status} {collection}: {count}/{expected} documents")
    
    print("-" * 60)
    print()
    
    # Display credentials
    print("🔑 Credentials:")
    print("-" * 60)
    print("Super Admin:")
    print("  Email: admin@aibot-detect.com")
    print("  Password: Admin@123")
    print()
    print("API Keys:")
    api_keys = db.api_keys.find({}, {"_id": 0, "name": 1, "key": 1})
    for key in api_keys:
        print(f"  {key['name']}: {key['key']}")
    print("-" * 60)
    print()
    
    # Statistics
    print("📊 Database Statistics:")
    print("-" * 60)
    super_admins = db.users.count_documents({"is_super_admin": True})
    verified_domains = db.domains.count_documents({"is_verified": True})
    bot_detections = db.traffic_logs.count_documents({"detected_bot": {"$ne": None}})
    
    print(f"  Total Users: {verification['users']}")
    print(f"  Super Admins: {super_admins}")
    print(f"  Verified Domains: {verified_domains}/{verification['domains']}")
    print(f"  Total Traffic Logs: {verification['traffic_logs']}")
    print(f"  Bot Detections: {bot_detections}")
    print(f"  API Keys: {verification['api_keys']}")
    print(f"  Alerts: {verification['alerts']}")
    print("-" * 60)
    print()
    
    print("✅ Import completed successfully!")
    print()
    print("🚀 Next Steps:")
    print("  1. Update backend/.env with your MongoDB URL if needed")
    print("  2. Start the backend: cd backend && uvicorn server:app --reload")
    print("  3. Start the frontend: cd frontend && npm start")
    print("  4. Login at: http://localhost:3000/login")
    print()
    
    client.close()


if __name__ == "__main__":
    # You can customize these values
    MONGO_URL = "mongodb://localhost:27017"
    DB_NAME = "aibot_detect_db"
    JSON_FILE = "mongodb_export.json"
    
    # Parse command line arguments (optional)
    if len(sys.argv) > 1:
        MONGO_URL = sys.argv[1]
    if len(sys.argv) > 2:
        DB_NAME = sys.argv[2]
    if len(sys.argv) > 3:
        JSON_FILE = sys.argv[3]
    
    import_database(MONGO_URL, DB_NAME, JSON_FILE)
