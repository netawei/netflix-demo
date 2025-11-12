const Content = require('../models/Content');
const User = require('../models/User');


async function getRating(movieTitle) {
    try {
        const response = await fetch(`http://www.omdbapi.com/?t=${movieTitle}&apikey=${process.env.OMDB_API_KEY}`, { method: 'GET'})
        const data = await response.json();
        return {
            imdbRating: data.imdbRating || -1
        };
    } catch (error) {
        console.log("Error getting ratings:", error);
        return { imdbRating: -1 };
    }
}


exports.createContent = async (req, res) => {
    let userId, data;
    
    if (typeof req.body.data === 'string') {
        try {
            data = JSON.parse(req.body.data);
            userId = req.body.userId;
        } catch (e) {
            return res.status(400).json({ message: 'Invalid data format' });
        }
    } else {
        userId = req.body.userId;
        data = req.body.data;
    }
    
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (user.isAdmin !== true) {
        return res.status(404).json({ message: 'User does not have permissions, only admins can create content' });
    }
    
    try {
        if (req.files && req.files.length > 0) {            
            req.files.forEach(file => {                
                if (file.fieldname === 'poster') {
                    data.posterUrl = file.path;
                }
                else if (file.fieldname === 'video') {
                    data.videoUrl = file.path;
                }
                else if (file.fieldname.startsWith('episodeVideo_')) {
                    const parts = file.fieldname.split('_');
                    const seasonIndex = parseInt(parts[1]);
                    const episodeIndex = parseInt(parts[2]);                    
                    if (data.seasons && data.seasons[seasonIndex] && data.seasons[seasonIndex].episodes[episodeIndex]) {
                        data.seasons[seasonIndex].episodes[episodeIndex].videoUrl = file.path;
                    } else {
                        console.log('Season or episode not found in data');
                    }
                }
            });
        }
        
        console.log('Final data before saving:', JSON.stringify(data, null, 2));
        
        const ratings = await getRating(data.title);
        const contentWithRatings = {
            ...data,
            rating: ratings.imdbRating
        };
        
        const newContent = await Content.create(contentWithRatings);
        res.status(201).json(newContent);
        
    } catch (error) {
        console.error('Error creating content:', error);
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

exports.getContentCast = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id).select('title cast');
        if (!content) {
            return res.status(404).json({ message: 'Content not found' });
        }
        res.json({
            title: content.title,
            cast: content.cast || []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getContentById = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        if (!content) {
            return res.status(404).json({ message: 'Content not found' });
        }
        res.json(content);
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
