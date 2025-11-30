#!/bin/bash

# Update application from GitHub
# Run this script when you push changes to GitHub

set -e

echo "==================================="
echo "Updating from GitHub"
echo "==================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get branch
read -p "Enter branch to pull (default: main): " BRANCH
BRANCH=${BRANCH:-main}

echo ""
echo "Pulling latest changes from $BRANCH..."
echo ""

# Pull latest code
cd /home/appuser/app
sudo -u appuser git fetch origin
sudo -u appuser git pull origin $BRANCH

echo "✓ Code updated"

# Ask what to update
echo ""
echo "What do you want to update?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both backend and frontend"
read -p "Enter choice (1-3): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "Updating backend..."
        cd /home/appuser/app/backend
        
        # Update Python dependencies
        sudo -u appuser /home/appuser/app/backend/venv/bin/pip install -r requirements.txt
        
        # Restart backend service
        systemctl restart aibot-backend
        
        echo "✓ Backend updated and restarted"
        ;;
    2)
        echo ""
        echo "Updating frontend..."
        cd /home/appuser/app/frontend
        
        # Install dependencies and rebuild
        sudo -u appuser npm install --legacy-peer-deps
        sudo -u appuser npm run build
        
        # Reload Nginx
        systemctl reload nginx
        
        echo "✓ Frontend updated and rebuilt"
        ;;
    3)
        echo ""
        echo "Updating both backend and frontend..."
        
        # Update backend
        cd /home/appuser/app/backend
        sudo -u appuser /home/appuser/app/backend/venv/bin/pip install -r requirements.txt
        systemctl restart aibot-backend
        echo "✓ Backend updated"
        
        # Update frontend
        cd /home/appuser/app/frontend
        sudo -u appuser npm install --legacy-peer-deps
        sudo -u appuser npm run build
        systemctl reload nginx
        echo "✓ Frontend updated"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "==================================="
echo "✓ Update Complete!"
echo "==================================="
echo ""
echo "Check status:"
echo "  systemctl status aibot-backend"
echo "  systemctl status nginx"
echo ""
