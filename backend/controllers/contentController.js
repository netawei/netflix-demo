const Content = require("../models/Content");
const User = require("../models/User");
const { logError } = require("../utils/logger");

async function getRating(movieTitle) {
    try {
        const response = await fetch(`http://www.omdbapi.com/?t=${movieTitle}&apikey=${process.env.OMDB_API_KEY}`, { method: 'GET'})
        const data = await response.json();
        return {
            imdbRating: data.imdbRating || -1
        };
    } catch (error) {
		console.error("Error getting ratings:", error);
        await logError(
            "Error getting ratings",
            error,
            { movieTitle },
            "content:ratings"
        );
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
		req.logInfo?.(
            "Content creation requested",
            { userId, title: data?.title },
            "content:create"
        );

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
						req.logDebug?.(
                            'Episode video upload skipped - season or episode missing',
                            { seasonIndex, episodeIndex, title: data?.title },
                            "content:create"
                        );
                    }
                }
            });
        }
        
		console.log("Final data before saving:", JSON.stringify(data, null, 2));
        const ratings = await getRating(data.title);
        const contentWithRatings = {
            ...data,
            rating: ratings.imdbRating
        };
        
		const newContent = await Content.create(contentWithRatings);
		console.log("Content created:", newContent._id.toString());
		req.logInfo?.(
            "Content created",
            { userId, contentId: newContent._id, title: newContent.title },
            "content:create"
        );
        res.status(201).json(newContent);
        
    } catch (error) {
		console.error("Error creating content:", error);
		req.logError?.(
            'Error creating content',
            error,
            { userId, title: data?.title },
            "content:create"
        );
        res.status(400).json({ message: error.message });
    }
};

exports.getAllContent = async (req, res) => {
    try {
		const contents = await Content.find();
		req.logDebug?.(
            "Fetched all content",
            { count: contents.length },
            "content:read"
        );
        res.json(contents);
    } catch (error) {
		console.error("Error fetching all content:", error);
        req.logError?.(
            "Error fetching all content",
            error,
            {},
            "content:read"
        );
        res.status(500).json({ message: error.message });
    }
};

exports.getContentCast = async (req, res) => {
    try {
		const content = await Content.findById(req.params.id).select('title cast');
        if (!content) {
			req.logInfo?.(
                "Content cast fetch failed - not found",
                { contentId: req.params.id },
                "content:read"
            );
            return res.status(404).json({ message: 'Content not found' });
        }
		req.logDebug?.(
            "Content cast fetched",
            { contentId: content._id },
            "content:read"
        );
        res.json({
            title: content.title,
            cast: content.cast || []
        });
    } catch (error) {
		console.error("Error fetching content cast:", error);
        req.logError?.(
            "Error fetching content cast",
            error,
            { contentId: req.params.id },
            "content:read"
        );
        res.status(500).json({ message: error.message });
    }
};

exports.getContentById = async (req, res) => {
    try {
		const content = await Content.findById(req.params.id);
        if (!content) {
			req.logInfo?.(
                "Content fetch failed - not found",
                { contentId: req.params.id },
                "content:read"
            );
            return res.status(404).json({ message: 'Content not found' });
        }
		req.logDebug?.(
            "Content fetched",
            { contentId: content._id },
            "content:read"
        );
        res.json(content);
    } catch (error) {
		console.error("Error fetching content by id:", error);
        req.logError?.(
            "Error fetching content by id",
            error,
            { contentId: req.params.id },
            "content:read"
        );
        res.status(500).json({ message: error.message });
    }
};

exports.updateContent = async (req, res) => {
    try {
		const updated = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
		console.log("Content updated:", req.params.id);
		req.logInfo?.(
            "Content updated",
            { contentId: req.params.id },
            "content:update"
        );
        res.json(updated);
    } catch (error) {
		console.error("Error updating content:", error);
        req.logError?.(
            "Error updating content",
            error,
            { contentId: req.params.id },
            "content:update"
        );
        res.status(500).json({ message: error.message });
    }
};


exports.deleteContent = async (req, res) => {
    try {
		await Content.findByIdAndDelete(req.params.id);
		console.log("Content deleted:", req.params.id);
		req.logInfo?.(
            "Content deleted",
            { contentId: req.params.id },
            "content:delete"
        );
        res.json({ message: 'Content deleted' });
    } catch (error) {
		console.error("Error deleting content:", error);
        req.logError?.(
            "Error deleting content",
            error,
            { contentId: req.params.id },
            "content:delete"
        );
        res.status(500).json({ message: error.message });
    }
};
