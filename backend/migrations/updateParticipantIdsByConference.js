require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Participant = require('../models/Participant');
const Counter = require('../models/Counter');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-registration';

/**
 * Migration script to update participant IDs to be conference-specific
 * - Participants are grouped by conference code
 * - For each conference, participants are sorted by registration date (oldest first)
 * - Participant IDs are assigned as 4-digit numbers (0001, 0002, etc.) per conference
 * - Counter collection is updated to match the latest sequence for each conference
 */
async function migrateParticipantIdsByConference() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for migration...');

    // Get all participants
    const allParticipants = await Participant.find();
    
    if (allParticipants.length === 0) {
      console.log('No participants found to migrate.');
      return;
    }
    
    console.log(`Found ${allParticipants.length} total participants to process.`);
    
    // Group participants by conference code
    const participantsByConference = {};
    allParticipants.forEach(participant => {
      const conferenceCode = participant.conferenceCode;
      if (!participantsByConference[conferenceCode]) {
        participantsByConference[conferenceCode] = [];
      }
      participantsByConference[conferenceCode].push(participant);
    });
    
    // Process each conference group
    let totalUpdated = 0;
    let totalErrors = 0;
    const conferenceCounters = {};
    
    for (const [conferenceCode, participants] of Object.entries(participantsByConference)) {
      console.log(`\nProcessing conference: ${conferenceCode} (${participants.length} participants)`);
      
      // Sort participants by registration date (oldest first)
      participants.sort((a, b) => {
        const dateA = a.registrationDate || a.registrationTime || a.createdAt || new Date(0);
        const dateB = b.registrationDate || b.registrationTime || b.createdAt || new Date(0);
        return dateA - dateB;
      });
      
      let conferenceUpdated = 0;
      let conferenceErrors = 0;
      let highestSequence = 0;
      
      // Update participant IDs for this conference
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const newParticipantId = (i + 1).toString().padStart(4, '0');
        highestSequence = i + 1;
        
        // Check if the ID needs updating
        if (participant.participantId !== newParticipantId) {
          console.log(`Updating ${conferenceCode} participant ${participant._id} (${participant.email}): Old ID '${participant.participantId || 'none'}' → New ID '${newParticipantId}'`);
          
          try {
            participant.participantId = newParticipantId;
            await participant.save();
            conferenceUpdated++;
          } catch (err) {
            console.error(`Error saving participant ${participant._id}:`, err.message);
            conferenceErrors++;
          }
        } else {
          console.log(`Participant ${participant._id} already has correct ID '${newParticipantId}'. Skipping.`);
        }
      }
      
      // Store highest sequence for counter updates
      conferenceCounters[conferenceCode] = highestSequence;
      
      // Log conference stats
      console.log(`Conference ${conferenceCode}: Updated ${conferenceUpdated} participants, ${conferenceErrors} errors`);
      totalUpdated += conferenceUpdated;
      totalErrors += conferenceErrors;
    }
    
    // Update counters collection to match the latest sequence values
    console.log('\nUpdating counters collection...');
    for (const [conferenceCode, sequenceValue] of Object.entries(conferenceCounters)) {
      const counterId = `participants_${conferenceCode}`;
      await Counter.findOneAndUpdate(
        { _id: counterId },
        { sequence_value: sequenceValue },
        { upsert: true }
      );
      console.log(`Set counter for "${conferenceCode}" to ${sequenceValue}`);
    }
    
    // Final summary
    console.log('\n----------------------------------------');
    console.log('Migration completed.');
    console.log(`Total participants updated: ${totalUpdated}`);
    if (totalErrors > 0) {
      console.error(`Total errors: ${totalErrors}`);
    }
    console.log('----------------------------------------');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

migrateParticipantIdsByConference(); 