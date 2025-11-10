const express = require('express');
const router = express.Router();
const {
  createWatchHistory,
  getAllHistories,
  getUserHistory,
  updateProgress,
  updateEpisodeProgress,
  getEpisodeProgress,
  deleteHistory
} = require('../controllers/watchHistoryController');

router.post('/', createWatchHistory);

router.get('/', getAllHistories);

router.get('/user/:userId', getUserHistory);

router.put('/progress', updateProgress);

router.put('/episode-progress', updateEpisodeProgress);

router.get('/episode-progress/:userId/:contentId', getEpisodeProgress); 

router.delete('/:id', deleteHistory);

module.exports = router;