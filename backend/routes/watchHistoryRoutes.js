const express = require('express');
const router = express.Router();
const {
    createWatchHistory,
    getAllHistories,
    getUserHistory,
    updateProgress,
    deleteHistory} = require('../controllers/watchHistoryController');


router.post('/', createWatchHistory);

router.get('/', getAllHistories);

router.get('/user/:userId', getUserHistory);

router.put('/progress', updateProgress);

router.delete('/:id', deleteHistory);

module.exports = router;