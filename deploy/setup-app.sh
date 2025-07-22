#!/bin/bash

# Application Setup Script for Ubuntu
# Run this after uploading your code to the server

set -e  # Exit on any error

echo "🔧 Setting up Conference Registration Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Please run this script from the project root directory."
    exit 1
fi

# Install build dependencies that might be needed for native modules
print_status "Installing build dependencies..."
sudo apt update
sudo apt install -y build-essential python3-dev libvips-dev

print_status "Installing Node.js dependencies..."

# Clear npm cache
npm cache clean --force

# Install dependencies with specific handling for problematic packages
print_status "Installing dependencies..."

# Install sharp with platform-specific settings for Ubuntu
print_status "Installing sharp for Ubuntu..."
npm install --platform=linux --arch=x64 sharp

# Install bcrypt (rebuild if necessary)
print_status "Installing bcrypt..."
npm install bcrypt

# Install remaining dependencies
npm install --production

print_status "Building CSS..."
npm run build:css

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f "deploy/.env.production.template" ]; then
        print_status "Creating .env file from template..."
        cp deploy/.env.production.template .env
        print_warning "Please edit .env file with your production configuration!"
        echo "Run: nano .env"
    else
        print_error ".env file not found and no template available!"
        print_status "Please create a .env file with the following variables:"
        echo "PORT=3000"
        echo "NODE_ENV=production"
        echo "MONGODB_URI=mongodb://localhost:27017/conference-registration"
        echo "SESSION_SECRET=your-super-secret-session-key"
        echo "ADMIN_USERNAME=admin"
        echo "ADMIN_PASSWORD=your-secure-password"
        echo "EMAIL_SERVICE=gmail"
        echo "EMAIL_USER=your-email@gmail.com"
        echo "EMAIL_PASS=your-app-password"
        exit 1
    fi
fi

# Test if MongoDB is accessible
print_status "Testing MongoDB connection..."
if ! mongosh --eval "db.runCommand({ping: 1})" > /dev/null 2>&1; then
    print_warning "MongoDB connection test failed. Make sure MongoDB is running."
    print_status "Start MongoDB with: sudo systemctl start mongod"
else
    print_status "MongoDB connection successful"
fi

# Create uploads directory if it doesn't exist
print_status "Creating uploads directories..."
mkdir -p frontend/public/uploads/avatars

# Set proper permissions
chmod 755 frontend/public/uploads
chmod 755 frontend/public/uploads/avatars

print_status "Testing application startup..."
timeout 10 npm start &
APP_PID=$!
sleep 5

# Test if app is responding
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Application is responding correctly!"
    kill $APP_PID 2>/dev/null || true
else
    print_warning "Application may not be responding. Check logs after starting with PM2."
    kill $APP_PID 2>/dev/null || true
fi

print_status "🎉 Application setup completed!"
print_status ""
print_status "Next steps:"
print_status "1. Edit .env file: nano .env"
print_status "2. Seed admin user: npm run seed"
print_status "3. Start with PM2: pm2 start ecosystem.config.js --env production"
print_status "4. Configure Nginx: sudo cp deploy/nginx.conf /etc/nginx/sites-available/conference-registration"
print_status "5. Set up SSL: sudo certbot --nginx -d your-domain.com" 