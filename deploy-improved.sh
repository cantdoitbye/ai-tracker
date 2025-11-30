#!/bin/bash

# AI Bot Detect - Improved Deployment Script
# Run this on your VPS as root user

set -e

echo "==================================="
echo "AI Bot Detect - VPS Deployment"
echo "==================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo "Starting deployment for $DOMAIN..."
echo ""

# Update system
echo "Step 1/10: Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "Step 2/10: Installing dependencies..."
apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx git curl ufw

# Install Node.js
echo "Step 3/10: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Install MongoDB
echo "Step 4/10: Installing MongoDB..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update
    apt install -y mongodb-org
fi
systemctl start mongod
systemctl enable mongod

# Create app user
echo "Step 5/10: Creating application user..."
if ! id -u appuser > /dev/null 2>&1; then
    adduser --disabled-password --gecos "" appuser
fi

# Check if files exist in current directory
echo "Step 6/10: Checking for application files..."

if [ -d "./backend" ] && [ -d "./frontend" ]; then
    echo "Found backend and frontend folders in current directory"
    echo "Copying to /home/appuser/app..."
    mkdir -p /home/appuser/app
    cp -r ./backend /home/appuser/app/
    cp -r ./frontend /home/appuser/app/
    chown -R appuser:appuser /home/appuser/app
elif [ -d "/root/backend" ] && [ -d "/root/frontend" ]; then
    echo "Found backend and frontend folders in /root"
    echo "Moving to /home/appuser/app..."
    mkdir -p /home/appuser/app
    mv /root/backend /home/appuser/app/
    mv /root/frontend /home/appuser/app/
    chown -R appuser:appuser /home/appuser/app
else
    echo ""
    echo "ERROR: Application files not found!"
    echo ""
    echo "Please upload your files first using one of these methods:"
    echo ""
    echo "Method 1 - From your local machine:"
    echo "  scp -r backend frontend root@$DOMAIN:/root/"
    echo ""
    echo "Method 2 - Using Git:"
    echo "  cd /root"
    echo "  git clone YOUR_REPO_URL"
    echo "  cd YOUR_REPO_NAME"
    echo "  ./deploy-improved.sh"
    echo ""
    exit 1
fi

# Verify files exist
if [ ! -f "/home/appuser/app/backend/requirements.txt" ]; then
    echo "ERROR: backend/requirements.txt not found!"
    exit 1
fi

if [ ! -f "/home/appuser/app/frontend/package.json" ]; then
    echo "ERROR: frontend/package.json not found!"
    exit 1
fi

echo "Application files verified successfully!"

# Setup backend
echo "Step 7/10: Setting up backend..."
cd /home/appuser/app/backend

# Create virtual environment
sudo -u appuser python3 -m venv venv

# Install dependencies
sudo -u appuser /home/appuser/app/backend/venv/bin/pip install --upgrade pip
sudo -u appuser /home/appuser/app/backend/venv/bin/pip install -r requirements.txt

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create backend .env
cat > /home/appuser/app/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=aibot_detect_db
CORS_ORIGINS=https://$DOMAIN
JWT_SECRET=$JWT_SECRET
EOF

chown appuser:appuser /home/appuser/app/backend/.env

# Create systemd service
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
    echo "Check logs: journalctl -u aibot-backend -n 50"
    exit 1
fi

# Build frontend
echo "Step 8/10: Building frontend..."
cd /home/appuser/app/frontend

# Create frontend .env
cat > /home/appuser/app/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
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
echo "Step 9/10: Configuring Nginx..."
cat > /etc/nginx/sites-available/aibot-detect << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root /home/appuser/app/frontend/build;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/aibot-detect /etc/nginx/sites-enabled/
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
echo "Step 10/10: Setting up SSL..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

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
echo "Your application is now running at:"
echo "  🌐 https://$DOMAIN"
echo "  📚 API Docs: https://$DOMAIN/api/docs"
echo ""
echo "Next steps:"
echo "1. Create super admin:"
echo "   su - appuser"
echo "   cd /home/appuser/app/backend"
echo "   source venv/bin/activate"
echo "   python create_super_admin.py"
echo ""
echo "2. Check if everything is working:"
echo "   curl https://$DOMAIN/api/docs"
echo ""
echo "Useful commands:"
echo "  systemctl status aibot-backend    # Check backend status"
echo "  journalctl -u aibot-backend -f    # View backend logs"
echo "  tail -f /var/log/nginx/error.log  # View Nginx logs"
echo ""
echo "Configuration files:"
echo "  Backend .env: /home/appuser/app/backend/.env"
echo "  Frontend .env: /home/appuser/app/frontend/.env"
echo "  Nginx config: /etc/nginx/sites-available/aibot-detect"
echo ""
