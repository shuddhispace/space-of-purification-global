const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

// Create folders if not present
const storiesDir = path.join(__dirname, 'stories');
const uploadsDir = path.join(__dirname, 'uploads');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(storiesDir)) fs.mkdirSync(storiesDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

// Setup error logging
const logFile = path.join(logsDir, 'error.log');
function logError(error) {
  const time = new Date().toISOString();
  const message = `[${time}] ${error.stack || error}\n`;
  fs.appendFile(logFile, message, (err) => {
    if (err) console.error('❌ Failed to write to error log:', err);
  });
}

// Configure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Handle story submission
app.post('/submit-story', upload.single('image'), (req, res) => {
  try {
    const { name, email, city, country, story } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!name || !email || !story) {
      return res.status(500).json({ error: 'Missing required fields' });
    }

    const storyData = {
      name,
      email,
      city,
      country,
      story,
      image,
      timestamp: new Date().toISOString(),
    };

    const filename = `${Date.now()}-${name.replace(/\s+/g, '_')}.json`;
    const filepath = path.join(storiesDir, filename);

    fs.writeFile(filepath, JSON.stringify(storyData, null, 2), (err) => {
      if (err) {
        logError(err);
        console.error('❌ Error saving story:', err);
        return res.status(500).json({ error: 'Error saving story' });
      }

      console.log('✅ Story saved:', filename);

      // ✅ Smart response based on request type
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        res.json({ message: 'Story submitted successfully' });
      } else {
        res.redirect('/thank-you.html');
      }
    });
  } catch (error) {
    logError(error);
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve stories
app.get('/stories', (req, res) => {
  try {
    fs.readdir(storiesDir, (err, files) => {
      if (err) {
        logError(err);
        return res.status(500).json({ error: 'Failed to read stories' });
      }

      const stories = [];
      files.forEach((file) => {
        const filePath = path.join(storiesDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const story = JSON.parse(content);
          stories.push(story);
        } catch (error) {
          logError(`Invalid JSON in file ${file}: ${error}`);
          console.warn(`⚠️ Invalid JSON in file ${file}`);
        }
      });

      res.json(stories);
    });
  } catch (error) {
    logError(error);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

// 📩 Handle contact/booking form submission
const contactsDir = path.join(__dirname, 'contacts');
if (!fs.existsSync(contactsDir)) fs.mkdirSync(contactsDir);
app.post('/submit-contact', upload.none(), async (req, res) => {
  try {
    const { name, email, phone, message, selectedPlan } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const contactData = {
      name,
      email,
      phone,
      selectedPlan,
      message,
      timestamp: new Date().toISOString(),
    };

    const filename = `contact-${Date.now()}-${name.replace(/\s+/g, '_')}.json`;
    const filepath = path.join(contactsDir, filename);

    // Save JSON file
    fs.writeFileSync(filepath, JSON.stringify(contactData, null, 2));
    console.log('📩 Contact form submitted:', filename);

    // ✅ Send confirmation email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shuddhispace@gmail.com',      // ✅ Replace
        pass: 'kqot nxqh grvx cydy'          // ✅ Replace with Gmail App Password
      }
    });

    const mailOptions = {
      from: 'Space of Purification Global <shuddhispace@gmail.com>',
      to: email, // send to user's email
      subject: `Your Booking Confirmation – ${contactData.message.includes('Starter') ? 'Starter Plan' : 'Selected Plan'}`,
  text: `
Hello ${name},

Thank you for choosing the ${contactData.message} with Space of Purification Global.

We’re excited to support you on your healing journey. Here’s what happens next:

📅 Plan Selected: ${contactData.message}  
📞 Contact Number: ${phone}  
🌐 Website: https://spaceofpurificationglobal.com  
📩 For queries: shuddhispace@gmail.com

We will personally contact you within 24 hours to guide you through the next steps.

Warm regards,  
Space of Purification Global  
– Heal Deeply. Live Freely.
`
};

    transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Email error:', error);
  } else {
    console.log('✅ Confirmation email sent:', info.response);
  }
});

    // ✅ Final response
    res.json({ success: true });

  } catch (error) {
    logError(error);
    console.error('❌ Contact form error:', error);
    res.status(500).json({ error: 'Server error while submitting contact' });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
