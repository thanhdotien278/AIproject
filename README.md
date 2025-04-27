# Conference Registration System

A mobile-friendly conference registration website built with Node.js, Express, MongoDB, and Tailwind CSS.

## Features

- Responsive design optimized for mobile devices
- Four main pages: Home, Registration, Thank You, and Admin Dashboard
- Email confirmations for registrants
- PDF invitation generation and download
- Admin dashboard with participant management
- Excel export functionality

## Prerequisites

- Node.js (v14 or later)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd conference-registration
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/conference-registration

   # Session Secret
   SESSION_SECRET=your-super-secret-session-key

   # Admin Credentials
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123

   # Email Configuration (Gmail example)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. Build the CSS:
   ```
   npm run build:css
   ```

5. Seed the admin user:
   ```
   npm run seed
   ```

## Running the Application

### Development Mode

Run the application with hot reloading for both server and CSS:
```
npm run dev:all
```

Or run them separately:
```
npm run watch:css
npm run dev
```

### Production Mode

For production deployment:
```
npm run build:css
npm start
```

## Usage

- Access the website: `http://localhost:3000`
- Registration page: `http://localhost:3000/register`
- Admin login: `http://localhost:3000/admin/login`
  - Default credentials: admin / admin123 (unless changed in .env)

## Admin Features

- View all registrations in a table format
- Send confirmation emails to individual participants or in bulk
- Export registration data to Excel
- See statistics on the dashboard

## Customization

### Conference Details

Update the conference details in the following files:
- `frontend/views/index.ejs` - Main content and schedule
- `frontend/views/layouts/main.ejs` - Footer contact information

### Email Templates

Modify the email templates in:
- `backend/controllers/registerController.js` - Initial confirmation email
- `backend/controllers/adminController.js` - Admin-triggered emails

## Technology Stack

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Templating**: EJS
- **Email**: Nodemailer
- **Excel Export**: xlsx
- **PDF Generation**: jsPDF

## License

ISC License

## Author

Time format: "9:00 - 12:00, 14:00 - 17:00". Good

## Acknowledgements

- Tailwind CSS
- Express.js
- MongoDB
- Nodemailer
- All other open-source libraries used in this project  