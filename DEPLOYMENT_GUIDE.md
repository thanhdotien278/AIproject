# DigitalOcean Deployment Guide

This guide will help you deploy your Conference Registration System to a DigitalOcean Ubuntu droplet.

## Prerequisites

- A DigitalOcean account
- A domain name pointed to your droplet's IP
- Basic knowledge of SSH and command line

## Step 1: Create DigitalOcean Droplet

1. **Create a new droplet:**
   - Choose Ubuntu 22.04 LTS
   - Select at least **Basic** plan with **2GB RAM** (recommended for Node.js + MongoDB)
   - Choose a datacenter region close to your users
   - Add your SSH key for secure access
   - Give your droplet a meaningful name

2. **Point your domain to the droplet:**
   - Add an A record pointing your domain to the droplet's IP address
   - Add a CNAME record for `www` pointing to your domain

## Step 2: Initial Server Setup

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Create a non-root user with sudo privileges:
```bash
adduser your-username
usermod -aG sudo your-username
```

Copy SSH keys to the new user:
```bash
rsync --archive --chown=your-username:your-username ~/.ssh /home/your-username
```

Exit and reconnect as the new user:
```bash
exit
ssh your-username@your-droplet-ip
```

## Step 3: Run Automated Setup Script

Upload the deployment script to your server and run it:

```bash
# Download and run the setup script
wget https://raw.githubusercontent.com/your-repo/conference-registration/main/deploy/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Update the system
- Install Node.js 18.x
- Install MongoDB
- Install Nginx
- Install PM2
- Create necessary directories

## Step 4: Upload Your Application

### Option A: Using Git (Recommended)

```bash
cd /var/www/conference-registration
git clone https://github.com/your-username/your-repo.git .
```

### Option B: Using SCP

From your local machine:
```bash
scp -r /path/to/your/project/* your-username@your-droplet-ip:/var/www/conference-registration/
```

## Step 5: Configure the Application

```bash
cd /var/www/conference-registration

# Install dependencies
npm install --production

# Build CSS
npm run build:css

# Create environment file
cp deploy/.env.production.template .env

# Edit environment variables
nano .env
```

**Important environment variables to configure:**
- `SESSION_SECRET`: Generate a strong random string
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: Set secure admin credentials
- `EMAIL_USER` and `EMAIL_PASS`: Configure your email settings
- `MONGODB_URI`: Update if using MongoDB authentication

## Step 6: Set Up MongoDB (Optional Security)

For production security, create a MongoDB user:

```bash
# Connect to MongoDB
mongosh

# Switch to admin database
use admin

# Create admin user
db.createUser({
  user: "admin",
  pwd: "secure-admin-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create application database user
use conference-registration
db.createUser({
  user: "conference_user",
  pwd: "secure-user-password",
  roles: ["readWrite"]
})

# Exit MongoDB
exit
```

Update your `.env` file with authentication:
```env
MONGODB_URI=mongodb://conference_user:secure-user-password@localhost:27017/conference-registration
```

## Step 7: Initialize the Application

```bash
# Create admin user
npm run seed

# Test the application
npm start
```

Open another terminal and test:
```bash
curl http://localhost:3000
```

If it works, stop the application (Ctrl+C) and proceed to PM2 setup.

## Step 8: Set Up Process Management with PM2

```bash
# Start the application with PM2
pm2 start ecosystem.config.js --env production

# View application status
pm2 status

# View logs
pm2 logs conference-registration

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 9: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp deploy/nginx.conf /etc/nginx/sites-available/conference-registration

# Update the configuration with your domain
sudo nano /etc/nginx/sites-available/conference-registration
# Replace "your-domain.com" with your actual domain

# Enable the site
sudo ln -s /etc/nginx/sites-available/conference-registration /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 10: Set Up SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com --email your-email@example.com --agree-tos --no-eff-email

# Test SSL renewal
sudo certbot renew --dry-run
```

## Step 11: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Check firewall status
sudo ufw status
```

## Step 12: Final Testing

1. **Test your website:**
   - Visit `https://your-domain.com`
   - Test registration functionality
   - Test admin login at `https://your-domain.com/admin/login`

2. **Monitor the application:**
   ```bash
   # Check PM2 status
   pm2 status
   
   # View logs
   pm2 logs
   
   # Check Nginx status
   sudo systemctl status nginx
   
   # Check MongoDB status
   sudo systemctl status mongod
   ```

## Maintenance Commands

### Updating the Application

```bash
cd /var/www/conference-registration

# Pull latest changes
git pull

# Install any new dependencies
npm install --production

# Rebuild CSS if needed
npm run build:css

# Restart the application
pm2 restart conference-registration
```

### Backup Database

```bash
# Create backup directory
mkdir -p /home/your-username/backups

# Backup MongoDB
mongodump --db conference-registration --out /home/your-username/backups/$(date +%Y%m%d_%H%M%S)
```

### View Logs

```bash
# PM2 logs
pm2 logs conference-registration

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo journalctl -u mongod -f
```

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs conference-registration

# Check if MongoDB is running
sudo systemctl status mongod

# Check environment variables
cat .env
```

### Nginx errors
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### MongoDB connection issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew
```

## Performance Optimization

### Enable MongoDB journaling (for production)
```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf

# Ensure these settings are enabled:
# storage.journal.enabled: true
# replication.replSetName: "rs0"  # if using replica sets

# Restart MongoDB
sudo systemctl restart mongod
```

### PM2 Monitoring
```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Security Recommendations

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure fail2ban for SSH protection:**
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

3. **Regular backups:**
   - Set up automated database backups
   - Consider using DigitalOcean Snapshots

4. **Monitor logs regularly:**
   - Check application logs for errors
   - Monitor access logs for suspicious activity

Your Conference Registration System should now be live and accessible at your domain! 