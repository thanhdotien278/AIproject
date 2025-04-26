const mongoose = require('mongoose');
const Conference = require('./models/Conference');
const Location = require('./models/Location');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-registration')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Get a location 
      const location = await Location.findOne();
      if (!location) {
        console.error('No locations found. Please run npm run seed:locations first.');
        mongoose.disconnect();
        return;
      }
      
      console.log('Found location:', location);

      // Test different combinations of registration fields
      const fields = [
        ['name', 'email', 'phone'],
        ['name', 'email'],
        ['name', 'email', 'phone', 'address'],
        ['name', 'email', 'phone', 'address', 'nationality'],
        ['name', 'email', 'mobile'],  // Test with mobile
        ['name', 'email', 'phone', 'mobile']  // Test with both phone and mobile
      ];

      for (let i = 0; i < fields.length; i++) {
        console.log(`\nTest ${i+1}: Testing with fields: ${fields[i].join(', ')}`);
        
        // Create a test conference
        const conference = new Conference({
          code: `TEST${i+1}`.substring(0, 4),  // Ensure exactly 4 characters
          name: `Test Conference ${i+1}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days later
          location: location._id,
          maxAttendees: 100,
          description: 'Test description',
          registrationFields: fields[i]
        });

        try {
          console.log('Conference before validation:', {
            ...conference.toObject(),
            registrationFields: conference.registrationFields
          });
          await conference.validate();
          console.log(`Test ${i+1}: Validation passed`);
          
          // Save the conference
          await conference.save();
          console.log(`Test ${i+1}: Save successful`);
          
          // Clean up - delete the test conference
          await Conference.findByIdAndDelete(conference._id);
        } catch (err) {
          console.error(`Test ${i+1}: Validation failed:`, err.message);
          if (err.errors) {
            for (let path in err.errors) {
              console.error(`  - Field ${path}: ${err.errors[path].message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during test:', error);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('Could not connect to MongoDB', err);
    process.exit(1);
  }); 