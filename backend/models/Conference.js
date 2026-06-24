const mongoose = require('mongoose');

const conferenceSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minLength: 4,
    maxLength: 4,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  contactName: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  mainSpeaker: {
    type: String,
    trim: true
  },
  speakersName: {
    type: String,
    trim: true
  },
  speakerBio: {
    type: String,
    trim: true
  },
  speakerBusiness: {
    type: String,
    trim: true
  },
  maxAttendees: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    trim: true
  },
  targetAudience: [{
    type: String,
    enum: [
      'Sĩ quan',
      'Quân nhân chuyên nghiệp',
      'Viên chức quốc phòng',
      'Hạ sĩ quan binh sĩ',
      'Học viên'
    ]
  }],
  registrationFields: [{
    type: String,
    enum: [
      'name',
      'email',
      'phone',
      'address',
      'age',
      'business',
      'nationality',
      'workunit',
      'rank',
      'academic',
      'position',
      'speciality',
      'role',
      'speech',
      'lunch',
      'dinner',
      'transport',
      'qime',
      'feedback',
      'questions',
      'source',
      'targetAudience'
    ]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

// Update the updatedAt field before saving
conferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create model
const Conference = mongoose.model('Conference', conferenceSchema);

module.exports = Conference; 