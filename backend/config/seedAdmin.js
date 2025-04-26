/**
 * Script to create an admin user in the database
 * Run with: node backend/config/seedAdmin.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Default admin credentials
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'Hanoi@1234';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-registration')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Could not connect to MongoDB', err);
    process.exit(1);
  });

// Create admin user
async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: adminUsername });
    
    if (existingAdmin) {
      console.log(`Admin user '${adminUsername}' already exists.`);
      return false;
    }
    
    // Create new admin user
    const adminUser = new User({
      username: adminUsername,
      password: adminPassword,
      isAdmin: true
    });
    
    await adminUser.save();
    
    console.log(`Admin user '${adminUsername}' created successfully.`);
    console.log(`Password: ${adminPassword}`);
    console.log('Login at: /admin/login');
    
    return true;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return false;
  }
}

// Execute function and close connection
createAdminUser()
  .finally(() => {
    mongoose.connection.close();
    console.log('Database connection closed.');
  }); 