const User = require('../models/User');
const Content = require('../models/Content');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');


exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('user already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword
    });

    req.session.user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      isAdmin: newUser.isAdmin
    };

    res.status(201).send('Registration successful');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid email or password');

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    };

    res.json({
      message: 'Login successful',
      userData: {
        id: user._id,
        name: user.name, 
        email: user.email,
        isAdmin: user.isAdmin,
        profiles: user.profiles || []
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out.');
    res.clearCookie('connect.sid');
    res.send('Logout successful');
  });
};

// Get user profiles
exports.getUserProfiles = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      profiles: user.profiles || [],
      canAddProfile: (user.profiles || []).length < 5
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new profile to user
exports.addProfile = async (req, res) => {
  try {
    const { userId, name, avatar } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ message: 'User ID and profile name are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has 5 profiles
    const currentProfiles = user.profiles || [];
    if (currentProfiles.length >= 5) {
      return res.status(400).json({ 
        message: 'Maximum of 5 profiles allowed',
        canAddProfile: false
      });
    }

    // Check if profile name already exists (case-insensitive)
    const trimmedName = name.trim();
    const existingProfile = currentProfiles.find(
      profile => profile.name && profile.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingProfile) {
      return res.status(400).json({ 
        message: 'Profile name already exists. Please choose a different name.',
        canAddProfile: true
      });
    }

    // Add new profile
    const newProfile = {
      name: name.trim(),
      avatar: avatar || "https://picsum.photos/seed/" + Date.now() + "/200",
      likedContent: [],
      preferences: {
        favoriteGenres: []
      }
    };

    user.profiles.push(newProfile);
    await user.save();

    res.json({
      message: 'Profile added successfully',
      profile: newProfile,
      profiles: user.profiles,
      canAddProfile: user.profiles.length < 5
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle like for content in user profile
exports.toggleContentLike = async (req, res) => {
  try {
    const { userId, profileName, contentId, contentGenres } = req.body;

    if (!userId || !profileName || contentId === undefined) {
      return res.status(400).json({ message: 'User ID, profile name, and content ID are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = user.profiles.find(p => p.name === profileName);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Initialize likedContent if it doesn't exist
    if (!profile.likedContent) {
      profile.likedContent = [];
    }

    // Convert contentId to string (it should already be a string from frontend, but ensure consistency)
    const contentIdStr = String(contentId);
    // Normalize all existing IDs to strings for comparison
    const normalizedLikedContent = profile.likedContent.map(id => String(id));
    const likedIndex = normalizedLikedContent.findIndex(id => id === contentIdStr);

    if (likedIndex > -1) {
      // Remove like - find the actual index in the original array
      const actualIndex = profile.likedContent.findIndex(id => String(id) === contentIdStr);
      if (actualIndex > -1) {
        profile.likedContent.splice(actualIndex, 1);
      }
    } else {
      // Add like - check if it doesn't already exist (to avoid duplicates)
      const exists = profile.likedContent.some(id => String(id) === contentIdStr);
      if (!exists) {
        profile.likedContent.push(contentIdStr);
      }
      
      // Update favoriteGenres based on liked content
      // Initialize favoriteGenres if it doesn't exist
      if (!profile.preferences) {
        profile.preferences = { favoriteGenres: [] };
      }
      if (!profile.preferences.favoriteGenres) {
        profile.preferences.favoriteGenres = [];
      }
      
      // Update genres if provided from frontend or find in database
      if (contentGenres && Array.isArray(contentGenres)) {
        // Add genres from frontend
        contentGenres.forEach(genre => {
          if (genre && !profile.preferences.favoriteGenres.includes(genre)) {
            profile.preferences.favoriteGenres.push(genre);
          }
        });
      } else {
        // Try to find content in database to get genres
        try {
          // Use the contentId string to find the content
          const content = await Content.findById(contentIdStr);
          
          if (content && content.genre && Array.isArray(content.genre)) {
            content.genre.forEach(genre => {
              if (genre && !profile.preferences.favoriteGenres.includes(genre)) {
                profile.preferences.favoriteGenres.push(genre);
              }
            });
          }
        } catch (err) {
          console.log('Content not found for genre update:', err.message);
        }
      }
    }

    // Mark the profiles array as modified so Mongoose saves the nested changes
    user.markModified('profiles');
    
    // Save to database
    try {
      await user.save();
      console.log(`Successfully saved like for profile ${profileName}, userId: ${userId}, contentId: ${contentIdStr}`);
    } catch (saveErr) {
      console.error('Error saving user:', saveErr);
      throw saveErr;
    }

    // Normalize likedContent to strings for response
    const updatedLikedContent = (profile.likedContent || []).map(id => String(id));

    res.json({
      message: 'Like toggled successfully',
      liked: likedIndex === -1,
      likedContent: updatedLikedContent,
      favoriteGenres: profile.preferences?.favoriteGenres || []
    });
  } catch (err) {
    console.error('Error in toggleContentLike:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get liked content for a profile
exports.getProfileLikedContent = async (req, res) => {
  try {
    const { userId, profileName } = req.body;
    const userIdParam = req.params.userId;
    
    const userIdToUse = userId || userIdParam;
    
    if (!userIdToUse || !profileName) {
      return res.status(400).json({ message: 'User ID and profile name are required' });
    }

    const user = await User.findById(userIdToUse);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = user.profiles.find(p => p.name === profileName);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Ensure all IDs are returned as strings for consistent comparison
    const likedContent = (profile.likedContent || []).map(id => String(id));
    
    res.json({
      likedContent: likedContent,
      profileName: profile.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get content recommendations based on favoriteGenres and likedContent
exports.getRecommendations = async (req, res) => {
  try {
    const { userId, profileName, limit = 10 } = req.body;
    
    if (!userId || !profileName) {
      return res.status(400).json({ message: 'User ID and profile name are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = user.profiles.find(p => p.name === profileName);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const favoriteGenres = profile.preferences?.favoriteGenres || [];
    const likedContentIds = profile.likedContent || [];
    
    // If no favorite genres and no liked content, return popular content
    if (favoriteGenres.length === 0 && likedContentIds.length === 0) {
      const allContent = await Content.find()
        .limit(Number(limit))
        .sort({ rating: -1 }); // Sort by rating (highest first)
      
      return res.json({
        recommendations: allContent,
        reason: 'popular',
        message: 'Recommendations based on popular content'
      });
    }

    // Build query to find content matching favorite genres
    const genreQuery = favoriteGenres.length > 0 
      ? { genre: { $in: favoriteGenres } }
      : {};
    
    // Get all content that matches genres
    let recommendations = await Content.find(genreQuery);
    
    // Also consider genres from liked content
    if (likedContentIds.length > 0) {
      try {
        // Convert string IDs to ObjectIds for MongoDB query
        const likedContent = await Content.find({
          _id: { $in: likedContentIds.map(id => {
            try {
              // If it's already an ObjectId string, mongoose will handle it
              return new mongoose.Types.ObjectId(String(id));
            } catch {
              return null;
            }
          }).filter(id => id !== null) }
        });
        
        // Extract genres from liked content
        const likedGenres = [];
        likedContent.forEach(content => {
          if (content.genre && Array.isArray(content.genre)) {
            content.genre.forEach(genre => {
              if (!likedGenres.includes(genre)) {
                likedGenres.push(genre);
              }
            });
          }
        });
        
        // Add content that matches genres from liked content
        if (likedGenres.length > 0) {
          const additionalContent = await Content.find({
            genre: { $in: likedGenres },
            _id: { $nin: recommendations.map(c => c._id) } // Don't duplicate
          });
          recommendations = recommendations.concat(additionalContent);
        }
      } catch (err) {
        console.log('Error finding liked content:', err);
        // Continue with genre-based recommendations
      }
    }
    
    // Remove content that user already liked
    recommendations = recommendations.filter(content => {
      // Filter out content that matches likedContentIds
      // Convert both to strings for comparison
      const contentIdStr = content._id.toString();
      return !likedContentIds.some(likedId => {
        const likedIdStr = String(likedId);
        return contentIdStr === likedIdStr || content._id.toString() === likedIdStr;
      });
    });
    
    // Remove duplicates
    const uniqueRecommendations = [];
    const seenIds = new Set();
    recommendations.forEach(content => {
      const id = content._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueRecommendations.push(content);
      }
    });
    
    // Score and sort recommendations
    // Content that matches more favorite genres gets higher score
    const scoredRecommendations = uniqueRecommendations.map(content => {
      let score = 0;
      
      // Score based on matching favorite genres
      if (content.genre && Array.isArray(content.genre)) {
        const matchingGenres = content.genre.filter(g => favoriteGenres.includes(g));
        score += matchingGenres.length * 10; // 10 points per matching genre
      }
      
      // Bonus points for higher rating
      if (content.rating) {
        score += content.rating * 2;
      }
      
      return { content, score };
    });
    
    // Sort by score (highest first)
    scoredRecommendations.sort((a, b) => b.score - a.score);
    
    // Limit results
    const finalRecommendations = scoredRecommendations
      .slice(0, Number(limit))
      .map(item => item.content);
    
    res.json({
      recommendations: finalRecommendations,
      count: finalRecommendations.length,
      basedOn: {
        favoriteGenres: favoriteGenres,
        likedContentCount: likedContentIds.length
      },
      message: 'Recommendations based on your preferences and liked content'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


exports.updateProfile = async (req, res) => {
    const {profileId, userId} = req.params;
    const newProfileData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileIndex = user.profiles.findIndex(p => p._id.toString() === profileId);
    if (profileIndex === -1) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const existingProfile = user.profiles[profileIndex].toObject();

    const updatedProfile = {
        ...existingProfile,
        ...newProfileData
    }

    user.profiles[profileIndex] = updatedProfile;
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
      profiles: user.profiles
    });

}

exports.deleteProfile = async (req, res) => {
    const {profileId, userId} = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const profileIndex = user.profiles.findIndex(p => p._id.toString() === profileId);
    if (profileIndex === -1) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    user.profiles.pop(profileIndex);
    await user.save();

    res.json({
      message: 'Profile deleted successfully',
      profiles: user.profiles
    });
}
