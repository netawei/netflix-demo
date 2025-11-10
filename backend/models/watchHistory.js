const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  // For movies: track single progress
  progress: {
    type: Number,
    default: 0 
  },
  // For series: track progress per episode
  episodeProgress: [{
    seasonNumber: Number,
    episodeNumber: Number,
    progress: Number,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  // Track current episode being watched
  currentEpisode: {
    seasonNumber: Number,
    episodeNumber: Number
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WatchHistory', watchHistorySchema);