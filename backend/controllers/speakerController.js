const Speaker = require('../models/Speaker');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../frontend/public/uploads/avatars/');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.mimetype.startsWith('image')) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(null, false);
  }
  cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Display speakers management page
exports.showSpeakersPage = async (req, res) => {
  try {
    const speakers = await Speaker.find().sort({ createdAt: -1 });
    res.render('admin/speakers', {
      title: 'Manage Speakers',
      speakers,
      currentPath: '/admin/speakers' // For active sidebar link
    });
  } catch (error) {
    console.error('Error fetching speakers:', error);
    req.flash('error_msg', 'Error fetching speakers.');
    res.redirect('/admin/dashboard');
  }
};

// Create a new speaker
exports.createSpeaker = async (req, res) => {
  try {
    const { 
      speakerID, fullName, mobile, email, birthday, 
      rank, academic, position, speciality, workUnit, 
      speechTitle, speechTime 
    } = req.body;

    if (req.fileValidationError) {
        req.flash('error_msg', req.fileValidationError);
        return res.redirect('/admin/speakers');
    }

    let avatarUrl = '';
    if (req.file) {
      avatarUrl = '/uploads/avatars/' + req.file.filename;
    }

    const newSpeaker = new Speaker({
      speakerID,
      fullName,
      mobile,
      email,
      birthday,
      rank,
      academic,
      position,
      speciality,
      workUnit,
      speechTitle,
      speechTime,
      avatarUrl
    });

    await newSpeaker.save();
    req.flash('success_msg', 'Speaker added successfully.');
    res.redirect('/admin/speakers');
  } catch (error) {
    console.error('Error creating speaker:', error);
    if (error.code === 11000) { // Duplicate key error
        req.flash('error_msg', 'Speaker ID or Email already exists.');
    } else if (error.name === 'ValidationError') {
        let messages = Object.values(error.errors).map(val => val.message);
        req.flash('error_msg', messages.join(', '));
    } else {
        req.flash('error_msg', 'Error creating speaker.');
    }
    // Optionally, delete uploaded file if DB save fails
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.redirect('/admin/speakers');
  }
};

// Update an existing speaker
exports.updateSpeaker = async (req, res) => {
  try {
    const { 
      speakerID, fullName, mobile, email, birthday, 
      rank, academic, position, speciality, workUnit, 
      speechTitle, speechTime 
    } = req.body;
    const speakerId = req.params.id;

    if (req.fileValidationError) {
        req.flash('error_msg', req.fileValidationError);
        return res.redirect('/admin/speakers');
    }

    const speaker = await Speaker.findById(speakerId);
    if (!speaker) {
      req.flash('error_msg', 'Speaker not found.');
      return res.redirect('/admin/speakers');
    }

    let avatarUrl = speaker.avatarUrl;
    if (req.file) {
      // Delete old avatar if a new one is uploaded and old one exists
      if (speaker.avatarUrl && speaker.avatarUrl !== '') {
        const oldAvatarPath = path.join(__dirname, '../../frontend/public', speaker.avatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      avatarUrl = '/uploads/avatars/' + req.file.filename;
    }

    speaker.speakerID = speakerID;
    speaker.fullName = fullName;
    speaker.mobile = mobile;
    speaker.email = email;
    speaker.birthday = birthday ? new Date(birthday) : null;
    speaker.rank = rank;
    speaker.academic = academic;
    speaker.position = position;
    speaker.speciality = speciality;
    speaker.workUnit = workUnit;
    speaker.speechTitle = speechTitle;
    speaker.speechTime = speechTime ? new Date(speechTime) : null;
    speaker.avatarUrl = avatarUrl;

    await speaker.save();
    req.flash('success_msg', 'Speaker updated successfully.');
    res.redirect('/admin/speakers');
  } catch (error) {
    console.error('Error updating speaker:', error);
    if (error.code === 11000) { 
        req.flash('error_msg', 'Speaker ID or Email already exists on another record.');
    } else if (error.name === 'ValidationError') {
        let messages = Object.values(error.errors).map(val => val.message);
        req.flash('error_msg', messages.join(', '));
    } else {
        req.flash('error_msg', 'Error updating speaker.');
    }
     // Optionally, delete newly uploaded file if DB save fails during update
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.redirect('/admin/speakers');
  }
};

// Delete a speaker
exports.deleteSpeaker = async (req, res) => {
  try {
    const speakerId = req.params.id;
    const speaker = await Speaker.findById(speakerId);

    if (!speaker) {
      req.flash('error_msg', 'Speaker not found.');
      return res.redirect('/admin/speakers');
    }

    // Delete avatar image if it exists
    if (speaker.avatarUrl && speaker.avatarUrl !== '') {
      const avatarPath = path.join(__dirname, '../../frontend/public', speaker.avatarUrl);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await Speaker.findByIdAndDelete(speakerId);
    req.flash('success_msg', 'Speaker deleted successfully.');
    res.redirect('/admin/speakers');
  } catch (error) {
    console.error('Error deleting speaker:', error);
    req.flash('error_msg', 'Error deleting speaker.');
    res.redirect('/admin/speakers');
  }
};

// Middleware for createSpeaker and updateSpeaker route
exports.uploadAvatar = upload.single('avatar'); 