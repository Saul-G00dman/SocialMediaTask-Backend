const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();
const Submission = require('./models/Submission');


const app = express();
const PORT = process.env.PORT || 3000;


// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);  // Use the uploadDir constant
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));



// Routes
app.post('/api/submissions', upload.array('images'), async (req, res) => {
  try {
      const { name, socialHandle, socialPlatform } = req.body;
      const images = req.files.map(file => `uploads/${file.filename}`);

      const submission = new Submission({
          name,
          socialPlatform,
          socialHandle,
          images
      });

      await submission.save();
      res.status(201).json(submission);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

app.get('/api/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find().sort({ createdAt: -1 });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/submissions/:id', async (req, res) => {
  try {
      const submission = await Submission.findById(req.params.id);
      
      if (!submission) {
          return res.status(404).json({ error: 'Submission not found' });
      }

      // Delete associated images from the filesystem
      for (const imagePath of submission.images) {
          const fullPath = path.join(__dirname, imagePath);
          if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
          }
      }

      // Delete the submission from database
      await Submission.findByIdAndDelete(req.params.id);
      
      res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // console.log(`Upload directory: ${uploadDir}`);  
});