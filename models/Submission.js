const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    socialPlatform: {
        type: String,
        required: true,
        enum: ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'github']
    },
    socialHandle: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String,
        required: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Submission', submissionSchema);