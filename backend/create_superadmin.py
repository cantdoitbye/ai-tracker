import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_superadmin():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if super admin already exists
    existing = await db.users.find_one({"email": "admin@aibot-detect.com"})
    if existing:
        print("Super admin already exists!")
        if not existing.get('is_super_admin'):
            # Update to super admin
            await db.users.update_one(
                {"email": "admin@aibot-detect.com"},
                {"$set": {"is_super_admin": True}}
            )
            print("Updated existing user to super admin")
        client.close()
        return
    
    # Create super admin
    user = {
        "id": str(uuid.uuid4()),
        "email": "admin@aibot-detect.com",
        "password_hash": pwd_context.hash("Admin@123"),
        "is_super_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    print("Super admin created successfully!")
    print("Email: admin@aibot-detect.com")
    print("Password: Admin@123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_superadmin())
