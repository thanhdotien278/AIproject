const Participant = require('../models/Participant');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

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
  res.render('admin/login');
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
    const participants = await Participant.find().sort({ registrationDate: -1 });
    res.render('admin/dashboard', { 
      participants,
      username: req.session.username
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).send('Error loading dashboard');
  }
};

// Export participants to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const participants = await Participant.find().sort({ registrationDate: -1 });
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Convert participants to array of objects for Excel
    const worksheetData = participants.map(p => ({
      Name: p.name,
      Email: p.email,
      Phone: p.phone || '',
      Organization: p.organization || '',
      'Attendance Type': p.attendanceType,
      Questions: p.questions || '',
      'Registration Date': p.registrationDate.toLocaleString(),
      'Email Sent': p.emailSent ? 'Yes' : 'No'
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