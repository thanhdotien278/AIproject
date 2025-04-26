const mongoose = require('mongoose');
const Location = require('./models/Location');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initial locations
const initialLocations = [
  {
    name: 'Hội trường tầng 9',
    address: 'Tầng 9, Tòa nhà chính',
    capacity: 200
  },
  {
    name: 'Hội trường Đỗ Xuân Hợp',
    address: 'Số 18 Đường Đỗ Xuân Hợp',
    capacity: 150
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-registration')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Check if locations already exist
      const count = await Location.countDocuments();
      if (count > 0) {
        console.log(`Skipping seed: ${count} locations already exist`);
      } else {
        // Insert initial locations
        await Location.insertMany(initialLocations);
        console.log(`Successfully seeded ${initialLocations.length} locations`);
      }
    } catch (error) {
      console.error('Error seeding locations:', error);
    } finally {
      // Disconnect from MongoDB
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('Could not connect to MongoDB', err);
    process.exit(1);
  }); 