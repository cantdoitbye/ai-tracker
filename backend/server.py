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
import re
from html.parser import HTMLParser
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import hashlib
import json

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

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:3000')

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    client.close()

# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# code update by Subhro adding global memory for BEHAVIORAL (RAG) ANALYSIS
from collections import defaultdict
import time

REQUEST_HISTORY = defaultdict(list)


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
    password_hash: Optional[str] = None  # Optional for OAuth users
    oauth_provider: Optional[str] = None  # 'google', 'email', etc.
    google_id: Optional[str] = None  # Google user ID
    is_super_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str
    email: str
    google_id: str

class UserResponse(BaseModel):
    id: str
    email: str
    is_super_admin: bool
    created_at: datetime

class Blog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    content: str  # Rich HTML content
    excerpt: str
    featured_image: Optional[str] = None
    author_id: str
    author_name: str
    status: str = "draft"  # draft or published
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    view_count: int = 0
    reading_time: int = 0  # in minutes
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    content: str
    excerpt: str
    featured_image: Optional[str] = None
    status: str = "draft"
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    published_at: Optional[datetime] = None

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    status: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    published_at: Optional[datetime] = None

class BlogResponse(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    excerpt: str
    featured_image: Optional[str]
    author_id: str
    author_name: str
    status: str
    seo_title: Optional[str]
    seo_description: Optional[str]
    seo_keywords: List[str]
    tags: List[str]
    view_count: int
    reading_time: int
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class BlogListResponse(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: str
    featured_image: Optional[str]
    author_name: str
    status: str
    tags: List[str]
    view_count: int
    reading_time: int
    published_at: Optional[datetime]
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
    fingerprint: Optional[str] = None  # change by Subhro
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

# Blog Helper Functions
class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    
    def handle_data(self, data):
        self.text.append(data)
    
    def get_text(self):
        return ''.join(self.text)

def strip_html(html: str) -> str:
    """Remove HTML tags from string"""
    stripper = HTMLStripper()
    stripper.feed(html)
    return stripper.get_text()

def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = slug.strip('-')
    return slug

# code update by Subhro for bot fingerprint for detecting rotating IP by the identifier created

def generate_fingerprint(user_agent: str, headers: dict, ip: str) -> str:
    payload = {
        "ua": user_agent,
        "accept": headers.get("accept"),
        "lang": headers.get("accept-language"),
        "encoding": headers.get("accept-encoding"),
        "ip_block": ".".join(ip.split(".")[:2])
    }
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def calculate_reading_time(content: str) -> int:
    """Calculate reading time in minutes (avg 200 words/min)"""
    text = strip_html(content)
    word_count = len(text.split())
    reading_time = max(1, round(word_count / 200))
    return reading_time

#code updated by subhro (FIX one IP issues BUG)

def get_real_ip(headers: dict, fallback_ip: str) -> str:
    if "cf-connecting-ip" in headers:
        return headers["cf-connecting-ip"]
    if "x-forwarded-for" in headers:
        return headers["x-forwarded-for"].split(",")[0].strip()
    if "x-real-ip" in headers:
        return headers["x-real-ip"]
    return fallback_ip

# code update by Subhro (The function analyze_behavior looks at recent request patterns for a given client 
# (identified by a fingerprint) over the last 60 seconds and labels the behavior as Advanced RAG or LLM prefetch)

def analyze_behavior(fingerprint: str, path: str) -> str:
    now = time.time()
    history = REQUEST_HISTORY[fingerprint]

    history.append((now, path))
    history[:] = [h for h in history if now - h[0] < 60]

    req_count = len(history)
    unique_paths = len(set(p for _, p in history))

    if req_count > 25 and unique_paths > 6:
        return "advanced-rag-crawler"

    if req_count > 12 and unique_paths <= 3:
        return "llm-prefetch"

    return "normal"


def extract_excerpt(content: str, length: int = 160) -> str:
    """Extract excerpt from content"""
    text = strip_html(content)
    if len(text) <= length:
        return text
    return text[:length].rsplit(' ', 1)[0] + '...'

# code update by Subhro because (bot detection should identify who the client claims to be, 
# while behavior analysis determines what they are doing)

BOT_SIGNATURES = {
    "GPTBot": ["gptbot"],
    "ChatGPT-User": ["chatgpt-user"],
    "OpenAI-SearchBot": ["openai-search"],
    "ClaudeBot": ["claudebot"],
    "Google-Extended": ["google-extended"],
    "GoogleOther": ["googleother"],
    "Google-CloudVertexBot": ["cloudvertex"],
    "FacebookBot": ["facebookbot"],
    "Meta-ExternalAgent": ["meta-externalagent"],
    "Amazonbot": ["amazonbot"],
    "Applebot-Extended": ["applebot"],
    "bingbot": ["bingbot"],
    "msnbot": ["msnbot"],
    "PerplexityBot": ["perplexity"],
    "YouBot": ["youbot"],
    "AndiBot": ["andibot"],
    "NeevaBot": ["neeva"],
    "PhindBot": ["phind"],
    "KagiBot": ["kagi"],
    "BraveBot": ["bravebot"],
    "BraveGPTBot": ["brave-gpt"],
    "DuckAssistBot": ["duckassist"],
    "CCBot": ["ccbot"],
    "CommonCrawl": ["commoncrawl"],
    "DataForSeoBot": ["dataforseo"],
    "SemrushBot": ["semrush"],
    "AhrefsBot": ["ahrefs"],
    "MJ12bot": ["mj12bot"],
    "DotBot": ["dotbot"],
    "BLEXBot": ["blexbot"]
}

def detect_bot(user_agent: str, ip_address: str):
    ua = (user_agent or "").lower()
    detected_bot = None

    for bot, patterns in BOT_SIGNATURES.items():
        if any(p in ua for p in patterns):
            detected_bot = bot
            break

    confidence = 0.0
    risk = "low"

    if detected_bot:
        confidence += 0.7
        risk = "medium"

    if any(x in ua for x in ["headless", "puppeteer", "playwright", "selenium"]):
        confidence += 0.2
        risk = "high"

    return detected_bot, "AI / RAG Bot", min(confidence, 1.0), risk

# code change by Subhro (ADMIN RADIO BUTTON to block bots)

async def is_bot_blocked(bot_name: str):
    if not bot_name:
        return False
    policy = await db.bot_policies.find_one({"bot_name": bot_name})
    return policy and policy.get("action") == "block"


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
        password_hash=hash_password(user_data.password),
        oauth_provider="email"
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return UserResponse(**user.model_dump())

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user registered with OAuth
    if user.get('oauth_provider') == 'google' and not user.get('password_hash'):
        raise HTTPException(status_code=401, detail="Please sign in with Google")
    
    if not verify_password(credentials.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user['id'], "email": user['email']})
    return {"access_token": token, "token_type": "bearer", "user": UserResponse(**user).model_dump()}

@api_router.post("/auth/google")
async def google_auth(auth_data: GoogleAuthRequest):
    """Authenticate user with Google OAuth token"""
    try:
        email = auth_data.email
        google_user_id = auth_data.google_id
        
        # Check if user exists
        user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if user:
            # User exists - update google_id if not set
            if not user.get('google_id'):
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"google_id": google_user_id, "oauth_provider": "google"}}
                )
                user['google_id'] = google_user_id
                user['oauth_provider'] = "google"
        else:
            # Create new user
            user = User(
                email=email,
                oauth_provider="google",
                google_id=google_user_id
            )
            
            doc = user.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.users.insert_one(doc)
            user = doc
        
        # Generate JWT token
        token = create_access_token({"sub": user['id'], "email": user['email']})
        
        return {
            "access_token": token, 
            "token_type": "bearer", 
            "user": UserResponse(**user).model_dump()
        }
        
    except Exception as e:
        logging.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

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
    
    verification_errors = []
    
    # Try DNS TXT verification
    try:
        import dns.resolver
        
        # Create resolver with custom settings to avoid caching issues
        resolver = dns.resolver.Resolver()
        resolver.cache = dns.resolver.Cache()  # Fresh cache
        resolver.lifetime = 10  # 10 second timeout
        
        verification_string = f"aibot-detect={domain['verification_token']}"
        
        try:
            answers = resolver.resolve(domain['domain'], 'TXT')
            found_records = []
            
            for rdata in answers:
                for txt_string in rdata.strings:
                    txt_decoded = txt_string.decode('utf-8') if isinstance(txt_string, bytes) else txt_string
                    found_records.append(txt_decoded)
                    
                    if verification_string in txt_decoded:
                        # Verified!
                        await db.domains.update_one(
                            {"id": domain_id},
                            {"$set": {
                                "is_verified": True,
                                "verified_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        return {"verified": True, "method": "DNS", "message": "Domain verified via DNS TXT record"}
            
            # Record found but doesn't match
            if found_records:
                verification_errors.append(f"DNS TXT records found but don't match. Found: {', '.join(found_records[:3])}")
            else:
                verification_errors.append("No TXT records found for domain")
                
        except dns.resolver.NXDOMAIN:
            verification_errors.append(f"Domain {domain['domain']} does not exist")
        except dns.resolver.NoAnswer:
            verification_errors.append("No TXT records found for domain")
        except dns.resolver.Timeout:
            verification_errors.append("DNS query timed out. Please try again.")
        except Exception as dns_err:
            verification_errors.append(f"DNS lookup error: {str(dns_err)}")
            
    except ImportError:
        verification_errors.append("DNS verification not available (dnspython not installed)")
    except Exception as e:
        logging.error(f"DNS verification error: {e}")
        verification_errors.append(f"DNS verification failed: {str(e)}")
    
    # Try file verification
    try:
        file_url = f"https://{domain['domain']}/.well-known/aibot-detect.txt"
        response = requests.get(file_url, timeout=5, verify=True)
        
        if response.status_code == 200:
            if domain['verification_token'] in response.text:
                await db.domains.update_one(
                    {"id": domain_id},
                    {"$set": {
                        "is_verified": True,
                        "verified_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {"verified": True, "method": "FILE", "message": "Domain verified via file"}
            else:
                verification_errors.append(f"File found but token doesn't match. Expected: {domain['verification_token']}")
        else:
            verification_errors.append(f"File not found (HTTP {response.status_code})")
    except requests.exceptions.SSLError:
        verification_errors.append("SSL certificate error. Ensure your domain has a valid SSL certificate.")
    except requests.exceptions.ConnectionError:
        verification_errors.append(f"Cannot connect to {domain['domain']}. Ensure the domain is accessible.")
    except requests.exceptions.Timeout:
        verification_errors.append("File verification timed out")
    except Exception as e:
        logging.error(f"File verification error: {e}")
        verification_errors.append(f"File verification failed: {str(e)}")
    
    # Return detailed error message
    error_message = " | ".join(verification_errors) if verification_errors else "Verification failed"
    return {
        "verified": False, 
        "message": error_message,
        "expected_txt_record": f"aibot-detect={domain['verification_token']}",
        "expected_file_url": f"https://{domain['domain']}/.well-known/aibot-detect.txt",
        "expected_file_content": domain['verification_token']
    }

@api_router.get("/domains/{domain_id}/check-dns")
async def check_domain_dns(domain_id: str, user: dict = Depends(get_current_user)):
    """Check current DNS TXT records for debugging"""
    domain = await db.domains.find_one({"id": domain_id, "user_id": user['id']}, {"_id": 0})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    result = {
        "domain": domain['domain'],
        "expected_record": f"aibot-detect={domain['verification_token']}",
        "found_records": [],
        "status": "unknown"
    }
    
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver()
        resolver.cache = dns.resolver.Cache()
        
        answers = resolver.resolve(domain['domain'], 'TXT')
        for rdata in answers:
            for txt_string in rdata.strings:
                txt_decoded = txt_string.decode('utf-8') if isinstance(txt_string, bytes) else txt_string
                result["found_records"].append(txt_decoded)
        
        if result["found_records"]:
            result["status"] = "records_found"
            if result["expected_record"] in result["found_records"]:
                result["status"] = "match_found"
        else:
            result["status"] = "no_records"
            
    except dns.resolver.NXDOMAIN:
        result["status"] = "domain_not_found"
        result["error"] = "Domain does not exist"
    except dns.resolver.NoAnswer:
        result["status"] = "no_txt_records"
        result["error"] = "No TXT records found"
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
    
    return result

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

    # code update by Subhro adding fingerprint during logging
    # Find fingerprint
    fingerprint = generate_fingerprint(log_data.user_agent, headers, real_ip)
    
    # Find behavior 
    behavior = analyze_behavior(fingerprint, log_data.request_path)


    
    # Earlier code Detect bot
    # detected_bot, bot_provider, confidence, risk_level = detect_bot(log_data.user_agent, log_data.ip_address)

    # New code update by Subhro 

    headers = dict(Request.scope.get("headers", {})) if hasattr(Request, "scope") else {}
    real_ip = get_real_ip(headers, log_data.ip_address)
    detected_bot, bot_provider, confidence, risk_level = detect_bot(log_data.user_agent, real_ip)

    
    # Get geolocation
    geo_location = get_geo_location(log_data.ip_address)
    
    traffic_log = TrafficLog(
        domain_id=domain['id'],
        user_id=domain['user_id'],
        ip_address=real_ip,
        user_agent=log_data.user_agent,
        detected_bot=detected_bot,
        bot_provider=bot_provider,
        confidence_score=confidence,
        risk_level=risk_level,
        geo_location=geo_location,
        request_path=log_data.request_path,
        fingerprint=fingerprint,                   # Update by Subhro
        risk_level=behavior,                       # Update by Subhro
        request_method=log_data.request_method
        
    )
    
    doc = traffic_log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.traffic_logs.insert_one(doc)
    
    # Check alerts if bot detected
    if detected_bot and confidence > 0.5:
        await check_and_send_alerts(domain['user_id'], domain['id'])
    
    return {"success": True, "bot_detected": detected_bot is not None, "confidence": confidence}

    # code update by Subhro (if request as coming from a known bot and an admin has marked that bot as blocked, 
    # immediately deny the request)

    if detected_bot and await is_bot_blocked(detected_bot):
    raise HTTPException(status_code=403, detail="Bot access blocked")


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

# Blog Routes - Super Admin Only
@api_router.post("/admin/blogs", response_model=BlogResponse)
async def create_blog(blog_data: BlogCreate, admin: dict = Depends(get_super_admin)):
    # Generate slug if not provided
    slug = blog_data.slug or generate_slug(blog_data.title)
    
    # Check if slug already exists
    existing = await db.blogs.find_one({"slug": slug})
    if existing:
        # Add random suffix to make it unique
        slug = f"{slug}-{secrets.token_urlsafe(4)}"
    
    # Calculate reading time
    reading_time = calculate_reading_time(blog_data.content)
    
    # Create blog
    blog = Blog(
        title=blog_data.title,
        slug=slug,
        content=blog_data.content,
        excerpt=blog_data.excerpt,
        featured_image=blog_data.featured_image,
        author_id=admin['id'],
        author_name=admin['email'].split('@')[0],
        status=blog_data.status,
        seo_title=blog_data.seo_title or blog_data.title,
        seo_description=blog_data.seo_description or blog_data.excerpt,
        seo_keywords=blog_data.seo_keywords,
        tags=blog_data.tags,
        reading_time=reading_time,
        published_at=blog_data.published_at if blog_data.status == "published" else None
    )
    
    doc = blog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('published_at'):
        doc['published_at'] = doc['published_at'].isoformat()
    
    await db.blogs.insert_one(doc)
    
    return BlogResponse(**blog.model_dump())

@api_router.put("/admin/blogs/{blog_id}", response_model=BlogResponse)
async def update_blog(blog_id: str, blog_data: BlogUpdate, admin: dict = Depends(get_super_admin)):
    # Get existing blog
    existing = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Prepare update data
    update_data = {k: v for k, v in blog_data.model_dump().items() if v is not None}
    
    # Update slug if title changed
    if 'title' in update_data and 'slug' not in update_data:
        update_data['slug'] = generate_slug(update_data['title'])
    
    # Check slug uniqueness if slug is being updated
    if 'slug' in update_data and update_data['slug'] != existing['slug']:
        slug_exists = await db.blogs.find_one({"slug": update_data['slug'], "id": {"$ne": blog_id}})
        if slug_exists:
            update_data['slug'] = f"{update_data['slug']}-{secrets.token_urlsafe(4)}"
    
    # Recalculate reading time if content changed
    if 'content' in update_data:
        update_data['reading_time'] = calculate_reading_time(update_data['content'])
    
    # Update published_at if status changed to published
    if 'status' in update_data and update_data['status'] == 'published' and not existing.get('published_at'):
        update_data['published_at'] = datetime.now(timezone.utc).isoformat()
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.blogs.update_one({"id": blog_id}, {"$set": update_data})
    
    # Get updated blog
    updated_blog = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    
    # Convert datetime strings back to datetime objects
    for field in ['created_at', 'updated_at', 'published_at']:
        if updated_blog.get(field) and isinstance(updated_blog[field], str):
            updated_blog[field] = datetime.fromisoformat(updated_blog[field])
    
    return BlogResponse(**updated_blog)

@api_router.delete("/admin/blogs/{blog_id}")
async def delete_blog(blog_id: str, admin: dict = Depends(get_super_admin)):
    result = await db.blogs.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"success": True}

@api_router.get("/admin/blogs", response_model=List[BlogListResponse])
async def get_all_blogs_admin(
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_super_admin)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}}
        ]
    
    blogs = await db.blogs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for blog in blogs:
        for field in ['created_at', 'updated_at', 'published_at']:
            if blog.get(field) and isinstance(blog[field], str):
                blog[field] = datetime.fromisoformat(blog[field])
    
    return [BlogListResponse(**blog) for blog in blogs]

@api_router.get("/admin/blogs/{blog_id}", response_model=BlogResponse)
async def get_blog_by_id_admin(blog_id: str, admin: dict = Depends(get_super_admin)):
    blog = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    for field in ['created_at', 'updated_at', 'published_at']:
        if blog.get(field) and isinstance(blog[field], str):
            blog[field] = datetime.fromisoformat(blog[field])
    
    return BlogResponse(**blog)

# Blog Routes - Public
@api_router.get("/blogs", response_model=List[BlogListResponse])
async def get_published_blogs(
    page: int = 1,
    limit: int = 10,
    tag: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"status": "published"}
    
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    
    blogs = await db.blogs.find(query, {"_id": 0}).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for blog in blogs:
        for field in ['created_at', 'updated_at', 'published_at']:
            if blog.get(field) and isinstance(blog[field], str):
                blog[field] = datetime.fromisoformat(blog[field])
    
    return [BlogListResponse(**blog) for blog in blogs]

@api_router.get("/blogs/recent", response_model=List[BlogListResponse])
async def get_recent_blogs():
    blogs = await db.blogs.find(
        {"status": "published"}, 
        {"_id": 0}
    ).sort("published_at", -1).limit(3).to_list(3)
    
    for blog in blogs:
        for field in ['created_at', 'updated_at', 'published_at']:
            if blog.get(field) and isinstance(blog[field], str):
                blog[field] = datetime.fromisoformat(blog[field])
    
    return [BlogListResponse(**blog) for blog in blogs]

@api_router.get("/blogs/{slug}", response_model=BlogResponse)
async def get_blog_by_slug(slug: str):
    blog = await db.blogs.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Increment view count
    await db.blogs.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    blog['view_count'] += 1
    
    for field in ['created_at', 'updated_at', 'published_at']:
        if blog.get(field) and isinstance(blog[field], str):
            blog[field] = datetime.fromisoformat(blog[field])
    
    return BlogResponse(**blog)

@api_router.get("/blogs/tags/all")
async def get_all_tags():
    # Get all published blogs
    blogs = await db.blogs.find({"status": "published"}, {"_id": 0, "tags": 1}).to_list(10000)
    
    # Count tags
    tag_counter = Counter()
    for blog in blogs:
        for tag in blog.get('tags', []):
            tag_counter[tag] += 1
    
    # Return sorted by count
    tags = [{"name": tag, "count": count} for tag, count in tag_counter.most_common()]
    return tags

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


