const User = require('../models/User');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');


exports.registerUser = async (req, res) => {
    try {
      const { name, email, password } = req.body;
  
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'המשתמש כבר קיים במערכת, בבקשה התחבר' 
        });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        isAdmin: false // Add default value
      });
  
      req.session.user = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isAdmin: newUser.isAdmin
      };
  
      // Return JSON instead of plain text
      res.status(201).json({
        success: true,
        message: 'נרשמת בהצלחה',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email
        }
      });
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  };

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "המייל לא קיים במערכת, בבקשה הירשם קודם" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "סיסמה שגויה" });
    }

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
    res.status(500).json({ message: 'Server error' });
  }
};


exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out.');
    res.clearCookie('connect.sid');
    res.send('Logout successful');
  });
};

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

    const currentProfiles = user.profiles || [];
    if (currentProfiles.length >= 5) {
      return res.status(400).json({ 
        message: 'Maximum of 5 profiles allowed',
        canAddProfile: false
      });
    }

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

    const newProfile = {
      name: name.trim(),
      avatar: avatar || "https://picsum.photos/seed/" + Date.now() + "/200",
      likedContent: [],
      favorites: [],
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

    if (!profile.likedContent) {
      profile.likedContent = [];
    }

    const contentIdStr = String(contentId);
    const normalizedLikedContent = profile.likedContent.map(id => String(id));
    const likedIndex = normalizedLikedContent.findIndex(id => id === contentIdStr);

    if (likedIndex > -1) {
      const actualIndex = profile.likedContent.findIndex(id => String(id) === contentIdStr);
      if (actualIndex > -1) {
        profile.likedContent.splice(actualIndex, 1);
      }
    } else {
      const exists = profile.likedContent.some(id => String(id) === contentIdStr);
      if (!exists) {
        profile.likedContent.push(contentIdStr);
      }
      if (!profile.preferences) {
        profile.preferences = { favoriteGenres: [] };
      }
      if (!profile.preferences.favoriteGenres) {
        profile.preferences.favoriteGenres = [];
      }
      
      if (contentGenres && Array.isArray(contentGenres)) {
        contentGenres.forEach(genre => {
          if (genre && !profile.preferences.favoriteGenres.includes(genre)) {
            profile.preferences.favoriteGenres.push(genre);
          }
        });
      } else {
        try {
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
    user.markModified('profiles');
    const likeDelta = likedIndex > -1 ? -1 : 1;
    try {
      await user.save();
      console.log(`Successfully saved like for profile ${profileName}, userId: ${userId}, contentId: ${contentIdStr}`);
    } catch (saveErr) {
      console.error('Error saving user:', saveErr);
      throw saveErr;
    }
    let updatedLikes = null;
    try {
      const updatedContent = await Content.findByIdAndUpdate(
        contentIdStr,
        { $inc: { likes: likeDelta } },
        { new: true }
      );
      if (updatedContent) {
        if (typeof updatedContent.likes === 'number' && updatedContent.likes < 0) {
          updatedContent.likes = 0;
          await updatedContent.save();
        }
        updatedLikes = updatedContent.likes ?? null;
      }
    } catch (contentErr) {
      console.error('Error updating content likes:', contentErr);
    }
    const updatedLikedContent = (profile.likedContent || []).map(id => String(id));

    res.json({
      message: 'Like toggled successfully',
      liked: likedIndex === -1,
      likedContent: updatedLikedContent,
      updatedLikes: updatedLikes,
      favoriteGenres: profile.preferences?.favoriteGenres || []
    });
  } catch (err) {
    console.error('Error in toggleContentLike:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// Toggle favorite content for a profile
exports.toggleFavoriteContent = async (req, res) => {
  try {
    const { userId, profileName, contentId } = req.body;

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

    if (!profile.favorites) {
      profile.favorites = [];
    }

    const contentIdStr = String(contentId);
    const normalizedFavorites = profile.favorites.map(id => String(id));
    const favoriteIndex = normalizedFavorites.findIndex(id => id === contentIdStr);

    let favorited = false;

    if (favoriteIndex > -1) {
      const actualIndex = profile.favorites.findIndex(id => String(id) === contentIdStr);
      if (actualIndex > -1) {
        profile.favorites.splice(actualIndex, 1);
      }
    } else {
      const exists = profile.favorites.some(id => String(id) === contentIdStr);
      if (!exists) {
        profile.favorites.push(contentIdStr);
      }
      favorited = true;
    }

    user.markModified('profiles');
    await user.save();

    const favorites = (profile.favorites || []).map(id => String(id));

    res.json({
      message: 'Favorite toggled successfully',
      favorited,
      favorites
    });
  } catch (err) {
    console.error('Error in toggleFavoriteContent:', err);
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

// Get favorited content for a profile
exports.getProfileFavorites = async (req, res) => {
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

    const favorites = (profile.favorites || []).map(id => String(id));

    res.json({
      favorites,
      profileName: profile.name
    });
  } catch (err) {
    console.error('Error fetching favorites:', err);
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

    if (favoriteGenres.length === 0 && likedContentIds.length === 0) {
      const allContent = await Content.find()
        .limit(Number(limit))
        .sort({ rating: -1 }); 
      
      return res.json({
        recommendations: allContent,
        reason: 'popular',
        message: 'Recommendations based on popular content'
      });
    }
    const genreQuery = favoriteGenres.length > 0 
      ? { genre: { $in: favoriteGenres } }
      : {};
    
    let recommendations = await Content.find(genreQuery);
    if (likedContentIds.length > 0) {
      try {
        const likedContent = await Content.find({
          _id: { $in: likedContentIds.map(id => {
            try {
              return new mongoose.Types.ObjectId(String(id));
            } catch {
              return null;
            }
          }).filter(id => id !== null) }
        });
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
        if (likedGenres.length > 0) {
          const additionalContent = await Content.find({
            genre: { $in: likedGenres },
            _id: { $nin: recommendations.map(c => c._id) } 
          });
          recommendations = recommendations.concat(additionalContent);
        }
      } catch (err) {
        console.log('Error finding liked content:', err);
      }
    }
    recommendations = recommendations.filter(content => {
      const contentIdStr = content._id.toString();
      return !likedContentIds.some(likedId => {
        const likedIdStr = String(likedId);
        return contentIdStr === likedIdStr || content._id.toString() === likedIdStr;
      });
    });
    const uniqueRecommendations = [];
    const seenIds = new Set();
    recommendations.forEach(content => {
      const id = content._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueRecommendations.push(content);
      }
    });
    const scoredRecommendations = uniqueRecommendations.map(content => {
      let score = 0;
      if (content.genre && Array.isArray(content.genre)) {
        const matchingGenres = content.genre.filter(g => favoriteGenres.includes(g));
        score += matchingGenres.length * 10; 
      }
      if (content.rating) {
        score += content.rating * 2;
      }
      
      return { content, score };
    });
    scoredRecommendations.sort((a, b) => b.score - a.score);
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
    
    user.profiles.splice(profileIndex, 1);  
    await user.save();

    res.json({
      message: 'Profile deleted successfully',
      profiles: user.profiles
    });
}

exports.getStatistics = async (req, res) => {
    try {
      const userId = req.params.userId;
      const User = require('../models/User');
      const WatchHistory = require('../models/watchHistory');
      // לא צריך את Content בכלל!
      
      const user = await User.findById(userId).populate('profiles');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
  
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
      }
  
      // הבא את ההיסטוריה עם populate של content
      const watchHistory = await WatchHistory.find({
        user: userId,
        lastWatchedAt: { $gte: startDate, $lte: endDate }
      }).populate('content');  // זה יביא את התוכן אוטומטית!
  
      const profileViews = [];
      for (const profile of user.profiles) {
        const dailyViews = dates.map(dateStr => {
          return watchHistory.filter(w => {
            const watchDate = new Date(w.lastWatchedAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
            const profileId = w.profile?._id || w.profile;
            return String(profileId) === String(profile._id) && watchDate === dateStr;
          }).length;
        });
  
        profileViews.push({
          profileName: profile.name,
          profileId: profile._id,
          dailyViews: dailyViews
        });
      }
  
      const genreCounts = {};
      watchHistory.forEach(watch => {
        // השתמש ב-watch.content שהגיע מ-populate
        if (watch.content && watch.content.genre) {
          watch.content.genre.forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      });
  
      const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
  
      res.json({
        dates: dates,
        profileViews: profileViews,
        dailyViewsData: {
          dates: dates,
          profileViews: profileViews
        },
        genreStats: {
          genres: sortedGenres.map(g => g[0]),
          viewCounts: sortedGenres.map(g => g[1])
        }
      });
  
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ message: 'Error fetching statistics' });
    }
  };