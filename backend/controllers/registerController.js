const Participant = require('../models/Participant');
const nodemailer = require('nodemailer');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Display registration form
exports.showRegisterForm = (req, res) => {
  res.render('register');
};

// Process registration submission
exports.registerParticipant = async (req, res) => {
  try {
    const { name, email, phone, organization, attendanceType, questions } = req.body;
    
    // Validate required fields
    if (!name || !email || !attendanceType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and attendance type are required' 
      });
    }
    
    // Check if participant already registered
    const existingParticipant = await Participant.findOne({ email });
    if (existingParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered' 
      });
    }
    
    // Create new participant
    const participant = new Participant({
      name,
      email,
      phone,
      organization,
      attendanceType,
      questions
    });
    
    // Save participant to database
    await participant.save();
    
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Conference Registration Confirmation',
      html: `
        <h1>Registration Confirmation</h1>
        <p>Dear ${name},</p>
        <p>Thank you for registering for our conference!</p>
        <p><strong>Registration Details:</strong></p>
        <ul>
          <li>Name: ${name}</li>
          <li>Email: ${email}</li>
          <li>Phone: ${phone || 'Not provided'}</li>
          <li>Organization: ${organization || 'Not provided'}</li>
          <li>Attendance Type: ${attendanceType}</li>
        </ul>
        <p>We look forward to seeing you at the event!</p>
        <p>Best regards,<br>Conference Team</p>
      `
    };

    // Only send email if email credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail(mailOptions);
        participant.emailSent = true;
        await participant.save();
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue with registration even if email fails
      }
    }
    
    // Save participant data in session for thank you page
    req.session.participantName = name;
    req.session.participantEmail = email;
    
    // Redirect to thank you page
    res.status(201).json({ 
      success: true,
      message: 'Registration successful',
      redirectUrl: '/thankyou'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during registration' 
    });
  }
}; 