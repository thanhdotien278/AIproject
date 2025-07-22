#!/bin/bash

# Conference Registration System - Deployment Script
# Run this script on your Ubuntu droplet

set -e  # Exit on any error

echo "🚀 Starting deployment of Conference Registration System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="conference-registration"
APP_DIR="/var/www/$APP_NAME"
DOMAIN=""  # Will be prompted
EMAIL=""   # Will be prompted

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons."
   print_status "Please run as a regular user with sudo privileges."
   exit 1
fi

# Prompt for domain and email
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
    print_error "Domain and email are required!"
    exit 1
fi

print_status "Domain: $DOMAIN"
print_status "Email: $EMAIL"
print_status "App Directory: $APP_DIR"

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
print_status "Node.js version: $node_version"
print_status "NPM version: $npm_version"

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
print_status "MongoDB installed and started"

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

print_status "✅ System setup completed!"
print_status ""
print_status "Next steps:"
print_status "1. Upload your application code to $APP_DIR"
print_status "2. Copy .env.production.template to .env and configure it"
print_status "3. Run the application setup script"
print_status ""
print_status "Commands to run after uploading code:"
echo "cd $APP_DIR"
echo "npm install --production"
echo "npm run build:css"
echo "cp .env.production.template .env"
echo "nano .env  # Edit environment variables"
echo "npm run seed  # Create admin user"
echo "pm2 start ecosystem.config.js --env production"
echo "sudo cp deploy/nginx.conf /etc/nginx/sites-available/$APP_NAME"
echo "sudo ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/"
echo "sudo nginx -t && sudo systemctl reload nginx"
echo "sudo apt install -y certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email"
echo "pm2 save && pm2 startup"

print_status "🎉 Deployment preparation completed!" 