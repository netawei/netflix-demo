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
  progress: {
    type: Number,
    default: 0 
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WatchHistory', watchHistorySchema);