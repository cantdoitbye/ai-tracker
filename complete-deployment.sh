#!/bin/bash

# Complete the deployment - Nginx and SSL setup
# Run this to finish the deployment

set -e

echo "==================================="
echo "Completing Deployment"
echo "==================================="

# Get configuration
read -p "Enter your main domain for frontend (e.g., example.com): " MAIN_DOMAIN
read -p "Enter your subdomain for backend API (e.g., api.example.com): " API_DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo "Configuration:"
echo "  Frontend Domain: $MAIN_DOMAIN"
echo "  Backend API Domain: $API_DOMAIN"
echo ""

# Configure Nginx
echo "Step 1/3: Configuring Nginx..."

# Frontend configuration
cat > /etc/nginx/conf.d/aibot-frontend.conf << EOF
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
cat > /etc/nginx/conf.d/aibot-backend.conf << EOF
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

echo "✓ Nginx configuration files created"

# Test Nginx config
if nginx -t; then
    echo "✓ Nginx configuration valid"
    systemctl enable nginx
    systemctl start nginx
    systemctl reload nginx
else
    echo "✗ Nginx configuration invalid"
    cat /var/log/nginx/error.log
    exit 1
fi

echo "✓ Nginx started successfully"

# Setup SSL
echo "Step 2/3: Setting up SSL certificates..."

# SSL for frontend
echo "Installing SSL for frontend ($MAIN_DOMAIN)..."
certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate for frontend installed successfully"
else
    echo "⚠ SSL certificate for frontend failed (check DNS configuration)"
fi

# SSL for backend API
echo "Installing SSL for backend API ($API_DOMAIN)..."
certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate for backend API installed successfully"
else
    echo "⚠ SSL certificate for backend API failed (check DNS configuration)"
fi

# Configure firewall
echo "Step 3/3: Configuring firewall..."

if command -v firewall-cmd &> /dev/null; then
    # AlmaLinux/CentOS/RHEL - use firewalld
    systemctl enable firewalld
    systemctl start firewalld
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    echo "✓ Firewalld configured"
else
    # Ubuntu/Debian - use ufw
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "✓ UFW configured"
fi

echo ""
echo "==================================="
echo "✓ Deployment Complete!"
echo "==================================="
echo ""
echo "🎉 Your application is now running at:"
echo "  🌐 Frontend: https://$MAIN_DOMAIN"
echo "  🌐 Frontend (www): https://www.$MAIN_DOMAIN"
echo "  🔌 Backend API: https://$API_DOMAIN"
echo "  📚 API Docs: https://$API_DOMAIN/docs"
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
echo "  systemctl status nginx            # Check Nginx status"
echo "  journalctl -u aibot-backend -f    # View backend logs"
echo "  tail -f /var/log/nginx/error.log  # View Nginx logs"
echo ""
echo "✅ All services are running!"
echo ""
