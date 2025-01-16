const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const Submission = require('./models/Submission');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer with size limits and file filtering
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
}).array('images', 5); // limit to 5 images

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.post('/api/submissions', async (req, res) => {
    try {
        // Handle upload with better error catching
        upload(req, res, async function(err) {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ error: err.message });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No images uploaded' });
            }

            const { name, socialHandle, socialPlatform } = req.body;

            // Log request data
            console.log('Received files:', req.files.map(f => f.originalname));
            console.log('Form data:', { name, socialHandle, socialPlatform });

            // Upload images to Cloudinary with better error handling
            const imageUrls = [];
            for (const file of req.files) {
                try {
                    const result = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                folder: "submissions",
                                resource_type: "auto",
                                allowed_formats: ["jpg", "jpeg", "png", "gif"],
                            },
                            (error, result) => {
                                if (error) {
                                    console.error('Cloudinary upload error:', error);
                                    reject(error);
                                } else {
                                    console.log('Cloudinary upload success:', result.secure_url);
                                    resolve(result);
                                }
                            }
                        );

                        uploadStream.end(file.buffer);
                    });

                    imageUrls.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading to Cloudinary:', uploadError);
                    return res.status(500).json({ error: 'Failed to upload image to cloud storage' });
                }
            }

            // Create and save submission
            const submission = new Submission({
                name,
                socialPlatform,
                socialHandle,
                images: imageUrls
            });

            await submission.save();
            console.log('Submission saved:', submission);
            res.status(201).json(submission);
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error occurred' });
    }
});

// Get route with error handling
app.get('/api/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find().sort({ createdAt: -1 });
        console.log(`Retrieved ${submissions.length} submissions`);
        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete route remains the same...

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Cloudinary config:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
    });
});