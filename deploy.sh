#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# ===== CONFIG =====
EC2_USER="ubuntu"
EC2_IP="15.207.113.209"

LOCAL_BUILD_DIR="dist"
REMOTE_TEMP_DIR="/home/ubuntu/datavault/dashboard_temp"
NGINX_DIR="/var/www/html"

# ==================

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building project..."
npm run build

echo "📤 Uploading dist to EC2..."
ssh $EC2_USER@$EC2_IP "mkdir -p $REMOTE_TEMP_DIR"

scp -r $LOCAL_BUILD_DIR/* $EC2_USER@$EC2_IP:$REMOTE_TEMP_DIR/

echo "⚙️ Deploying on EC2..."
ssh $EC2_USER@$EC2_IP << EOF

echo "🧹 Cleaning old files..."
sudo rm -rf $NGINX_DIR/*

echo "📂 Moving new build..."
sudo cp -r $REMOTE_TEMP_DIR/* $NGINX_DIR/

echo "🔐 Setting permissions..."
sudo chmod -R 755 $NGINX_DIR

echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo "✅ Deployment completed on server!"

EOF

echo "🎉 DONE: Your app is live!"