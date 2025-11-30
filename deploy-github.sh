#!/bin/bash

# AI Bot Detect - GitHub Deployment Script
# Run this on your VPS as root user

set -e

echo "==================================="
echo "AI Bot Detect - GitHub Deployment"
echo "==================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get configuration
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " REPO_URL
read -p "Enter branch name (default: main): " BRANCH
BRANCH=${BRANCH:-main}
read -p "Enter your main domain for frontend (e.g., example.com): " MAIN_DOMAIN
read -p "Enter your subdomain for backend API (e.g., api.example.com): " API_DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo "Configuration:"
echo "  Repository: $REPO_URL"
echo "  Branch: $BRANCH"
echo "  Frontend Domain: $MAIN_DOMAIN"
echo "  Backend API Domain: $API_DOMAIN"
echo "  VPS IP: 89.116.21.245"
echo ""
echo "⚠️  IMPORTANT: Before continuing, make sure your DNS is configured:"
echo "  A Record: $MAIN_DOMAIN → 89.116.21.245"
echo "  A Record: www.$MAIN_DOMAIN → 89.116.21.245"
echo "  A Record: $API_DOMAIN → 89.116.21.245"
echo ""
read -p "DNS configured? Continue? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Deployment cancelled"
    echo ""
    echo "Configure your DNS first, then run this script again."
    exit 0
fi

echo ""
echo "Starting deployment..."
echo ""

# Update system
echo "Step 1/11: Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "Step 2/11: Installing dependencies..."
apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx git curl ufw

# Install Node.js
echo "Step 3/11: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install MongoDB
echo "Step 4/11: Installing MongoDB..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update
    apt install -y mongodb-org
fi
systemctl start mongod
systemctl enable mongod

echo "✓ MongoDB installed and running"

# Create app user
echo "Step 5/11: Creating application user..."
if ! id -u appuser > /dev/null 2>&1; then
    adduser --disabled-password --gecos "" appuser
fi

# Clone repository
echo "Step 6/11: Cloning repository from GitHub..."
if [ -d "/home/appuser/app" ]; then
    echo "Removing existing app directory..."
    rm -rf /home/appuser/app
fi

sudo -u appuser git clone -b $BRANCH $REPO_URL /home/appuser/app

if [ ! -d "/home/appuser/app" ]; then
    echo "ERROR: Failed to clone repository"
    exit 1
fi

echo "✓ Repository cloned successfully"

# Verify required files
echo "Verifying project structure..."
if [ ! -f "/home/appuser/app/backend/requirements.txt" ]; then
    echo "ERROR: backend/requirements.txt not found!"
    echo "Make sure your repository has the correct structure"
    exit 1
fi

if [ ! -f "/home/appuser/app/frontend/package.json" ]; then
    echo "ERROR: frontend/package.json not found!"
    echo "Make sure your repository has the correct structure"
    exit 1
fi

echo "✓ Project structure verified"

# Setup backend
echo "Step 7/11: Setting up backend..."
cd /home/appuser/app/backend

# Create virtual environment
sudo -u appuser python3 -m venv venv

# Install dependencies
echo "Installing Python dependencies..."
sudo -u appuser /home/appuser/app/backend/venv/bin/pip install --upgrade pip
sudo -u appuser /home/appuser/app/backend/venv/bin/pip install -r requirements.txt

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create backend .env
echo "Creating backend .env file..."
cat > /home/appuser/app/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=aibot_detect_db
CORS_ORIGINS=https://$MAIN_DOMAIN,https://www.$MAIN_DOMAIN
JWT_SECRET=$JWT_SECRET
EOF

chown appuser:appuser /home/appuser/app/backend/.env

echo "✓ Backend setup complete"

# Create systemd service
echo "Step 8/11: Creating backend service..."
cat > /etc/systemd/system/aibot-backend.service << EOF
[Unit]
Description=AI Bot Detect Backend
After=network.target mongod.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/home/appuser/app/backend
Environment="PATH=/home/appuser/app/backend/venv/bin"
ExecStart=/home/appuser/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start aibot-backend
systemctl enable aibot-backend

# Wait for backend to start
sleep 3

# Check if backend is running
if systemctl is-active --quiet aibot-backend; then
    echo "✓ Backend service started successfully"
else
    echo "✗ Backend service failed to start"
    echo "Checking logs..."
    journalctl -u aibot-backend -n 20
    exit 1
fi

# Build frontend
echo "Step 9/11: Building frontend..."
cd /home/appuser/app/frontend

# Create frontend .env
echo "Creating frontend .env file..."
cat > /home/appuser/app/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$API_DOMAIN
EOF

chown appuser:appuser /home/appuser/app/frontend/.env

# Install and build
echo "Installing npm packages (this may take a few minutes)..."
sudo -u appuser npm install --legacy-peer-deps

echo "Building frontend (this may take a few minutes)..."
sudo -u appuser npm run build

# Verify build
if [ ! -d "/home/appuser/app/frontend/build" ]; then
    echo "ERROR: Frontend build failed!"
    exit 1
fi

echo "✓ Frontend built successfully"

# Configure Nginx
echo "Step 10/11: Configuring Nginx..."

# Frontend configuration
cat > /etc/nginx/sites-available/aibot-frontend << EOF
server {
    listen 80;
    server_name $MAIN_DOMAIN www.$MAIN_DOMAIN;

    root /home/appuser/app/frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF

# Backend API configuration
cat > /etc/nginx/sites-available/aibot-backend << EOF
server {
    listen 80;
    server_name $API_DOMAIN;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Access-Control-Allow-Origin "https://$MAIN_DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    # Backend API proxy
    location / {
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$MAIN_DOMAIN" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
            add_header Access-Control-Max-Age 3600;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF

ln -sf /etc/nginx/sites-available/aibot-frontend /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/aibot-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if nginx -t; then
    echo "✓ Nginx configuration valid"
    systemctl restart nginx
else
    echo "✗ Nginx configuration invalid"
    exit 1
fi

# Setup SSL
echo "Step 11/11: Setting up SSL certificates..."

# SSL for frontend
echo "Installing SSL for frontend ($MAIN_DOMAIN)..."
certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate for frontend installed successfully"
else
    echo "⚠ SSL certificate for frontend failed"
fi

# SSL for backend API
echo "Installing SSL for backend API ($API_DOMAIN)..."
certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate for backend API installed successfully"
else
    echo "⚠ SSL certificate for backend API failed"
fi

# Configure firewall
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "==================================="
echo "✓ Deployment Complete!"
echo "==================================="
echo ""
echo "🎉 Your application is now running at:"
echo "  🌐 Frontend: https://$MAIN_DOMAIN"
echo "  🌐 Frontend (www): https://www.$MAIN_DOMAIN"
echo "  🔌 Backend API: https://$API_DOMAIN"
echo "  � API tDocs: https://$API_DOMAIN/docs"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create super admin account:"
echo "   su - appuser"
echo "   cd /home/appuser/app/backend"
echo "   source venv/bin/activate"
echo "   python create_super_admin.py"
echo "   exit"
echo ""
echo "2. Test your application:"
echo "   curl https://$MAIN_DOMAIN"
echo "   curl https://$API_DOMAIN/docs"
echo ""
echo "📊 Useful commands:"
echo "  systemctl status aibot-backend    # Check backend status"
echo "  journalctl -u aibot-backend -f    # View backend logs"
echo "  tail -f /var/log/nginx/error.log  # View Nginx logs"
echo "  systemctl restart aibot-backend   # Restart backend"
echo "  systemctl restart nginx           # Restart Nginx"
echo ""
echo "🔄 To update from GitHub:"
echo "   cd /home/appuser/app"
echo "   git pull origin $BRANCH"
echo "   # Then restart services"
echo ""
echo "📁 Important files:"
echo "  App directory: /home/appuser/app"
echo "  Backend .env: /home/appuser/app/backend/.env"
echo "  Frontend .env: /home/appuser/app/frontend/.env"
echo "  Frontend Nginx: /etc/nginx/sites-available/aibot-frontend"
echo "  Backend Nginx: /etc/nginx/sites-available/aibot-backend"
echo "  Service file: /etc/systemd/system/aibot-backend.service"
echo ""
echo "🔐 Your JWT Secret: $JWT_SECRET"
echo "   (saved in /home/appuser/app/backend/.env)"
echo ""
echo "📝 DNS Configuration (verify these are set):"
echo "  $MAIN_DOMAIN → 89.116.21.245"
echo "  www.$MAIN_DOMAIN → 89.116.21.245"
echo "  $API_DOMAIN → 89.116.21.245"
echo ""
