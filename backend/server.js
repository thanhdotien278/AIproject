const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const QRCode = require('qrcode');
const sharp = require('sharp');
const flash = require('connect-flash');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

// Load environment variables
dotenv.config();

// Import routes
const registerRoutes = require('./routes/register');
const adminRoutes = require('./routes/admin');
// Import controllers
const registerController = require('./controllers/registerController');

// Initialize express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

global.io = io;

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

// Flash middleware
app.use(flash());

// Middleware to pass flash messages to all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // For general errors, like passport errors
  next();
});

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
  .then(() => {
    console.log('Connected to MongoDB');
    // Check for participants without proper participantIds
    checkParticipantIds();
    // Check and set active conference if none exists
    setActiveConferenceIfNone();
  })
  .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/register', registerRoutes);
app.use('/admin', adminRoutes);

// Public statistics route
app.get('/stats', registerController.showPublicStatsPage);

// QR Code API endpoint
app.get('/api/qrcode', async (req, res) => {
  try {
    // Get the conference code from query parameters
    const { code } = req.query;
    
    // Build the registration URL using dynamic IP detection
    const ip = getLocalIpAddress();
    let registrationUrl = `http://${ip}:3000/register`;
    
    // Add the conference code if provided
    if (code) {
      registrationUrl += `?code=${code}`;
    }
    
    console.log('QR Code Registration URL:', registrationUrl);
    
    // Generate QR code as buffer first
    const qrCodeBuffer = await QRCode.toBuffer(registrationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000', // Black for better scanning
        light: '#ffffff' // White background
      }
    });
    
    try {
      // Load the favicon and overlay it on the QR code
      const faviconPath = path.join(__dirname, '../frontend/public/images/favicon.png');
      const logoSize = 60; // Logo size for better visibility but still scannable
      
      const faviconBuffer = await sharp(faviconPath)
        .resize(logoSize, logoSize)
        .png()
        .toBuffer();
      
      // Overlay favicon on QR code
      const finalQRCode = await sharp(qrCodeBuffer)
        .composite([
          {
            input: faviconBuffer,
            top: Math.floor((300 - logoSize) / 2), // Center vertically
            left: Math.floor((300 - logoSize) / 2), // Center horizontally
          }
        ])
        .png()
        .toBuffer();
      
      // Convert to data URL
      const qrCodeDataUrl = `data:image/png;base64,${finalQRCode.toString('base64')}`;
      
      // Send the QR code data URL
      res.send({ qrCodeDataUrl });
    } catch (logoError) {
      console.warn('Error adding logo to QR code, falling back to plain QR code:', logoError);
      // If logo processing fails, fall back to plain QR code
      const qrCodeDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
      res.send({ qrCodeDataUrl });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).send({ error: 'Failed to generate QR code' });
  }
});

// Route for printable QR code page
app.get('/qrcode', async (req, res) => {
  res.render('qrcode');
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

    // Fetch speakers
    const speakers = await mongoose.model('Speaker').find().sort({ createdAt: -1 }); // Fetch all speakers for now
    
    if (!latestConference) {
      return res.render('index', { 
        receptionist,
        conference: null,
        formattedDates: null,
        locationName: null,
        locationAddress: null,
        speakers: speakers || [] // Pass speakers even if no conference
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
      receptionist,
      speakers // Pass speakers to the template
    });
  } catch (error) {
    console.error('Error fetching data for homepage:', error);
    res.render('index', { 
      conference: null,
      formattedDates: null,
      locationName: null,
      locationAddress: null,
      receptionist: null,
      speakers: [] // Pass empty array on error
    });
  }
});

// Thank you route
app.get('/thankyou', async (req, res) => {
  console.time('Total /thankyou route time');
  try {
    // Get participant data from session
    const participantName = req.session.participantName;
    const participantEmail = req.session.participantEmail;
    const conferenceName = req.session.conferenceName;
    const conferenceCode = req.session.conferenceCode;
    const participantData = req.session.participantData;
    
    if (!participantEmail) {
      console.timeEnd('Total /thankyou route time');
      return res.redirect('/');
    }
    
    console.time('Find participant by email');
    // Find the participant in database to get all registration details
    const participant = await mongoose.model('Participant').findOne({ email: participantEmail });
    console.timeEnd('Find participant by email');
    
    console.time('Find latest conference');
    // Find the latest conference details
    const conference = await mongoose.model('Conference').findOne()
                              .sort({ createdAt: -1 })
                              .populate('location');
    console.timeEnd('Find latest conference');
    
    if (!conference) {
      console.time('Render thankyou page');
      res.render('thankyou', { 
        participantName,
        participantEmail,
        participant: participantData || null, // Use session data as fallback
        conference: { name: conferenceName || 'Hội Nghị', code: conferenceCode },
        formattedDates: null,
        locationName: null,
        locationAddress: null
      });
      console.timeEnd('Render thankyou page');
      console.timeEnd('Total /thankyou route time');
      return;
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
    
    const qrDataForPdf = {
      conferenceCode: conference ? conference.code : (conferenceCode || 'N/A'),
      participantId: participant ? (participant.id || participant._id) : (participantData ? (participantData.id || participantData._id) : 'N/A'),
      participantName: participant ? participant.name : (participantName || 'N/A')
    };

    console.time('Render thankyou page');
    res.render('thankyou', { 
      participantName,
      participantEmail,
      participant: participant || participantData, // Use session data as fallback
      conference,
      formattedDates,
      locationName,
      locationAddress,
      qrData: qrDataForPdf
    });
    console.timeEnd('Render thankyou page');
    console.timeEnd('Total /thankyou route time');
  } catch (error) {
    console.error('Error rendering thank you page:', error);
    // Use session data as fallback in case of error
    const participantName = req.session.participantName;
    const participantEmail = req.session.participantEmail;
    const conferenceName = req.session.conferenceName;
    const conferenceCode = req.session.conferenceCode;
    const participantData = req.session.participantData;
  
    const fallbackQrData = {
      conferenceCode: conferenceCode || 'N/A',
      participantId: 'N/A',
      participantName: participantName || 'N/A'
    };

    console.time('Render thankyou page');
    res.render('thankyou', { 
      participantName,
      participantEmail,
      participant: participantData || null,
      conference: { name: conferenceName || 'Hội Nghị', code: conferenceCode },
      formattedDates: null,
      locationName: null,
      locationAddress: null,
      qrData: fallbackQrData
    });
    console.timeEnd('Render thankyou page');
    console.timeEnd('Total /thankyou route time');
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

// Socket.IO connection listener
io.on('connection', (socket) => {
  console.log('A user connected to Socket.IO for stats');
  // Future: could send initial stats here or wait for client request
  socket.on('disconnect', () => {
    console.log('User disconnected from Socket.IO stats');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (let iface of Object.values(interfaces)) {
    for (let config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost'; // fallback
}

// Check for participants without proper participantIds (utility function)
async function checkParticipantIds() {
  try {
    const Participant = mongoose.model('Participant');
    const participantsWithoutIds = await Participant.find({
      $or: [
        { participantId: { $exists: false } },
        { participantId: null },
        { participantId: '' }
      ]
    });
    
    if (participantsWithoutIds.length > 0) {
      console.log(`Found ${participantsWithoutIds.length} participants without proper IDs`);
      // Could add logic here to fix IDs if needed
    }
  } catch (error) {
    console.error('Error checking participant IDs:', error);
  }
}

// Set active conference if none exists (utility function)
async function setActiveConferenceIfNone() {
  try {
    const Conference = mongoose.model('Conference');
    const activeConference = await Conference.findOne({ isActive: true });
    
    if (!activeConference) {
      const latestConference = await Conference.findOne().sort({ createdAt: -1 });
      if (latestConference) {
        latestConference.isActive = true;
        await latestConference.save();
        console.log(`Set conference ${latestConference.code} as active`);
      }
    }
  } catch (error) {
    console.error('Error setting active conference:', error);
  }
} 