const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary'); 
const {
    createContent,
    getAllContent,
    getContentCast,
    getContentById,
    updateContent,
    deleteContent 
} = require('../controllers/contentController');

router.post('/', 
    upload.any(),
    createContent
);

router.get('/', getAllContent);
router.get('/:id/cast', getContentCast);
router.get('/:id', getContentById);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

module.exports = router;