#!/bin/bash

# AI Bot Detect - Quick Deployment Script
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
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MongoDB
echo "Step 4/10: Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Create app user
echo "Step 5/10: Creating application user..."
if ! id -u appuser > /dev/null 2>&1; then
    adduser --disabled-password --gecos "" appuser
fi

# Setup application directory
echo "Step 6/10: Setting up application..."
mkdir -p /home/appuser/app
chown -R appuser:appuser /home/appuser/app

echo ""
echo "Please upload your application files to /home/appuser/app"
echo "You can use SCP: scp -r ./backend ./frontend root@$DOMAIN:/home/appuser/app/"
echo ""
read -p "Press Enter after uploading files..."

# Setup backend
echo "Step 7/10: Setting up backend..."
cd /home/appuser/app/backend
sudo -u appuser python3 -m venv venv
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

# Build frontend
echo "Step 8/10: Building frontend..."
cd /home/appuser/app/frontend

# Create frontend .env
cat > /home/appuser/app/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

chown appuser:appuser /home/appuser/app/frontend/.env

sudo -u appuser npm install
sudo -u appuser npm run build

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

nginx -t
systemctl restart nginx

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
echo "Deployment Complete!"
echo "==================================="
echo ""
echo "Your application is now running at:"
echo "  https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Create super admin: cd /home/appuser/app/backend && source venv/bin/activate && python create_super_admin.py"
echo "2. Check backend logs: journalctl -u aibot-backend -f"
echo "3. Check Nginx logs: tail -f /var/log/nginx/error.log"
echo ""
echo "Important files:"
echo "  Backend .env: /home/appuser/app/backend/.env"
echo "  Frontend .env: /home/appuser/app/frontend/.env"
echo "  Nginx config: /etc/nginx/sites-available/aibot-detect"
echo ""
echo "Service commands:"
echo "  systemctl status aibot-backend"
echo "  systemctl restart aibot-backend"
echo "  systemctl restart nginx"
echo ""
