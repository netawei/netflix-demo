const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['movie', 'series'],
    required: true
  },
  genre: [String],
  director: String,
  cast: [String],
  releaseYear: Number,
  description: String,
  rating: Number,
  posterUrl: String,
  videoUrl: String,
  seasons: [{
    seasonNumber: Number,
    episodes: [{
      episodeNumber: Number,
      title: String,
      duration: Number,
      videoUrl: String
    }]
  }]
}, { timestamps: true });


module.exports = mongoose.model('Content', contentSchema);
