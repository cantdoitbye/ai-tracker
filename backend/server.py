from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import secrets
import requests
from collections import Counter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = 24 * 7  # 7 days

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Known AI Bot Signatures
AI_BOT_SIGNATURES = {
    'GPTBot': {'provider': 'OpenAI', 'risk': 'high'},
    'ChatGPT-User': {'provider': 'OpenAI', 'risk': 'high'},
    'Claude-Web': {'provider': 'Anthropic', 'risk': 'high'},
    'ClaudeBot': {'provider': 'Anthropic', 'risk': 'high'},
    'anthropic-ai': {'provider': 'Anthropic', 'risk': 'high'},
    'Google-Extended': {'provider': 'Google', 'risk': 'high'},
    'GoogleOther': {'provider': 'Google', 'risk': 'medium'},
    'PerplexityBot': {'provider': 'Perplexity', 'risk': 'high'},
    'Applebot-Extended': {'provider': 'Apple', 'risk': 'medium'},
    'FacebookBot': {'provider': 'Meta', 'risk': 'medium'},
    'facebookexternalhit': {'provider': 'Meta', 'risk': 'low'},
    'Bytespider': {'provider': 'ByteDance', 'risk': 'high'},
    'Diffbot': {'provider': 'Diffbot', 'risk': 'medium'},
    'CCBot': {'provider': 'Common Crawl', 'risk': 'high'},
    'cohere-ai': {'provider': 'Cohere', 'risk': 'high'},
    'omgili': {'provider': 'Omgili', 'risk': 'medium'},
    'YouBot': {'provider': 'You.com', 'risk': 'high'},
    'anthropic': {'provider': 'Anthropic', 'risk': 'high'},
    'Claude': {'provider': 'Anthropic', 'risk': 'high'},
}

AI_IP_RANGES = [
    '13.56.', '13.57.', '52.24.', '52.52.',  # AWS (OpenAI)
    '35.247.', '34.82.',  # GCP (Various AI)
    '20.', '40.',  # Azure (Various AI)
]

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    is_super_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    is_super_admin: bool
    created_at: datetime

class Domain(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    domain: str
    verification_token: str = Field(default_factory=lambda: secrets.token_urlsafe(16))
    is_verified: bool = False
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DomainCreate(BaseModel):
    domain: str

class DomainResponse(BaseModel):
    id: str
    domain: str
    is_verified: bool
    verification_token: str
    verified_at: Optional[datetime]
    created_at: datetime

class TrafficLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    domain_id: str
    user_id: str
    ip_address: str
    user_agent: str
    detected_bot: Optional[str] = None
    bot_provider: Optional[str] = None
    confidence_score: float = 0.0
    risk_level: str = "unknown"
    geo_location: Optional[Dict[str, Any]] = None
    request_path: str
    request_method: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TrafficLogCreate(BaseModel):
    domain: str
    api_key: str
    ip_address: str
    user_agent: str
    request_path: str
    request_method: str = "GET"

class TrafficLogResponse(BaseModel):
    id: str
    domain_id: str
    ip_address: str
    user_agent: str
    detected_bot: Optional[str]
    bot_provider: Optional[str]
    confidence_score: float
    risk_level: str
    geo_location: Optional[Dict[str, Any]]
    request_path: str
    request_method: str
    timestamp: datetime

class ApiKey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    key: str = Field(default_factory=lambda: f"abk_{secrets.token_urlsafe(32)}")
    name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyResponse(BaseModel):
    id: str
    key: str
    name: str
    is_active: bool
    created_at: datetime

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    alert_type: str  # email, webhook
    destination: str  # email address or webhook URL
    threshold: int = 10  # number of bot detections before alert
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlertCreate(BaseModel):
    alert_type: str
    destination: str
    threshold: int = 10

class AlertResponse(BaseModel):
    id: str
    alert_type: str
    destination: str
    threshold: int
    is_active: bool
    created_at: datetime

class StatsResponse(BaseModel):
    total_requests: int
    bot_requests: int
    unique_ips: int
    top_bots: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]
    recent_activity: List[TrafficLogResponse]

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def get_super_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user

def detect_bot(user_agent: str, ip_address: str) -> tuple:
    """Detect if request is from AI bot and calculate confidence score"""
    detected_bot = None
    bot_provider = None
    confidence = 0.0
    risk_level = "unknown"
    
    user_agent_lower = user_agent.lower()
    
    # Check user agent signatures
    for bot_name, info in AI_BOT_SIGNATURES.items():
        if bot_name.lower() in user_agent_lower:
            detected_bot = bot_name
            bot_provider = info['provider']
            confidence = 0.9
            risk_level = info['risk']
            break
    
    # Check IP ranges
    if not detected_bot:
        for ip_range in AI_IP_RANGES:
            if ip_address.startswith(ip_range):
                confidence = 0.6
                risk_level = "medium"
                detected_bot = "Suspicious AI IP"
                break
    
    # Check for headless browser indicators
    headless_indicators = ['headless', 'phantom', 'selenium', 'puppeteer', 'playwright']
    if any(indicator in user_agent_lower for indicator in headless_indicators):
        if confidence == 0:
            confidence = 0.5
            risk_level = "medium"
            detected_bot = "Headless Browser"
    
    return detected_bot, bot_provider, confidence, risk_level

def get_geo_location(ip: str) -> Optional[Dict[str, Any]]:
    """Get geolocation data for IP address using free API"""
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'country': data.get('country'),
                    'city': data.get('city'),
                    'region': data.get('regionName'),
                    'lat': data.get('lat'),
                    'lon': data.get('lon'),
                    'isp': data.get('isp'),
                }
    except Exception as e:
        logging.error(f"Geo lookup failed: {e}")
    return None

# Auth Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return UserResponse(**user.model_dump())

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user['id'], "email": user['email']})
    return {"access_token": token, "token_type": "bearer", "user": UserResponse(**user).model_dump()}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# Domain Routes
@api_router.post("/domains", response_model=DomainResponse)
async def create_domain(domain_data: DomainCreate, user: dict = Depends(get_current_user)):
    # Check if domain already exists for user
    existing = await db.domains.find_one({"user_id": user['id'], "domain": domain_data.domain})
    if existing:
        raise HTTPException(status_code=400, detail="Domain already added")
    
    domain = Domain(
        user_id=user['id'],
        domain=domain_data.domain
    )
    
    doc = domain.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.domains.insert_one(doc)
    
    return DomainResponse(**domain.model_dump())

@api_router.get("/domains", response_model=List[DomainResponse])
async def get_domains(user: dict = Depends(get_current_user)):
    domains = await db.domains.find({"user_id": user['id']}, {"_id": 0}).to_list(1000)
    for d in domains:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
        if d.get('verified_at') and isinstance(d['verified_at'], str):
            d['verified_at'] = datetime.fromisoformat(d['verified_at'])
    return [DomainResponse(**d) for d in domains]

@api_router.post("/domains/{domain_id}/verify")
async def verify_domain(domain_id: str, user: dict = Depends(get_current_user)):
    domain = await db.domains.find_one({"id": domain_id, "user_id": user['id']}, {"_id": 0})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    if domain['is_verified']:
        return {"verified": True, "message": "Domain already verified"}
    
    # Try DNS TXT verification
    try:
        import dns.resolver
        answers = dns.resolver.resolve(domain['domain'], 'TXT')
        verification_string = f"aibot-detect={domain['verification_token']}"
        
        for rdata in answers:
            for txt_string in rdata.strings:
                if verification_string.encode() in txt_string:
                    # Verified!
                    await db.domains.update_one(
                        {"id": domain_id},
                        {"$set": {
                            "is_verified": True,
                            "verified_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    return {"verified": True, "method": "DNS"}
    except Exception as e:
        logging.info(f"DNS verification failed: {e}")
    
    # Try file verification
    try:
        file_url = f"https://{domain['domain']}/.well-known/aibot-detect.txt"
        response = requests.get(file_url, timeout=5)
        if response.status_code == 200 and domain['verification_token'] in response.text:
            await db.domains.update_one(
                {"id": domain_id},
                {"$set": {
                    "is_verified": True,
                    "verified_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"verified": True, "method": "FILE"}
    except Exception as e:
        logging.info(f"File verification failed: {e}")
    
    return {"verified": False, "message": "Verification failed. Please check DNS TXT record or file."}

@api_router.delete("/domains/{domain_id}")
async def delete_domain(domain_id: str, user: dict = Depends(get_current_user)):
    result = await db.domains.delete_one({"id": domain_id, "user_id": user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    return {"success": True}

# API Key Routes
@api_router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(key_data: ApiKeyCreate, user: dict = Depends(get_current_user)):
    api_key = ApiKey(
        user_id=user['id'],
        name=key_data.name
    )
    
    doc = api_key.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.api_keys.insert_one(doc)
    
    return ApiKeyResponse(**api_key.model_dump())

@api_router.get("/api-keys", response_model=List[ApiKeyResponse])
async def get_api_keys(user: dict = Depends(get_current_user)):
    keys = await db.api_keys.find({"user_id": user['id']}, {"_id": 0}).to_list(1000)
    for k in keys:
        if isinstance(k.get('created_at'), str):
            k['created_at'] = datetime.fromisoformat(k['created_at'])
    return [ApiKeyResponse(**k) for k in keys]

@api_router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    result = await db.api_keys.delete_one({"id": key_id, "user_id": user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"success": True}

# Traffic Logging Routes
@api_router.post("/traffic/log")
async def log_traffic(log_data: TrafficLogCreate):
    # Verify API key
    api_key_doc = await db.api_keys.find_one({"key": log_data.api_key, "is_active": True}, {"_id": 0})
    if not api_key_doc:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Find domain
    domain = await db.domains.find_one({"domain": log_data.domain, "is_verified": True}, {"_id": 0})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found or not verified")
    
    # Detect bot
    detected_bot, bot_provider, confidence, risk_level = detect_bot(log_data.user_agent, log_data.ip_address)
    
    # Get geolocation
    geo_location = get_geo_location(log_data.ip_address)
    
    traffic_log = TrafficLog(
        domain_id=domain['id'],
        user_id=domain['user_id'],
        ip_address=log_data.ip_address,
        user_agent=log_data.user_agent,
        detected_bot=detected_bot,
        bot_provider=bot_provider,
        confidence_score=confidence,
        risk_level=risk_level,
        geo_location=geo_location,
        request_path=log_data.request_path,
        request_method=log_data.request_method
    )
    
    doc = traffic_log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.traffic_logs.insert_one(doc)
    
    # Check alerts if bot detected
    if detected_bot and confidence > 0.5:
        await check_and_send_alerts(domain['user_id'], domain['id'])
    
    return {"success": True, "bot_detected": detected_bot is not None, "confidence": confidence}

async def check_and_send_alerts(user_id: str, domain_id: str):
    """Check if alert threshold is reached and send alerts"""
    # Count recent bot detections (last hour)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_bots = await db.traffic_logs.count_documents({
        "user_id": user_id,
        "domain_id": domain_id,
        "detected_bot": {"$ne": None},
        "timestamp": {"$gte": one_hour_ago.isoformat()}
    })
    
    # Get active alerts
    alerts = await db.alerts.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    
    for alert in alerts:
        if recent_bots >= alert['threshold']:
            # Send alert (simplified - just log for now)
            logging.info(f"ALERT: User {user_id} has {recent_bots} bot detections. Alert: {alert['destination']}")

@api_router.get("/traffic/logs", response_model=List[TrafficLogResponse])
async def get_traffic_logs(
    domain_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user['id']}
    if domain_id:
        query["domain_id"] = domain_id
    
    logs = await db.traffic_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return [TrafficLogResponse(**log) for log in logs]

@api_router.get("/traffic/stats", response_model=StatsResponse)
async def get_traffic_stats(
    domain_id: Optional[str] = None,
    days: int = 7,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user['id']}
    if domain_id:
        query["domain_id"] = domain_id
    
    # Get logs from last N days
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    query["timestamp"] = {"$gte": start_date.isoformat()}
    
    logs = await db.traffic_logs.find(query, {"_id": 0}).to_list(10000)
    
    total_requests = len(logs)
    bot_requests = sum(1 for log in logs if log.get('detected_bot'))
    unique_ips = len(set(log['ip_address'] for log in logs))
    
    # Top bots
    bot_counter = Counter(log.get('detected_bot') for log in logs if log.get('detected_bot'))
    top_bots = [{"name": bot, "count": count} for bot, count in bot_counter.most_common(10)]
    
    # Risk distribution
    risk_counter = Counter(log.get('risk_level', 'unknown') for log in logs)
    risk_distribution = dict(risk_counter)
    
    # Recent activity
    recent_logs = sorted(logs, key=lambda x: x.get('timestamp', ''), reverse=True)[:10]
    for log in recent_logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    recent_activity = [TrafficLogResponse(**log) for log in recent_logs]
    
    return StatsResponse(
        total_requests=total_requests,
        bot_requests=bot_requests,
        unique_ips=unique_ips,
        top_bots=top_bots,
        risk_distribution=risk_distribution,
        recent_activity=recent_activity
    )

@api_router.get("/traffic/export")
async def export_traffic_logs(
    format: str = "json",
    domain_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user['id']}
    if domain_id:
        query["domain_id"] = domain_id
    
    logs = await db.traffic_logs.find(query, {"_id": 0}).to_list(10000)
    
    if format == "csv":
        import csv
        import io
        
        output = io.StringIO()
        if logs:
            writer = csv.DictWriter(output, fieldnames=logs[0].keys())
            writer.writeheader()
            writer.writerows(logs)
        
        from fastapi.responses import StreamingResponse
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=traffic_logs.csv"}
        )
    
    return logs

# Alert Routes
@api_router.post("/alerts", response_model=AlertResponse)
async def create_alert(alert_data: AlertCreate, user: dict = Depends(get_current_user)):
    alert = Alert(
        user_id=user['id'],
        alert_type=alert_data.alert_type,
        destination=alert_data.destination,
        threshold=alert_data.threshold
    )
    
    doc = alert.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.alerts.insert_one(doc)
    
    return AlertResponse(**alert.model_dump())

@api_router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(user: dict = Depends(get_current_user)):
    alerts = await db.alerts.find({"user_id": user['id']}, {"_id": 0}).to_list(1000)
    for a in alerts:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return [AlertResponse(**a) for a in alerts]

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    result = await db.alerts.delete_one({"id": alert_id, "user_id": user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}

# Super Admin Routes
@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_super_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_super_admin)):
    total_users = await db.users.count_documents({})
    total_domains = await db.domains.count_documents({})
    verified_domains = await db.domains.count_documents({"is_verified": True})
    total_logs = await db.traffic_logs.count_documents({})
    bot_detections = await db.traffic_logs.count_documents({"detected_bot": {"$ne": None}})
    
    # Recent activity across all users
    recent_logs = await db.traffic_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(50).to_list(50)
    
    return {
        "total_users": total_users,
        "total_domains": total_domains,
        "verified_domains": verified_domains,
        "total_logs": total_logs,
        "bot_detections": bot_detections,
        "recent_activity": recent_logs
    }

@api_router.get("/admin/domains")
async def get_all_domains(admin: dict = Depends(get_super_admin)):
    domains = await db.domains.find({}, {"_id": 0}).to_list(10000)
    
    # Get user emails for each domain
    for domain in domains:
        user = await db.users.find_one({"id": domain['user_id']}, {"_id": 0, "email": 1})
        domain['user_email'] = user.get('email') if user else 'Unknown'
        if isinstance(domain.get('created_at'), str):
            domain['created_at'] = datetime.fromisoformat(domain['created_at'])
    
    return domains

@api_router.get("/admin/user/{user_id}/activity")
async def get_user_activity(user_id: str, admin: dict = Depends(get_super_admin)):
    # Get user details
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's domains
    domains = await db.domains.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Get user's traffic logs
    logs = await db.traffic_logs.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(100)
    
    # Get user's API keys
    api_keys = await db.api_keys.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    return {
        "user": user,
        "domains": domains,
        "recent_logs": logs,
        "api_keys": api_keys
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
