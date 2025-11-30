"""
Script to create a super admin user
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_super_admin():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    email = "admin@aibot-detect.com"
    password = "Admin@123"
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"User {email} already exists!")
        # Update to super admin if not already
        if not existing.get('is_super_admin'):
            await db.users.update_one(
                {"email": email},
                {"$set": {"is_super_admin": True}}
            )
            print(f"Updated {email} to super admin!")
        else:
            print(f"{email} is already a super admin!")
        client.close()
        return
    
    # Create new super admin user
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": pwd_context.hash(password),
        "is_super_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    print(f"✓ Super admin created successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_super_admin())
