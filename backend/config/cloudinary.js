const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'netflix-clone';
        let resource_type = 'auto';
        
        if (file.fieldname === 'poster') {
            folder = 'netflix-clone/posters';
        } else if (file.fieldname === 'video' || file.fieldname.startsWith('episodeVideo_')) {
            folder = 'netflix-clone/videos';
            resource_type = 'video';
        }
        return {
            folder: folder,
            resource_type: resource_type,
            allowed_formats: ['jpg', 'png', 'mp4', 'mov']
        };
    }
});

const upload = multer({ storage: storage });

module.exports = upload;