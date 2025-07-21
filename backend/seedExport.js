/**
 * Script to export all data from the current database
 * Run with: node backend/seedExport.js
 * This will create a backup of all collections in JSON format
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import all models
const User = require('./models/User');
const Conference = require('./models/Conference');
const Participant = require('./models/Participant');
const Location = require('./models/Location');
const Speaker = require('./models/Speaker');
const Counter = require('./models/Counter');

// Create export directory
const exportDir = path.join(__dirname, 'seed-data');

async function ensureExportDir() {
  try {
    await fs.access(exportDir);
  } catch {
    await fs.mkdir(exportDir, { recursive: true });
  }
}

async function exportCollection(model, filename) {
  try {
    console.log(`Exporting ${filename}...`);
    
    let data;
    if (filename === 'conferences.json') {
      // Populate location for conferences
      data = await model.find().populate('location').lean();
    } else {
      data = await model.find().lean();
    }
    
    const filePath = path.join(exportDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✓ Exported ${data.length} records to ${filename}`);
    return data.length;
  } catch (error) {
    console.error(`✗ Error exporting ${filename}:`, error.message);
    return 0;
  }
}

async function createMetadata(stats) {
  const metadata = {
    exportDate: new Date().toISOString(),
    databaseName: mongoose.connection.name,
    collections: stats,
    totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
    instructions: {
      import: "To import this data on a new PC, use: npm run seed:import",
      requirements: [
        "Make sure MongoDB is running",
        "Update .env file with correct MONGODB_URI",
        "Run 'npm install' to install dependencies"
      ]
    }
  };
  
  const metadataPath = path.join(exportDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('✓ Created metadata.json');
}

async function exportAllData() {
  try {
    console.log('Starting database export...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Ensure export directory exists
    await ensureExportDir();
    
    // Export all collections
    const stats = {};
    stats.users = await exportCollection(User, 'users.json');
    stats.locations = await exportCollection(Location, 'locations.json');
    stats.conferences = await exportCollection(Conference, 'conferences.json');
    stats.participants = await exportCollection(Participant, 'participants.json');
    stats.speakers = await exportCollection(Speaker, 'speakers.json');
    stats.counters = await exportCollection(Counter, 'counters.json');
    
    // Create metadata file
    await createMetadata(stats);
    
    console.log('\n=== Export Summary ===');
    console.log(`Export directory: ${exportDir}`);
    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`${collection}: ${count} records`);
    });
    console.log(`Total records: ${Object.values(stats).reduce((sum, count) => sum + count, 0)}`);
    console.log('\n✓ Export completed successfully!');
    console.log('\nTo import on a new PC:');
    console.log('1. Copy the entire "seed-data" folder to the new PC');
    console.log('2. Run: npm run seed:import');
    
  } catch (error) {
    console.error('✗ Export failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the export
exportAllData(); 