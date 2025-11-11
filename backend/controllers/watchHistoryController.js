const WatchHistory = require('../models/watchHistory');

exports.createWatchHistory = async (req, res) => {
    try {
      const { user, profile, content } = req.body;
      console.log('Received profile:', profile); 
      const exists = await WatchHistory.findOne({ user, content });
      if (exists) return res.status(400).json({ message: 'Already exists' });
      const record = new WatchHistory({ 
        user, profile, content 
      });
      
      await record.save();
      console.log('Saved record:', record); 
      res.status(201).json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

exports.getAllHistories = async (req, res) => {
  try {
    const histories = await WatchHistory.find()
      .populate('user', 'username email')
      .populate('content', 'title genre');
    res.json(histories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getUserHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const histories = await WatchHistory.find({ user: userId })
      .populate('content', 'title genre');
    res.json(histories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateProgress = async (req, res) => {
  try {
    const { user, content, progress } = req.body;
    // findOneAndUpdate( filter, update, options )
    const record = await WatchHistory.findOneAndUpdate(
      { user, content },
      { progress, lastWatchedAt: Date.now() },
      { new: true, upsert: true } //upsert: update or insert
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// New function for updating episode progress
exports.updateEpisodeProgress = async (req, res) => {
  try {
    const { user, content, seasonNumber, episodeNumber, progress, completed } = req.body;
    
    const record = await WatchHistory.findOne({ user, content });
    
    if (!record) {
      // Create new record
      const newRecord = new WatchHistory({
        user,
        content,
        currentEpisode: { seasonNumber, episodeNumber },
        episodeProgress: [{
          seasonNumber,
          episodeNumber,
          progress,
          completed: completed || false
        }],
        lastWatchedAt: Date.now()
      });
      await newRecord.save();
      return res.json(newRecord);
    }
    
    // Update existing record
    const existingEpisode = record.episodeProgress.find(
      ep => ep.seasonNumber === seasonNumber && ep.episodeNumber === episodeNumber
    );
    
    if (existingEpisode) {
      existingEpisode.progress = progress;
      if (completed !== undefined) {
        existingEpisode.completed = completed;
      }
    } else {
      record.episodeProgress.push({
        seasonNumber,
        episodeNumber,
        progress,
        completed: completed || false
      });
    }
    
    record.currentEpisode = { seasonNumber, episodeNumber };
    record.lastWatchedAt = Date.now();
    
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get episode progress for a series
exports.getEpisodeProgress = async (req, res) => {
  try {
    const { userId, contentId } = req.params;
    const record = await WatchHistory.findOne({ user: userId, content: contentId });
    
    if (!record) {
      return res.json({ episodeProgress: [], currentEpisode: null });
    }
    
    res.json({
      episodeProgress: record.episodeProgress || [],
      currentEpisode: record.currentEpisode || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteHistory = async (req, res) => {
  try {
    await WatchHistory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};