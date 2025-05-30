const Participant = require('../models/Participant');
const User = require('../models/User');
const Conference = require('../models/Conference');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Location = require('../models/Location');
const mongoose = require('mongoose');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Auth middleware
exports.isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Show login page
exports.showLoginPage = (req, res) => {
  res.render('admin/login', {
    layout: false
  });
};

// Process login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Set session
    req.session.isAuthenticated = true;
    req.session.username = user.username;
    
    res.status(200).json({ success: true, redirectUrl: '/admin/dashboard' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'An error occurred during login' });
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
};

// Show dashboard
exports.showDashboard = async (req, res) => {
  try {
    // Fetch participants and conferences from database
    const participants = await Participant.find().sort({ registrationDate: -1 });
    const conferences = await Conference.find().populate('location').sort({ createdAt: -1 });
    
    // Calculate participant statistics
    const totalParticipants = participants.length;
    // Remove old attendance stats
    // const inPersonCount = participants.filter(p => p.attendanceType === 'in-person').length;
    // const virtualCount = participants.filter(p => p.attendanceType === 'virtual').length;
    const emailSentCount = participants.filter(p => p.emailSent).length;

    // Calculate new stats
    const lunchCount = participants.filter(p => p.lunch === true).length;
    const dinnerCount = participants.filter(p => p.dinner === true).length;
    const transportCount = participants.filter(p => p.transport === true).length;
    const hocVienCount = participants.filter(p => p.workunit && p.workunit.toLowerCase().includes('học viện')).length;
    const donViNgoaiCount = totalParticipants - hocVienCount;
    
    // Group participants by organization
    const organizationCounts = {};
    participants.forEach(p => {
      const org = p.organization || 'Not Specified';
      organizationCounts[org] = (organizationCounts[org] || 0) + 1;
    });
    
    // Sort organizations by participant count
    const topOrganizations = Object.entries(organizationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    res.render('admin/dashboard', { 
      participants,
      conferences,
      username: req.session.username,
      layout: 'layouts/admin',
      currentPath: '/admin/dashboard',
      stats: {
        totalParticipants,
        // Remove old attendance stats
        // inPersonCount,
        // virtualCount,
        emailSentCount, // Keep email sent count
        // Add new stats
        lunchCount,
        dinnerCount,
        transportCount,
        hocVienCount,
        donViNgoaiCount,
        topOrganizations // Keep top orgs for now
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Error loading dashboard');
  }
};

// Export participants to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const conferenceCode = req.query.conferenceCode || 'all';
    const query = conferenceCode !== 'all' ? { conferenceCode } : {};

    const participants = await Participant.find(query).sort({ registrationDate: -1 });
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Convert participants to array of objects for Excel
    const worksheetData = participants.map(p => ({
      ID: p.participantId || 'N/A', // Use participantId instead of old ID
      Name: p.name,
      Email: p.email,
      Phone: p.phone || '',
      WorkUnit: p.workunit || '',
      Position: p.position || '', 
      Rank: p.rank || '',
      Academic: p.academic || '',
      Role: p.role || '',
      Speech: p.speech ? 'Yes' : 'No',
      Lunch: p.lunch ? 'Yes' : 'No',
      Dinner: p.dinner ? 'Yes' : 'No',
      Transport: p.transport ? 'Yes' : 'No',
      'Registration Date': p.registrationDate ? new Date(p.registrationDate).toLocaleString() : '',
      'Email Sent': p.emailSent ? 'Yes' : 'No',
      'Conference': p.conferenceCode
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
    
    // Generate Excel file
    const filename = `conference_participants_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../../frontend/public/downloads', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    XLSX.writeFile(workbook, filePath);
    
    // Send file
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      
      // Delete file after sending
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ success: false, message: 'Error exporting data' });
  }
};

// Send confirmation email to a single participant
exports.sendEmail = async (req, res) => {
  try {
    const { participantId } = req.params;
    
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }
    
    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS in .env' 
      });
    }
    
    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: participant.email,
      subject: 'Conference Registration Confirmation',
      html: `
        <h1>Registration Confirmation</h1>
        <p>Dear ${participant.name},</p>
        <p>Thank you for registering for our conference!</p>
        <p><strong>Registration Details:</strong></p>
        <ul>
          <li>Name: ${participant.name}</li>
          <li>Email: ${participant.email}</li>
          <li>Phone: ${participant.phone || 'Not provided'}</li>
          <li>Organization: ${participant.organization || 'Not provided'}</li>
          <li>Attendance Type: ${participant.attendanceType}</li>
        </ul>
        <p>We look forward to seeing you at the event!</p>
        <p>Best regards,<br>Conference Team</p>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    // Update participant record
    participant.emailSent = true;
    await participant.save();
    
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error sending email' });
  }
};

// Send emails to all participants
exports.sendBulkEmails = async (req, res) => {
  try {
    const participants = await Participant.find({ emailSent: false });
    
    if (participants.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No pending emails to send' 
      });
    }
    
    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS in .env' 
      });
    }
    
    // Send emails to each participant
    let successCount = 0;
    for (const participant of participants) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: participant.email,
          subject: 'Conference Registration Confirmation',
          html: `
            <h1>Registration Confirmation</h1>
            <p>Dear ${participant.name},</p>
            <p>Thank you for registering for our conference!</p>
            <p><strong>Registration Details:</strong></p>
            <ul>
              <li>Name: ${participant.name}</li>
              <li>Email: ${participant.email}</li>
              <li>Phone: ${participant.phone || 'Not provided'}</li>
              <li>Organization: ${participant.organization || 'Not provided'}</li>
              <li>Attendance Type: ${participant.attendanceType}</li>
            </ul>
            <p>We look forward to seeing you at the event!</p>
            <p>Best regards,<br>Conference Team</p>
          `
        };
        
        await transporter.sendMail(mailOptions);
        
        // Update participant record
        participant.emailSent = true;
        await participant.save();
        
        successCount++;
      } catch (error) {
        console.error(`Error sending email to ${participant.email}:`, error);
        // Continue with next participant
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `Successfully sent ${successCount} of ${participants.length} emails` 
    });
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    res.status(500).json({ success: false, message: 'Error sending bulk emails' });
  }
};

// Create new conference
exports.createConference = async (req, res) => {
  try {
    // Log request body for debugging
    console.log('Request body:', req.body);

    // Extract registration fields
    let registrationFields = req.body.registrationFields || [];
    // Handle single value vs array from form submission
    if (req.body.registrationFields && !Array.isArray(req.body.registrationFields)) {
      registrationFields = [req.body.registrationFields];
    } else if (!req.body.registrationFields) {
      registrationFields = [];
    }

    console.log('Raw Registration fields:', req.body.registrationFields);
    console.log('Initial registrationFields array:', registrationFields);

    // Make sure required fields are always included
    const requiredFields = ['name', 'email', 'phone'];
    requiredFields.forEach(field => {
      if (!registrationFields.includes(field)) {
        registrationFields.push(field);
      }
    });
    // Remove duplicates
    registrationFields = [...new Set(registrationFields)]; 

    console.log('Processed registration fields:', registrationFields);

    // Check for conference code uniqueness
    const conferenceCodeUpper = req.body.code.toUpperCase();
    const existingConference = await Conference.findOne({ code: conferenceCodeUpper });
    if (existingConference) {
      return res.status(400).json({
        success: false,
        message: 'Mã hội nghị này đã tồn tại. Vui lòng chọn mã khác.'
      });
    }

    // Create a new conference document
    const conference = new Conference({
      code: conferenceCodeUpper,
      name: req.body.name,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      time: req.body.time,
      location: req.body.location,
      mainSpeaker: req.body.mainSpeaker || '',
      maxAttendees: parseInt(req.body.maxAttendees) || 100,
      description: req.body.description || '',
      registrationFields: registrationFields
    });

    console.log('Conference object before save:', conference);

    // Save the conference to the database
    await conference.save();

    // Redirect with flash message on success
    req.flash('success_msg', 'Hội nghị đã được tạo thành công!');
    // For AJAX response (frontend currently reloads, but keeps this structure)
    // Sending a success status might be enough if frontend handles reload
    res.status(201).json({ 
        success: true, 
        message: 'Hội nghị đã được tạo thành công!'
        // redirectUrl: '/admin/conferences' // Or let frontend handle reload 
    }); 
    // If not using AJAX fetch on frontend:
    // res.redirect('/admin/conferences');

  } catch (error) {
    console.error('Detailed error creating conference:', error);
    let errorMessage = 'Lỗi tạo hội nghị: ';
    if (error.name === 'ValidationError') {
        let errors = Object.values(error.errors).map(el => el.message);
        errorMessage += errors.join(', ');
    } else {
         errorMessage += (error.message || 'Lỗi không xác định');
    }
    // Send JSON error response for fetch API
    res.status(400).json({
      success: false,
      message: errorMessage
    });
    // If not using AJAX on frontend:
    // req.flash('error_msg', errorMessage);
    // res.redirect('/admin/conferences'); 
  }
};

// Get all conferences
exports.getConferences = async (req, res) => {
  try {
    const conferences = await Conference.find().populate('location').sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      conferences 
    });
  } catch (error) {
    console.error('Error fetching conferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching conferences' 
    });
  }
};

// Show settings page
exports.showSettings = async (req, res) => {
  try {
    // Get the current user
    const user = await User.findOne({ username: req.session.username });
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/dashboard');
    }
    
    res.render('admin/settings', {
      username: user.username,
      fullName: user.fullName || '',
      email: user.email || '',
      bio: user.bio || '',
      currentPath: '/admin/settings',
      layout: 'layouts/admin'
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    req.flash('error', 'An error occurred while getting settings');
    res.redirect('/admin/dashboard');
  }
};

// Update admin settings
exports.updateSettings = async (req, res) => {
  try {
    const { fullName, email, bio, currentPassword, password } = req.body;
    
    // Get the current user
    const user = await User.findOne({ username: req.session.username });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update basic user info
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.bio = bio || user.bio;
    
    // If password is being changed, verify the current password first
    if (password && currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      
      user.password = password;
    }
    
    await user.save();
    
    res.status(200).json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'An error occurred while updating settings' });
  }
};

// Get all locations
exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.status(200).json({ 
      success: true, 
      locations 
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching locations' 
    });
  }
};

// Create new location
exports.createLocation = async (req, res) => {
  try {
    const { name, address, capacity } = req.body;
    
    // Check if required fields are provided
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }
    
    // Check if location with the same name already exists
    const existingLocation = await Location.findOne({ name });
    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: 'A location with this name already exists'
      });
    }
    
    // Create and save new location
    const location = new Location({
      name,
      address,
      capacity: capacity || 0
    });
    
    await location.save();
    
    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      location
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating location'
    });
  }
};

// Update location
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, capacity } = req.body;
    
    // Check if location exists
    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Check if updating with a name that already exists in another location
    if (name && name !== location.name) {
      const existingLocation = await Location.findOne({ name });
      if (existingLocation) {
        return res.status(400).json({
          success: false,
          message: 'A location with this name already exists'
        });
      }
    }
    
    // Update fields
    if (name) location.name = name;
    if (address !== undefined) location.address = address;
    if (capacity !== undefined) location.capacity = capacity;
    
    await location.save();
    
    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location'
    });
  }
};

// Delete location
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if location exists
    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Check if location is in use by any conference
    const conferenceUsingLocation = await Conference.findOne({ location: id });
    if (conferenceUsingLocation) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location because it is in use by at least one conference'
      });
    }
    
    // Delete location
    await Location.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting location'
    });
  }
};

// Show users page
exports.showUsers = async (req, res) => {
  try {
    // Fetch all users from database
    const users = await User.find().sort({ createdAt: -1 });
    
    res.render('admin/users', { 
      users,
      username: req.session.username,
      layout: 'layouts/admin',
      currentPath: '/admin/users'
    });
  } catch (error) {
    console.error('Error fetching users data:', error);
    res.status(500).send('Error loading users');
  }
};

// Get all users (API)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, password, fullName, email, userPhone, userRole, shortBio } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Check if user with the same username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this username already exists'
      });
    }
    
    // Create new user
    const user = new User({
      username,
      password,
      fullName: fullName || '',
      email: email || '',
      userPhone: userPhone || '',
      userRole: userRole || 'admin',
      shortBio: shortBio || '',
      isAdmin: userRole === 'admin'
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        userPhone: user.userPhone,
        userRole: user.userRole,
        shortBio: user.shortBio,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user: ' + (error.message || 'Unknown error')
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, email, userPhone, userRole, shortBio } = req.body;
    
    // Find the user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if updating with a username that already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this username already exists'
        });
      }
      
      user.username = username;
    }
    
    // Update fields if provided
    if (password) user.password = password;
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (userPhone !== undefined) user.userPhone = userPhone;
    if (userRole) {
      user.userRole = userRole;
      user.isAdmin = userRole === 'admin';
    }
    if (shortBio !== undefined) user.shortBio = shortBio;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        userPhone: user.userPhone,
        userRole: user.userRole,
        shortBio: user.shortBio,
        isAdmin: user.isAdmin,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user: ' + (error.message || 'Unknown error')
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't allow deleting the currently logged in user
    if (user.username === req.session.username) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    await User.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

// Show Conferences Page
exports.showConferencesPage = async (req, res) => {
  try {
    const conferences = await Conference.find()
      .populate('location') // Populate location details
      .sort({ createdAt: -1 });
      
    // Fetch all locations for the "Add/Edit Conference" modal dropdown
    const locations = await Location.find().sort({ name: 1 });

    res.render('admin/conferences', {
      layout: 'layouts/admin',
      username: req.session.username,
      currentPath: '/admin/conferences',
      conferences: conferences,
      locations: locations, // Pass locations for the modal
      title: 'Quản lý Hội Nghị'
    });
  } catch (error) {
    console.error('Error fetching conferences page data:', error);
    req.flash('error_msg', 'Không thể tải trang quản lý hội nghị.');
    res.redirect('/admin/dashboard');
  }
};

// Get specific conference details (for editing)
exports.getConferenceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID Hội nghị không hợp lệ' });
    }

    const conference = await Conference.findById(id).populate('location');

    if (!conference) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hội nghị' });
    }
    
    res.status(200).json({ success: true, conference: conference }); 

  } catch (error) {
    console.error('Error fetching conference details:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin hội nghị' });
  }
};

// Update Conference
exports.updateConference = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID Hội nghị không hợp lệ' });
    }

    const conference = await Conference.findById(id);
    if (!conference) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hội nghị' });
    }

    // Extract and process registration fields
    let registrationFields = req.body.registrationFields || [];
    if (req.body.registrationFields && !Array.isArray(req.body.registrationFields)) {
      registrationFields = [req.body.registrationFields];
    } else if (!req.body.registrationFields) {
      registrationFields = [];
    }
    const requiredFields = ['name', 'email', 'phone'];
    requiredFields.forEach(field => {
      if (!registrationFields.includes(field)) {
        registrationFields.push(field);
      }
    });
    registrationFields = [...new Set(registrationFields)];

    // Update conference properties (cannot update code)
    conference.name = req.body.name || conference.name;
    conference.startDate = req.body.startDate || conference.startDate;
    conference.endDate = req.body.endDate || conference.endDate;
    conference.time = req.body.time || conference.time;
    conference.location = req.body.location || conference.location;
    conference.mainSpeaker = req.body.mainSpeaker || conference.mainSpeaker;
    conference.maxAttendees = parseInt(req.body.maxAttendees) || conference.maxAttendees;
    conference.description = req.body.description || conference.description;
    conference.registrationFields = registrationFields; // Update the fields

    // Save the updated conference
    await conference.save();

    req.flash('success_msg', 'Hội nghị đã được cập nhật thành công!');
    res.status(200).json({ 
        success: true, 
        message: 'Hội nghị đã được cập nhật thành công!'
        // redirectUrl: '/admin/conferences' 
    });

  } catch (error) {
    console.error('Detailed error updating conference:', error);
    let errorMessage = 'Lỗi cập nhật hội nghị: ';
    if (error.name === 'ValidationError') {
        let errors = Object.values(error.errors).map(el => el.message);
        errorMessage += errors.join(', ');
    } else {
         errorMessage += (error.message || 'Lỗi không xác định');
    }
    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
};

// Delete Conference
exports.deleteConference = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID Hội nghị không hợp lệ' });
    }

    const conference = await Conference.findById(id);
    if (!conference) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hội nghị' });
    }

    // Check if participants are registered for this conference
    const participantCount = await Participant.countDocuments({ conferenceCode: conference.code });

    if (participantCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa hội nghị này vì có ${participantCount} người đã đăng ký.`
      });
    }

    // Delete the conference if no participants are linked
    await Conference.findByIdAndDelete(id);

    req.flash('success_msg', 'Hội nghị đã được xóa thành công!');
    res.status(200).json({
      success: true,
      message: 'Hội nghị đã được xóa thành công!'
    });

  } catch (error) {
    console.error('Error deleting conference:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa hội nghị: ' + (error.message || 'Lỗi không xác định')
    });
  }
};

// API route to get dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    const { conferenceCode } = req.query;
    console.log(`Fetching dashboard data for conferenceCode: ${conferenceCode || 'all'}`);
    
    let conferenceDetails = null;
    let query = {};

    if (conferenceCode && conferenceCode !== 'all') {
      query.conferenceCode = conferenceCode;
      console.log(`Filtering participants by conference code: ${conferenceCode}`);
      
      conferenceDetails = await Conference.findOne({ code: conferenceCode }).populate('location');
      if (conferenceDetails) {
        // Format dates for display
        const startDate = new Date(conferenceDetails.startDate);
        const endDate = new Date(conferenceDetails.endDate);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        conferenceDetails.formattedDates = `${startDate.toLocaleDateString('vi-VN', options)} - ${endDate.toLocaleDateString('vi-VN', options)}`;
      } else {
        console.log(`Warning: Conference not found for code: ${conferenceCode}`);
      }
    } else {
      console.log('Fetching all participants (no conference filter)');
    }

    // Sort by registration time descending for consistent ordering
    const participants = await Participant.find(query).sort({ registrationTime: -1 });
    console.log(`Found ${participants.length} participants matching the query`);
    
    const totalParticipants = participants.length;
    const emailSentCount = participants.filter(p => p.emailSent).length;
    const lunchCount = participants.filter(p => p.lunch === true).length;
    const dinnerCount = participants.filter(p => p.dinner === true).length;
    const transportCount = participants.filter(p => p.transport === true).length;
    const hocVienCount = participants.filter(p => p.workunit && p.workunit.toLowerCase().includes('học viện')).length;
    const donViNgoaiCount = totalParticipants - hocVienCount;
    
    const participantsWithFormattedId = participants.map(p => {
      // Use the participantId field directly (it should be already formatted as a 4-digit string)
      const displayId = p.participantId || 'N/A';
      return {
        ...p.toObject(), // Spread the rest of the participant data
        displayId: displayId // This will be used in the dashboard table
      };
    });

    // Get all conferences with their active status for UI display
    const allConferences = await Conference.find().select('code name isActive').sort({ createdAt: -1 });
    console.log(`Found ${allConferences.length} conferences to display in dropdown`);

    const responseData = {
      success: true,
      participants: participantsWithFormattedId, // Send participants with the new displayId
      conferenceDetails: conferenceDetails ? conferenceDetails.toObject() : null,
      conferences: allConferences, // Include all conferences with active status
      conferenceCode: conferenceCode || 'all', // Return the selected code for confirmation
      stats: {
        totalParticipants,
        emailSentCount,
        lunchCount,
        dinnerCount,
        transportCount,
        hocVienCount,
        donViNgoaiCount
      }
    };

    console.log(`Sending response with ${participantsWithFormattedId.length} participants`);
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching API dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data from API',
      error: error.message
    });
  }
};

// Activate Conference
exports.activateConference = async (req, res) => {
  try {
    const { conferenceCode } = req.params;
    
    if (!conferenceCode) {
      return res.status(400).json({
        success: false,
        message: 'Conference code is required'
      });
    }

    // Deactivate all conferences first
    await Conference.updateMany({}, { isActive: false });
    
    // Find and activate the selected conference
    const conference = await Conference.findOne({ code: conferenceCode });
    
    if (!conference) {
      return res.status(404).json({
        success: false,
        message: 'Conference not found'
      });
    }
    
    conference.isActive = true;
    await conference.save();
    
    res.status(200).json({
      success: true,
      message: `Conference "${conference.name}" has been activated successfully`
    });
  } catch (error) {
    console.error('Error activating conference:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating conference: ' + (error.message || 'Unknown error')
    });
  }
};

// Deactivate Conference
exports.deactivateConference = async (req, res) => {
  try {
    const { conferenceCode } = req.params;
    
    if (!conferenceCode) {
      return res.status(400).json({
        success: false,
        message: 'Conference code is required'
      });
    }
    
    // Find and deactivate the selected conference
    const conference = await Conference.findOne({ code: conferenceCode });
    
    if (!conference) {
      return res.status(404).json({
        success: false,
        message: 'Conference not found'
      });
    }
    
    if (!conference.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Conference is already inactive'
      });
    }
    
    conference.isActive = false;
    await conference.save();
    
    res.status(200).json({
      success: true,
      message: `Conference "${conference.name}" has been deactivated successfully`
    });
  } catch (error) {
    console.error('Error deactivating conference:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating conference: ' + (error.message || 'Unknown error')
    });
  }
};

// Get participant details (for editing)
exports.getParticipantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid participant ID' 
      });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      participant 
    });
  } catch (error) {
    console.error('Error fetching participant details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching participant details' 
    });
  }
};

// Update participant
exports.updateParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid participant ID' 
      });
    }

    // Find participant first to verify it exists
    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found' 
      });
    }
    
    // Create updated data object (preserving the participantId)
    const updatedData = { ...req.body };
    
    // Never change participantId or conferenceCode through update
    delete updatedData.participantId;
    delete updatedData.conferenceCode;
    delete updatedData._id;
    
    // Handle boolean fields properly
    ['speech', 'lunch', 'dinner', 'transport', 'emailSent'].forEach(field => {
      if (updatedData[field] !== undefined) {
        updatedData[field] = updatedData[field] === true || updatedData[field] === 'true';
      }
    });
    
    // Update the participant
    const updatedParticipant = await Participant.findByIdAndUpdate(
      id, 
      { $set: updatedData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Participant updated successfully',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating participant: ' + (error.message || 'Unknown error')
    });
  }
};

// Delete participant
exports.deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid participant ID' 
      });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found' 
      });
    }
    
    // We don't reassign IDs, just delete the participant
    await Participant.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Participant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting participant: ' + (error.message || 'Unknown error')
    });
  }
}; 