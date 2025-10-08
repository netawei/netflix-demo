const WatchHistory = require('../models/watchHistory');

exports.createWatchHistory = async (req, res) => {
  try {
    const { user, content } = req.body;

    const exists = await WatchHistory.findOne({ user, content });
    if (exists) return res.status(400).json({ message: 'Already exists' });

    const record = new WatchHistory({ user, content });
    await record.save();
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


exports.deleteHistory = async (req, res) => {
  try {
    await WatchHistory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};