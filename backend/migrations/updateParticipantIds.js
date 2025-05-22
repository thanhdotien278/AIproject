require('dotenv').config({ path: '../../.env' }); // Adjust path as necessary to find .env
const mongoose = require('mongoose');
const Participant = require('../models/Participant');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-registration';

async function migrateParticipantIds() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for migration...');

    const participants = await Participant.find().sort({ registrationDate: 'asc' });

    if (participants.length === 0) {
      console.log('No participants found to migrate.');
      return;
    }

    console.log(`Found ${participants.length} participants to migrate.`);
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const newParticipantId = (i + 1).toString().padStart(4, '0');
      
      // Check if the ID needs updating to avoid unnecessary writes
      if (participant.participantId !== newParticipantId) {
        console.log(`Updating participant ${participant._id} (Email: ${participant.email}): Old ID '${participant.participantId}', New ID '${newParticipantId}'`);
        participant.participantId = newParticipantId;
        try {
          await participant.save();
          updatedCount++;
        } catch (err) {
          console.error(`Error saving participant ${participant._id} (Email: ${participant.email}):`, err.message);
          // If it's a duplicate key error for participantId, it means somehow an ID was already taken.
          // This shouldn't happen if the collection was clean or IDs were previously null/different.
          if (err.code === 11000 && err.keyPattern && err.keyPattern.participantId) {
            console.warn(`  -> Participant ID ${newParticipantId} might already exist. Check data manually or re-run after ensuring uniqueness strategy.`);
          }
          errorCount++;
        }
      } else {
        console.log(`Participant ${participant._id} (Email: ${participant.email}) already has correct ID '${newParticipantId}'. Skipping.`);
      }
    }

    console.log('----------------------------------------');
    console.log('Migration completed.');
    console.log(`Successfully updated ${updatedCount} participants.`);
    if (errorCount > 0) {
      console.error(`${errorCount} participants could not be updated due to errors.`);
    }
    console.log('----------------------------------------');

  } catch (error) {
    console.error('Error during participant ID migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

migrateParticipantIds(); 