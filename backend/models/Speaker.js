const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema({
  speakerID: {
    type: String,
    unique: true,
    required: true,
    // Consider adding a default function to generate unique IDs if needed
    // default: () => `SPK-${new Date().getTime()}-${Math.random().toString(36).substr(2, 5)}`
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required']
  },
  mobile: {
    type: String,
    // Add validation if needed, e.g., regex for phone number format
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    // Add validation for email format
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  birthday: {
    type: Date
  },
  rank: {
    type: String
  },
  academic: {
    type: String // e.g., PhD, MSc, Professor
  },
  position: {
    type: String // e.g., Head of Department, Researcher
  },
  speciality: {
    type: String // e.g., Artificial Intelligence, Cardiology
  },
  workUnit: {
    type: String
  },
  speechTitle: {
    type: String
  },
  speechTime: {
    type: Date // Consider if this should be just time or full datetime, or a string for flexibility
  },
  avatarUrl: {
    type: String // URL to the speaker's photo
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update `updatedAt` field before saving
speakerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Speaker = mongoose.model('Speaker', speakerSchema);

module.exports = Speaker; 