const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true // This will be "participants_CONFCODE" where CONFCODE is the conference code
  },
  sequence_value: { 
    type: Number, 
    default: 0 
  }
});

/**
 * Get next sequence value for a given conference code
 * This is an atomic operation that prevents race conditions during concurrent registrations
 * @param {string} conferenceCode - The conference code to get the counter for
 * @returns {Promise<number>} - The next sequence value
 */
counterSchema.statics.getNextSequenceValue = async function(conferenceCode) {
  const counterId = `participants_${conferenceCode}`;
  
  const counter = await this.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  
  return counter.sequence_value;
};

module.exports = mongoose.model('Counter', counterSchema); 