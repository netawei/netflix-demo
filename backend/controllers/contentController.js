const Content = require('../models/Content');

exports.createContent = async (req, res) => {
  try {
    const newContent = await Content.create(req.body);
    res.status(201).json(newContent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllContent = async (req, res) => {
  try {
    const contents = await Content.find();
    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.searchContent = async (req, res) => {
  const query = req.query.q;
  try {
    const results = await Content.find({ title: new RegExp(query, 'i') });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updateContent = async (req, res) => {
  try {
    const updated = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteContent = async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
