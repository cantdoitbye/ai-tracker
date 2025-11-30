"""
Script to import MongoDB data from JSON files
"""
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

async def import_data():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Define collections and their corresponding JSON files
    collections = {
        'users': ROOT_DIR / 'mongodb_users.json',
        'domains': ROOT_DIR / 'mongodb_domains.json',
        'api_keys': ROOT_DIR / 'mongodb_api_keys.json',
        'alerts': ROOT_DIR / 'mongodb_alerts.json',
        'traffic_logs': ROOT_DIR / 'mongodb_traffic_logs.json'
    }
    
    print("Starting MongoDB data import...\n")
    
    for collection_name, file_path in collections.items():
        if not file_path.exists():
            print(f"⚠ Skipping {collection_name}: File not found at {file_path}")
            continue
        
        try:
            # Read JSON file
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                print(f"⚠ Skipping {collection_name}: No data in file")
                continue
            
            # Clear existing data in collection
            result = await db[collection_name].delete_many({})
            print(f"🗑️  Cleared {result.deleted_count} existing documents from {collection_name}")
            
            # Insert new data
            if isinstance(data, list):
                result = await db[collection_name].insert_many(data)
                print(f"✓ Imported {len(result.inserted_ids)} documents into {collection_name}")
            else:
                result = await db[collection_name].insert_one(data)
                print(f"✓ Imported 1 document into {collection_name}")
            
        except Exception as e:
            print(f"✗ Error importing {collection_name}: {str(e)}")
    
    print("\n" + "="*50)
    print("Import Summary:")
    print("="*50)
    
    # Show counts
    for collection_name in collections.keys():
        count = await db[collection_name].count_documents({})
        print(f"{collection_name}: {count} documents")
    
    print("\n✓ Data import completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(import_data())
