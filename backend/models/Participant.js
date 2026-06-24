const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: String,
    trim: true
  },
  academic: {
    type: String,
    trim: true
  },
  position: { // Chức vụ
    type: String,
    trim: true
  },
  speciality: { // Chuyên ngành
    type: String,
    trim: true
  },
  workunit: {
    type: String,
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
  role: {
    type: String,
    enum: ['Báo cáo viên', 'Tham dự'],
    default: 'Tham dự'
  },
  targetAudience: {
    type: String,
    enum: [
      'Sĩ quan',
      'Quân nhân chuyên nghiệp',
      'Viên chức quốc phòng',
      'Hạ sĩ quan binh sĩ',
      'Học viên'
    ],
    trim: true
  },
  speech: {
    type: Boolean,
    default: false
  },
  
  transport: {
    type: Boolean,
    default: false
  },
  lunch: {
    type: Boolean,
    default: false
  },
  dinner: {
    type: Boolean,
    default: false
  },
  qime: {
    type: Boolean,
    default: false
  },
  feedback: {
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
  source: {
    type: String,
    trim: true
  },
  nationality: {
    type: String,
    trim: true
  },
  questions: {
    type: String,
    trim: true
  },
  mostinterested: {
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
  registrationTime: {
    type: Date
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  attendance: {
    type: Boolean,
    default: false
  },
  participantId: { // Stores the 4-digit string ID (e.g., "0001")
    type: String,
    unique: true,
    required: true,
    index: true,
    minLength: 4,
    maxLength: 4
  }
});

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant; 