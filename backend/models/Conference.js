const mongoose = require('mongoose');
const { deriveAvailableFromAt } = require('../services/qrConfigTime');

const qrConfigSchema = new mongoose.Schema({
  availableFromAt: {
    type: Date
  },
  // Legacy read path for conferences saved before exact QR datetime existed.
  availableFromTime: {
    type: String,
    trim: true
  },
  availableDurationMinutes: {
    type: Number,
    default: 30,
    min: [1, 'QR availableDurationMinutes must be a positive number.'],
    cast: 'QR availableDurationMinutes must be a positive number.'
  },
  rotationTtlSeconds: {
    type: Number,
    default: 30,
    min: [1, 'QR rotationTtlSeconds must be a positive number.'],
    cast: 'QR rotationTtlSeconds must be a positive number.'
  }
}, { _id: false });

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
  expectedParticipants: {
    type: Number,
    default: 0,
    min: 0
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
  qrConfig: {
    type: qrConfigSchema,
    default: () => ({})
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

conferenceSchema.pre('validate', function(next) {
  if (!this.qrConfig) {
    this.qrConfig = {};
  }

  const availableFromAtCastError = this.$__?.validationError?.errors?.['qrConfig.availableFromAt']
    || this.qrConfig.$__?.validationError?.errors?.availableFromAt;
  if (!availableFromAtCastError && !Number.isFinite(new Date(this.qrConfig.availableFromAt).getTime())) {
    const availableFromAt = deriveAvailableFromAt(this);
    if (availableFromAt) {
      this.qrConfig.availableFromAt = availableFromAt;
    } else {
      this.invalidate(
        'qrConfig.availableFromAt',
        'QR availableFromAt must be a valid Date.'
      );
    }
  }

  const duration = this.qrConfig.availableDurationMinutes;
  const ttl = this.qrConfig.rotationTtlSeconds;
  if (Number.isFinite(duration) && Number.isFinite(ttl) && ttl > duration * 60) {
    this.invalidate(
      'qrConfig.rotationTtlSeconds',
      'QR rotationTtlSeconds cannot exceed availableDurationMinutes * 60.'
    );
  }

  next();
});

// Update the updatedAt field before saving
conferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create model
const Conference = mongoose.model('Conference', conferenceSchema);

module.exports = Conference;
