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
    let conference;
    
    // Check for conference code in query parameters
    const queryCode = req.query.code;
    
    if (queryCode) {
      // If code is provided in query, find that specific conference
      conference = await Conference.findOne({ code: queryCode.toUpperCase() }).populate('location');
    }
    
    // If no conference found by code or no code provided, get the latest conference
    if (!conference) {
      conference = await Conference.findOne().sort({ createdAt: -1 }).populate('location');
    }
    
    if (!conference) {
      return res.status(404).render('error', { 
        message: 'No conferences available for registration',
        layout: false
      });
    }
    
    // Nếu có mã hội nghị trong URL và không phải là hội nghị mới nhất, chuyển hướng
    const conferenceCode = req.params.conferenceCode;
    if (conferenceCode && conferenceCode !== conference.code) {
      return res.redirect(`/register?code=${conference.code}`);
    }
    
    // Format dates for display
    const startDate = new Date(conference.startDate);
    const endDate = new Date(conference.endDate);
    const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    
    let formattedDates = startDate.toLocaleDateString('en-US', formatOptions);
    if (startDate.getTime() !== endDate.getTime()) {
      formattedDates += ` - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
    }
    
    // Get location name
    const locationName = conference.location ? conference.location.name : 'To be announced';
    
    res.render('register', { 
      conference: conference,
      formattedDates,
      locationName,
      registrationFields: conference.registrationFields || ['name', 'email', 'phone']
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
    const { name, email, phone, address, age, business, lunch, source, nationality, organization, questions, conferenceCode } = req.body;
    
    // Find the conference by code from form
    let conference;
    if (conferenceCode) {
      conference = await Conference.findOne({ code: conferenceCode });
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
    
    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and phone are required' 
      });
    }
    
    // Check if participant already registered for this conference
    const existingParticipant = await Participant.findOne({ email, conferenceCode: confCode });
    if (existingParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered for this conference' 
      });
    }
    
    // Create new participant with all possible fields
    const participant = new Participant({
      name,
      email,
      phone,
      address,
      age,
      business,
      lunch,
      source,
      nationality,
      organization,
      questions,
      conferenceCode: confCode
    });
    
    // Save participant to database
    await participant.save();
    
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `${conference.name} - Registration Confirmation`,
      html: `
        <h1>Registration Confirmation</h1>
        <p>Dear ${name},</p>
        <p>Thank you for registering for ${conference.name}!</p>
        <p><strong>Registration Details:</strong></p>
        <ul>
          <li>Name: ${name}</li>
          <li>Email: ${email}</li>
          <li>Phone: ${phone || 'Not provided'}</li>
          ${organization ? `<li>Organization: ${organization}</li>` : ''}
          ${address ? `<li>Address: ${address}</li>` : ''}
          ${age ? `<li>Age: ${age}</li>` : ''}
          ${business ? `<li>Business: ${business}</li>` : ''}
          ${lunch ? `<li>Lunch: ${lunch}</li>` : ''}
          ${nationality ? `<li>Nationality: ${nationality}</li>` : ''}
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
    req.session.participantName = name;
    req.session.participantEmail = email;
    req.session.conferenceName = conference.name;
    
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