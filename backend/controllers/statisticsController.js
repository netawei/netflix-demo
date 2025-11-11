const User = require('../models/User');
const Content = require('../models/Content');

exports.getUserStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // שליפת המשתמש עם כל הפרופילים שלו
    const user = await User.findById(userId).populate({
      path: 'profiles',
      populate: {
        path: 'watchHistory.contentId',
        model: 'Content'
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    // יצירת מערך תאריכים של 7 ימים אחרונים
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
    }
    
    // חישוב צפיות יומיות לכל פרופיל
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const profileViews = user.profiles.map(profile => {
      const dailyViews = dates.map(dateStr => {
        if (!profile.watchHistory) return 0;
        
        return profile.watchHistory.filter(watch => {
          const watchDate = new Date(watch.watchedAt);
          if (watchDate < sevenDaysAgo) return false;
          
          const watchDateStr = watchDate.toLocaleDateString('he-IL', { 
            day: '2-digit', 
            month: '2-digit' 
          });
          return watchDateStr === dateStr;
        }).length;
      });
      
      return {
        profileName: profile.name,
        dailyViews: dailyViews
      };
    });
    
    // חישוב צפיות לפי ז'אנר (מכל הפרופילים)
    const genreMap = {};
    user.profiles.forEach(profile => {
      if (!profile.watchHistory) return;
      
      profile.watchHistory.forEach(watch => {
        const watchDate = new Date(watch.watchedAt);
        if (watchDate < sevenDaysAgo) return;
        
        if (watch.contentId && watch.contentId.genre) {
          const genre = watch.contentId.genre;
          genreMap[genre] = (genreMap[genre] || 0) + 1;
        }
      });
    });
    
    const genres = Object.keys(genreMap);
    const viewCounts = Object.values(genreMap);
    
    // אם אין נתונים, החזר מערכים ריקים
    if (genres.length === 0) {
      return res.json({
        profileViews: profileViews,
        dailyViewsData: {
          dates: dates,
          profileViews: profileViews
        },
        genreStats: {
          genres: ['אין נתונים'],
          viewCounts: [0]
        }
      });
    }
    
    res.json({
      profileViews: profileViews,
      dailyViewsData: {
        dates: dates,
        profileViews: profileViews
      },
      genreStats: {
        genres: genres,
        viewCounts: viewCounts
      }
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'שגיאה בשליפת הסטטיסטיקות' });
  }
};