const Participant = require('../models/Participant');
const Conference = require('../models/Conference');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

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
    if (registrationFields.includes('position')) participantData.position = req.body.position;
    if (registrationFields.includes('speciality')) participantData.speciality = req.body.speciality;
    // if (registrationFields.includes('lunch')) participantData.lunch = req.body.lunch;
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

    // Set the exact registration completion time
    participant.registrationTime = new Date();
    // Save again to store the registrationTime (or update if save() returns the doc)
    // Note: participant.save() might return the updated doc, check mongoose docs if needed
    // For simplicity, we save again. Alternatively, set it before the first save if that's acceptable.
    await participant.save();

    // Prepare attachments
    const attachments = [];
    const downloadsPath = path.join(__dirname, '../../frontend/public/downloads');
    try {
      if (fs.existsSync(downloadsPath)) {
        const files = fs.readdirSync(downloadsPath);
        files.forEach(file => {
          if (file !== '.gitignore') { // Optional: exclude .gitignore or other specific files
            attachments.push({
              filename: file,
              path: path.join(downloadsPath, file)
            });
          }
        });
      }
    } catch (attachError) {
      console.error('Error reading attachments directory:', attachError);
      // Proceed without attachments if there's an error
    }

    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: req.body.email,
      subject: `Xác nhận đăng ký tham dự ${conference.name}`,
      html: `
        <p>Kính gửi Ông/Bà ${req.body.name},</p>
        <p>Chúng tôi xác nhận bạn đã đăng ký thành công tham dự hội nghị <strong>${conference.name}</strong>.</p>
        <p><strong>Thông tin đăng ký của bạn:</strong></p>
        <ul>
          <li>Họ và tên: ${req.body.name}</li>
          <li>Email: ${req.body.email}</li>
          <li>Điện thoại: ${req.body.phone}</li>
          ${participantData.workunit ? `<li>Đơn vị công tác: ${participantData.workunit}</li>` : ''}
          ${participantData.rank ? `<li>Cấp bậc: ${participantData.rank}</li>` : ''}
          ${participantData.academic ? `<li>Học hàm/Học vị: ${participantData.academic}</li>` : ''}
          ${participantData.position ? `<li>Chức vụ: ${participantData.position}</li>` : ''}
          ${participantData.speciality ? `<li>Chuyên ngành: ${participantData.speciality}</li>` : ''}
          ${participantData.address ? `<li>Địa chỉ: ${participantData.address}</li>` : ''}
          ${participantData.age ? `<li>Tuổi: ${participantData.age}</li>` : ''}
          ${participantData.business ? `<li>Lĩnh vực: ${participantData.business}</li>` : ''}
          ${participantData.nationality ? `<li>Quốc tịch: ${participantData.nationality}</li>` : ''}
          ${participantData.role ? `<li>Vai trò tham dự: ${participantData.role}</li>` : ''}
          ${registrationFields.includes('speech') ? `<li>Đăng ký phát biểu: ${participantData.speech ? 'Có' : 'Không'}</li>` : ''}
          ${registrationFields.includes('lunch') ? `<li>Đăng ký ăn trưa: ${participantData.lunch ? 'Có' : 'Không'}</li>` : ''}
          ${registrationFields.includes('dinner') ? `<li>Đăng ký ăn tối: ${participantData.dinner ? 'Có' : 'Không'}</li>` : ''}
          ${registrationFields.includes('transport') ? `<li>Đăng ký xe đưa đón: ${participantData.transport ? 'Có' : 'Không'}</li>` : ''}
          ${participantData.feedback ? `<li>Góp ý: ${participantData.feedback}</li>` : ''}
          ${participantData.questions ? `<li>Câu hỏi cho BTC: ${participantData.questions}</li>` : ''}
          ${participantData.source ? `<li>Nguồn biết đến hội nghị: ${participantData.source}</li>` : ''}
        </ul>
        <p>Chúng tôi rất mong được đón tiếp bạn tại sự kiện.</p>
        ${attachments.length > 0 ? '<p><strong>Vui lòng kiểm tra các tài liệu quan trọng được đính kèm trong email này.</strong></p>' : ''}
        <p>Trân trọng,<br>Ban tổ chức ${conference.name}</p>
      `,
      attachments: attachments
    };

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