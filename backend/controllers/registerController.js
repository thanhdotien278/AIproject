const Participant = require('../models/Participant');
const Conference = require('../models/Conference');
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
exports.showRegisterForm = async (req, res) => {
  try {
    // Get conference code from query parameter
    const conferenceCode = req.query.code;
    
    // Find the conference by code
    let conference;
    if (conferenceCode) {
      conference = await Conference.findOne({ code: conferenceCode }).populate('location');
    } else {
      // Fallback to latest conference if no code provided
      conference = await Conference.findOne().sort({ createdAt: -1 }).populate('location');
    }
    
    if (!conference) {
      return res.status(404).render('error', { 
        message: 'No conferences available for registration',
        layout: false
      });
    }
    
    // Format dates for display
    const startDate = new Date(conference.startDate);
    const endDate = new Date(conference.endDate);
    const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    
    let formattedDates = startDate.toLocaleDateString('vi-VN', formatOptions);
    if (startDate.getTime() !== endDate.getTime()) {
      formattedDates += ` - ${endDate.toLocaleDateString('vi-VN', formatOptions)}`;
    }
    
    // Get location details
    const locationName = conference.location ? conference.location.name : 'Sẽ được thông báo sau';
    const locationAddress = conference.location ? conference.location.address : '';
    
    // Get registration fields from conference
    const registrationFields = conference.registrationFields || ['name', 'email', 'phone'];
    
    res.render('register', { 
      conference: conference,
      formattedDates,
      locationName,
      locationAddress,
      registrationFields: registrationFields
    });
  } catch (error) {
    console.error('Error displaying registration form:', error);
    res.status(500).render('error', { 
      message: 'An error occurred while loading the registration form',
      layout: false
    });
  }
};

// Process registration submission
exports.registerParticipant = async (req, res) => {
  try {
    // Find the conference by code from form
    let conference;
    if (req.body.conferenceCode) {
      conference = await Conference.findOne({ code: req.body.conferenceCode });
    } else {
      // Fallback to latest conference if no code provided
      conference = await Conference.findOne().sort({ createdAt: -1 });
    }
    
    if (!conference) {
      return res.status(400).json({ 
        success: false, 
        message: 'No conferences available for registration' 
      });
    }
    
    // Use the conference code from the found conference
    const confCode = conference.code;
    
    // Get registration fields from conference
    const registrationFields = conference.registrationFields || ['name', 'email', 'phone'];
    
    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and phone are required' 
      });
    }
    
    // Check if participant already registered for this conference
    const existingParticipant = await Participant.findOne({ email: req.body.email, conferenceCode: confCode });
    if (existingParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered for this conference' 
      });
    }
    
    // Create participant data object with only the fields that are in registrationFields
    const participantData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      conferenceCode: confCode
    };
    
    // Add other fields if they are in registrationFields
    if (registrationFields.includes('address')) participantData.address = req.body.address;
    if (registrationFields.includes('age')) participantData.age = req.body.age;
    if (registrationFields.includes('business')) participantData.business = req.body.business;
    if (registrationFields.includes('lunch')) participantData.lunch = req.body.lunch;
    if (registrationFields.includes('source')) participantData.source = req.body.source;
    if (registrationFields.includes('nationality')) participantData.nationality = req.body.nationality;
    if (registrationFields.includes('workunit')) participantData.workunit = req.body.workunit;
    if (registrationFields.includes('questions')) participantData.questions = req.body.questions;
    if (registrationFields.includes('rank')) participantData.rank = req.body.rank;
    if (registrationFields.includes('academic')) participantData.academic = req.body.academic;
    if (registrationFields.includes('role')) participantData.role = req.body.role;
    if (registrationFields.includes('speech')) participantData.speech = req.body.speech === true || req.body.speech === 'true';
    if (registrationFields.includes('lunch')) participantData.lunch = req.body.lunch === true || req.body.lunch === 'true';
    if (registrationFields.includes('dinner')) participantData.dinner = req.body.dinner === true || req.body.dinner === 'true';
    if (registrationFields.includes('feedback')) participantData.feedback = req.body.feedback;
    if (registrationFields.includes('transport')) participantData.transport = req.body.transport === true || req.body.transport === 'true';
    
    // Create new participant
    const participant = new Participant(participantData);
    
    // Save participant to database
    await participant.save();
    
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: req.body.email,
      subject: `${conference.name} - Registration Confirmation`,
      html: `
        <h1>Registration Confirmation</h1>
        <p>Dear ${req.body.name},</p>
        <p>Thank you for registering for ${conference.name}!</p>
        <p><strong>Registration Details:</strong></p>
        <ul>
          <li>Name: ${req.body.name}</li>
          <li>Email: ${req.body.email}</li>
          <li>Phone: ${req.body.phone}</li>
          ${participantData.workunit ? `<li>Work Unit: ${participantData.workunit}</li>` : ''}
          ${participantData.address ? `<li>Address: ${participantData.address}</li>` : ''}
          ${participantData.age ? `<li>Age: ${participantData.age}</li>` : ''}
          ${participantData.business ? `<li>Business: ${participantData.business}</li>` : ''}
          ${participantData.nationality ? `<li>Nationality: ${participantData.nationality}</li>` : ''}
          ${participantData.rank ? `<li>Rank: ${participantData.rank}</li>` : ''}
          ${participantData.academic ? `<li>Academic: ${participantData.academic}</li>` : ''}
          ${participantData.role ? `<li>Role: ${participantData.role}</li>` : ''}
          ${participantData.speech ? `<li>Will give speech: Yes</li>` : typeof participantData.speech !== 'undefined' ? `<li>Will give speech: No</li>` : ''}
          ${participantData.lunch ? `<li>Will have lunch: Yes</li>` : typeof participantData.lunch !== 'undefined' ? `<li>Will have lunch: No</li>` : ''}
          ${participantData.dinner ? `<li>Will attend dinner: Yes</li>` : typeof participantData.dinner !== 'undefined' ? `<li>Will attend dinner: No</li>` : ''}
          ${participantData.transport ? `<li>Will use transport: Yes</li>` : typeof participantData.transport !== 'undefined' ? `<li>Will use transport: No</li>` : ''}
          ${participantData.feedback ? `<li>Feedback: ${participantData.feedback}</li>` : ''}
          ${participantData.questions ? `<li>Questions: ${participantData.questions}</li>` : ''}
          ${participantData.source ? `<li>Source: ${participantData.source}</li>` : ''}
        </ul>
        <p>We look forward to seeing you at the event!</p>
        <p>Best regards,<br>${conference.name} Team</p>
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
    
    // Save participant data and conference info in session for thank you page
    req.session.participantName = req.body.name;
    req.session.participantEmail = req.body.email;
    req.session.conferenceName = conference.name;
    req.session.conferenceCode = conference.code;
    req.session.participantData = participantData;
    
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