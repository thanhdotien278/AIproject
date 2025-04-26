const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  age: {
    type: String,
    trim: true
  },
  business: {
    type: String,
    trim: true
  },
  lunch: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    trim: true
  },
  nationality: {
    type: String,
    trim: true
  },
  organization: {
    type: String,
    trim: true
  },
  questions: {
    type: String,
    trim: true
  },
  conferenceCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minLength: 4,
    maxLength: 4
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  attendance: {
    type: Boolean,
    default: false
  }
});

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant; 