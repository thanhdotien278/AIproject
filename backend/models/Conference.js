const mongoose = require('mongoose');

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const FIRST_HH_MM_PATTERN = /\b([01]\d|2[0-3]):([0-5]\d)\b/;

function parseFirstTimeMinutes(time) {
  const match = String(time || '').match(FIRST_HH_MM_PATTERN);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutes(totalMinutes) {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function defaultQrAvailableFromTime(conferenceTime) {
  const startMinutes = parseFirstTimeMinutes(conferenceTime);
  if (startMinutes === null) return null;
  return formatMinutes(startMinutes - 15);
}

const qrConfigSchema = new mongoose.Schema({
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

  if (this.qrConfig.availableFromTime === undefined || this.qrConfig.availableFromTime === null) {
    const defaultAvailableFromTime = defaultQrAvailableFromTime(this.time);
    if (defaultAvailableFromTime) {
      this.qrConfig.availableFromTime = defaultAvailableFromTime;
    } else {
      this.invalidate(
        'qrConfig.availableFromTime',
        'QR availableFromTime is required when Conference.time has no HH:mm start time.'
      );
    }
  } else if (!HH_MM_PATTERN.test(String(this.qrConfig.availableFromTime))) {
    this.invalidate('qrConfig.availableFromTime', 'QR availableFromTime must use HH:mm format.');
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
