const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so frontend can talk to this server
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for handling photo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'server/uploads');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Route to handle transformation story submission
app.post('/submit-story', upload.single('photo'), (req, res) => {
  const { name, city, country, story } = req.body;
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  const storyData = {
    name,
    city,
    country,
    story,
    photo: photoPath,
    submittedAt: new Date().toISOString()
  };

  const filename = `${Date.now()}_${name.replace(/\s+/g, '_')}.json`;
  const filePath = path.join(__dirname, 'stories', filename);

  fs.writeFile(filePath, JSON.stringify(storyData, null, 2), (err) => {
    if (err) {
      console.error('Error saving story:', err);
      return res.status(500).json({ message: 'Failed to save story.' });
    }
    res.json({ message: 'Story submitted successfully!' });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});