import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone, timedelta
import random
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# AI Bot User Agents
AI_BOTS = [
    ('GPTBot/1.0', 'OpenAI', 'high'),
    ('Mozilla/5.0 (compatible; ClaudeBot/1.0; +http://www.anthropic.com)', 'Anthropic', 'high'),
    ('Mozilla/5.0 (compatible; Google-Extended/1.0)', 'Google', 'high'),
    ('PerplexityBot/1.0', 'Perplexity', 'high'),
    ('CCBot/2.0', 'Common Crawl', 'high'),
    ('Bytespider/1.0', 'ByteDance', 'high'),
    ('Mozilla/5.0 (compatible; anthropic-ai)', 'Anthropic', 'high'),
    ('cohere-ai-bot/1.0', 'Cohere', 'high'),
    ('YouBot/1.0', 'You.com', 'high'),
    ('Mozilla/5.0 (compatible; FacebookBot/1.0)', 'Meta', 'medium'),
]

NORMAL_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
]

PATHS = ['/', '/about', '/blog', '/products', '/contact', '/api/data', '/articles/ai-guide', '/docs']

async def simulate_traffic(user_id, domain_id):
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    logs = []
    
    # Generate 50 traffic logs
    for i in range(50):
        # 40% chance of bot traffic
        is_bot = random.random() < 0.4
        
        if is_bot:
            user_agent, provider, risk = random.choice(AI_BOTS)
            detected_bot = user_agent.split('/')[0]
            confidence = random.uniform(0.85, 0.95)
            ip = f"{random.randint(13, 52)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        else:
            user_agent = random.choice(NORMAL_AGENTS)
            detected_bot = None
            provider = None
            risk = 'unknown'
            confidence = 0.0
            ip = f"{random.randint(100, 200)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        
        # Random geo location
        locations = [
            {'country': 'United States', 'city': 'San Francisco', 'region': 'California', 'lat': 37.7749, 'lon': -122.4194, 'isp': 'Amazon AWS'},
            {'country': 'United States', 'city': 'New York', 'region': 'New York', 'lat': 40.7128, 'lon': -74.0060, 'isp': 'Google Cloud'},
            {'country': 'United Kingdom', 'city': 'London', 'region': 'England', 'lat': 51.5074, 'lon': -0.1278, 'isp': 'Microsoft Azure'},
            {'country': 'Germany', 'city': 'Frankfurt', 'region': 'Hesse', 'lat': 50.1109, 'lon': 8.6821, 'isp': 'Hetzner'},
            {'country': 'Singapore', 'city': 'Singapore', 'region': 'Central', 'lat': 1.3521, 'lon': 103.8198, 'isp': 'DigitalOcean'},
        ]
        
        log = {
            'id': str(uuid.uuid4()),
            'domain_id': domain_id,
            'user_id': user_id,
            'ip_address': ip,
            'user_agent': user_agent,
            'detected_bot': detected_bot,
            'bot_provider': provider,
            'confidence_score': confidence,
            'risk_level': risk,
            'geo_location': random.choice(locations),
            'request_path': random.choice(PATHS),
            'request_method': 'GET',
            'timestamp': (datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 168))).isoformat()  # Last 7 days
        }
        
        logs.append(log)
    
    # Insert logs
    if logs:
        await db.traffic_logs.insert_many(logs)
        print(f"✓ Created {len(logs)} traffic logs")
        print(f"  - Bot requests: {sum(1 for log in logs if log['detected_bot'])}")
        print(f"  - Normal requests: {sum(1 for log in logs if not log['detected_bot'])}")
    
    client.close()

async def main():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get a user
    user = await db.users.find_one({})
    if not user:
        print("No users found. Please create a user first.")
        client.close()
        return
    
    # Get a verified domain
    domain = await db.domains.find_one({'user_id': user['id'], 'is_verified': True})
    if not domain:
        print("No verified domains found. Creating test domain...")
        # Create a test domain
        domain = {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'domain': 'example.com',
            'verification_token': str(uuid.uuid4()),
            'is_verified': True,
            'verified_at': datetime.now(timezone.utc).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.domains.insert_one(domain)
        print(f"✓ Created verified test domain: {domain['domain']}")
    
    print(f"\nSimulating traffic for domain: {domain['domain']}")
    await simulate_traffic(user['id'], domain['id'])
    
    client.close()
    print("\n✓ Traffic simulation complete!")

if __name__ == "__main__":
    asyncio.run(main())
