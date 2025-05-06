const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const QRCode = require('qrcode');

// Load environment variables
dotenv.config();

// Import routes
const registerRoutes = require('./routes/register');
const adminRoutes = require('./routes/admin');

// Initialize express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'conference-registration-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Set view engine and layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware to set admin layout for admin routes
app.use('/admin', (req, res, next) => {
  // Skip for login page (it has its own layout)
  if (req.path === '/login') {
    return next();
  }
  // Set admin layout for all other admin routes
  res.locals.layout = 'layouts/admin';
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-registration')
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/register', registerRoutes);
app.use('/admin', adminRoutes);

// QR Code API endpoint
app.get('/api/qrcode', async (req, res) => {
  try {
    // Get the conference code from query parameters
    const { code } = req.query;
    
    // Build the registration URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let registrationUrl = `${baseUrl}/register`;
    registrationUrl = `http://192.168.1.111:3000/register`;
    // Add the conference code if provided
    if (code) {
      registrationUrl += `?code=${code}`;
    }
    
    // registrationUrl = `https://dev.3tsmart.org/2`;
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#2563eb', // Blue color for QR code
        light: '#ffffff' // White background
      }
    });
    
    // Send the QR code data URL
    res.send({ qrCodeDataUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).send({ error: 'Failed to generate QR code' });
  }
});

// Home route
app.get('/', async (req, res) => {
  try {
    // Fetch the latest conference
    const latestConference = await mongoose.model('Conference').findOne()
      .sort({ createdAt: -1 })
      .populate('location');
    
    // Fetch the receptionist user with username 'rec1'
    const receptionist = await mongoose.model('User').findOne({ username: 'rec1' });
    
    if (!latestConference) {
      return res.render('index', { 
        receptionist,
        conference: null,
        formattedDates: null,
        locationName: null,
        locationAddress: null
      });
    }
    
    // Format dates for display
    const startDate = new Date(latestConference.startDate);
    const endDate = new Date(latestConference.endDate);
    const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    
    let formattedDates = startDate.toLocaleDateString('en-US', formatOptions);
    if (startDate.getTime() !== endDate.getTime()) {
      formattedDates += ` - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
    }
    
    // Get location details
    const locationName = latestConference.location ? latestConference.location.name : 'To be announced';
    const locationAddress = latestConference.location ? latestConference.location.address : '';
    
    res.render('index', {
      conference: latestConference,
      formattedDates,
      locationName,
      locationAddress,
      receptionist
    });
  } catch (error) {
    console.error('Error fetching latest conference:', error);
    res.render('index', { 
      conference: null,
      formattedDates: null,
      locationName: null,
      locationAddress: null,
      receptionist: null
    });
  }
});

// Thank you route
app.get('/thankyou', async (req, res) => {
  try {
    // Get participant data from session
    const participantName = req.session.participantName;
    const participantEmail = req.session.participantEmail;
    const conferenceName = req.session.conferenceName;
    const conferenceCode = req.session.conferenceCode;
    const participantData = req.session.participantData;
    
    if (!participantEmail) {
      return res.redirect('/');
    }
    
    // Find the participant in database to get all registration details
    const participant = await mongoose.model('Participant').findOne({ email: participantEmail });
    
    // Find the conference details
    const conference = await mongoose.model('Conference').findOne({ 
      code: participant ? participant.conferenceCode : (conferenceCode || null)
    }).populate('location');
    
    if (!conference) {
      return res.render('thankyou', { 
        participantName,
        participantEmail,
        participant: participantData || null, // Use session data as fallback
        conference: { name: conferenceName || 'Hội Nghị', code: conferenceCode },
        formattedDates: null,
        locationName: null,
        locationAddress: null
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
    
    res.render('thankyou', { 
      participantName,
      participantEmail,
      participant: participant || participantData, // Use session data as fallback
      conference,
      formattedDates,
      locationName,
      locationAddress
    });
  } catch (error) {
    console.error('Error rendering thank you page:', error);
    // Use session data as fallback in case of error
  const participantName = req.session.participantName;
  const participantEmail = req.session.participantEmail;
    const conferenceName = req.session.conferenceName;
    const conferenceCode = req.session.conferenceCode;
    const participantData = req.session.participantData;
  
  res.render('thankyou', { 
    participantName,
      participantEmail,
      participant: participantData || null,
      conference: { name: conferenceName || 'Hội Nghị', code: conferenceCode },
      formattedDates: null,
      locationName: null,
      locationAddress: null
  });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { 
    title: 'Error',
    message: 'Something went wrong on our end. Please try again later.' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 