/**
 * Script to import all data to a new database
 * Run with: node backend/seedImport.js
 * This will populate the database with data from the seed-data folder
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

// Import directory
const importDir = path.join(__dirname, 'seed-data');

async function checkImportDir() {
  try {
    await fs.access(importDir);
    console.log('✓ Found seed-data directory');
  } catch {
    console.error('✗ seed-data directory not found!');
    console.error('Please make sure you have:');
    console.error('1. Exported data using: npm run seed:export');
    console.error('2. Or copied the seed-data folder from another PC');
    process.exit(1);
  }
}

async function loadJsonFile(filename) {
  try {
    const filePath = path.join(importDir, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠ ${filename} not found, skipping...`);
      return [];
    }
    throw error;
  }
}

async function importCollection(model, filename, options = {}) {
  try {
    console.log(`Importing ${filename}...`);
    
    const data = await loadJsonFile(filename);
    if (data.length === 0) {
      console.log(`⚠ No data to import for ${filename}`);
      return 0;
    }
    
    // Check if collection already has data
    const existingCount = await model.countDocuments();
    if (existingCount > 0 && !options.force) {
      console.log(`⚠ ${model.modelName} collection already has ${existingCount} documents. Skipping...`);
      console.log(`  Use --force flag to override existing data`);
      return 0;
    }
    
    // Clear existing data if force flag is used
    if (existingCount > 0 && options.force) {
      await model.deleteMany({});
      console.log(`  Cleared ${existingCount} existing documents`);
    }
    
    // Process data before insertion
    const processedData = data.map(item => {
      // Remove _id for new insertion, keep original IDs in a comment
      const { _id, __v, ...cleanItem } = item;
      
      // Handle special cases for specific models
      if (model.modelName === 'Conference' && item.location) {
        // If location is populated, we need to use just the ObjectId
        if (typeof item.location === 'object' && item.location._id) {
          cleanItem.location = item.location._id;
        }
      }
      
      return cleanItem;
    });
    
    // Insert data
    const result = await model.insertMany(processedData, { ordered: false });
    console.log(`✓ Imported ${result.length} records to ${model.modelName}`);
    return result.length;
    
  } catch (error) {
    console.error(`✗ Error importing ${filename}:`, error.message);
    return 0;
  }
}

async function showMetadata() {
  try {
    const metadata = await loadJsonFile('metadata.json');
    console.log('\n=== Import Metadata ===');
    console.log(`Export Date: ${new Date(metadata.exportDate).toLocaleString()}`);
    console.log(`Source Database: ${metadata.databaseName || 'Unknown'}`);
    console.log(`Total Records: ${metadata.totalRecords || 'Unknown'}`);
    
    if (metadata.collections) {
      console.log('\nAvailable Collections:');
      Object.entries(metadata.collections).forEach(([collection, count]) => {
        console.log(`  ${collection}: ${count} records`);
      });
    }
    console.log('');
  } catch (error) {
    console.log('⚠ No metadata file found\n');
  }
}

async function importAllData() {
  try {
    console.log('Starting database import...\n');
    
    // Check for force flag
    const forceMode = process.argv.includes('--force');
    if (forceMode) {
      console.log('⚠ FORCE MODE: Will overwrite existing data\n');
    }
    
    // Check import directory
    await checkImportDir();
    
    // Show metadata
    await showMetadata();
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Import collections in dependency order
    const stats = {};
    
    // 1. Import Users first (no dependencies)
    stats.users = await importCollection(User, 'users.json', { force: forceMode });
    
    // 2. Import Locations (no dependencies)
    stats.locations = await importCollection(Location, 'locations.json', { force: forceMode });
    
    // 3. Import Speakers (no dependencies)
    stats.speakers = await importCollection(Speaker, 'speakers.json', { force: forceMode });
    
    // 4. Import Conferences (depends on Locations)
    stats.conferences = await importCollection(Conference, 'conferences.json', { force: forceMode });
    
    // 5. Import Participants (depends on Conferences)
    stats.participants = await importCollection(Participant, 'participants.json', { force: forceMode });
    
    // 6. Import Counters (should be last to maintain participant ID sequences)
    stats.counters = await importCollection(Counter, 'counters.json', { force: forceMode });
    
    console.log('\n=== Import Summary ===');
    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`${collection}: ${count} records imported`);
    });
    console.log(`Total records imported: ${Object.values(stats).reduce((sum, count) => sum + count, 0)}`);
    
    console.log('\n✓ Import completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your application: npm start');
    console.log('2. Check admin panel at: /admin/login');
    console.log('3. Verify all data is imported correctly');
    
  } catch (error) {
    console.error('✗ Import failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Show usage information
function showUsage() {
  console.log('Database Import Tool\n');
  console.log('Usage:');
  console.log('  node backend/seedImport.js           - Import data (skip if collections exist)');
  console.log('  node backend/seedImport.js --force   - Import data (overwrite existing data)');
  console.log('\nMake sure you have:');
  console.log('1. The seed-data folder in the backend directory');
  console.log('2. Updated .env file with correct MONGODB_URI');
  console.log('3. MongoDB running and accessible\n');
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the import
importAllData(); 