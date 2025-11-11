const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserProfiles, 
  addProfile,
  toggleContentLike,
  toggleFavoriteContent,
  getProfileLikedContent,
  getProfileFavorites,
  getRecommendations,
  updateProfile,
  deleteProfile,
  getStatistics
} = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.get('/:userId/profiles', getUserProfiles);
router.post('/profiles/add', addProfile);
router.put('/:userId/profiles/:profileId', updateProfile)
router.delete('/:userId/profiles/:profileId', deleteProfile)
router.post('/profiles/like', toggleContentLike);
router.post('/profiles/liked-content', getProfileLikedContent);
router.post('/profiles/favorite', toggleFavoriteContent);
router.post('/profiles/favorites', getProfileFavorites);
router.post('/profiles/recommendations', getRecommendations);
router.get('/:userId/statistics', getStatistics);

module.exports = router;