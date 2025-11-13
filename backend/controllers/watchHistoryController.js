/** @format */

const WatchHistory = require("../models/watchHistory");

exports.createWatchHistory = async (req, res) => {
	try {
		const { user, profile, content } = req.body;
		req.logDebug?.(
			"Create watch history requested",
			{ userId: user, profileId: profile, contentId: content },
			"watch:create"
		);

		const exists = await WatchHistory.findOne({ user, profile, content });
		if (exists) return res.status(400).json({ message: "Already exists" });

		const record = new WatchHistory({ user, profile, content });
		await record.save();
		console.log("Watch history created:", record._id.toString());
		req.logInfo?.(
			"Watch history created",
			{ userId: user, profileId: profile, contentId: content, historyId: record._id },
			"watch:create"
		);
		res.status(201).json(record);
	} catch (err) {
		console.error("Error creating watch history:", err);
		req.logError?.(
			"Error creating watch history",
			err,
			{ userId: req.body?.user, profileId: req.body?.profile, contentId: req.body?.content },
			"watch:create"
		);
		res.status(500).json({ error: err.message });
	}
};

exports.getAllHistories = async (req, res) => {
	try {
		const histories = await WatchHistory.find()
			.populate("user", "username email")
			.populate("content", "title genre");
		req.logDebug?.(
			"Fetched watch histories",
			{ count: histories.length },
			"watch:read"
		);
		res.json(histories);
	} catch (err) {
		console.error("Error fetching watch histories:", err);
		req.logError?.(
			"Error fetching watch histories",
			err,
			{},
			"watch:read"
		);
		res.status(500).json({ error: err.message });
	}
};

exports.getUserHistory = async (req, res) => {
	try {
		const userId = req.params.userId;
		const histories = await WatchHistory.find({ user: userId }).populate(
			"content",
			"title genre"
		);
		req.logDebug?.(
			"Fetched user watch history",
			{ userId, count: histories.length },
			"watch:read"
		);
		res.json(histories);
	} catch (err) {
		console.error("Error fetching user watch history:", err);
		req.logError?.(
			"Error fetching user watch history",
			err,
			{ userId: req.params.userId },
			"watch:read"
		);
		res.status(500).json({ error: err.message });
	}
};

exports.getBulkProgress = async (req, res) => {
	try {
		const { userId } = req.params;
		const { profileId } = req.query;

		if (!userId) {
			return res.status(400).json({ message: "User ID is required" });
		}

		const filter = { user: userId };
		if (profileId) {
			filter.profile = profileId;
		}

		const histories = await WatchHistory.find(filter).lean();

		const buildEntry = (entry) => ({
			progress: entry.progress || 0,
			lastWatchedAt: entry.lastWatchedAt || null,
			currentEpisode: entry.currentEpisode || null,
			episodeProgress: entry.episodeProgress || [],
			profile: String(entry.profile),
			content: String(entry.content),
		});

		if (profileId) {
			const data = {};
			histories.forEach((entry) => {
				data[String(entry.content)] = buildEntry(entry);
			});
			return res.json({
				profileId,
				data,
			});
		}

		const profiles = {};
		histories.forEach((entry) => {
			const profileKey = String(entry.profile);
			if (!profiles[profileKey]) {
				profiles[profileKey] = {};
			}
			profiles[profileKey][String(entry.content)] = buildEntry(entry);
		});

		return res.json({ profiles });
	} catch (err) {
		req.logError?.(
			"Error fetching bulk progress",
			err,
			{
				userId: req.params.userId,
				profileId: req.query.profileId,
			},
			"watch:read"
		);
		res.status(500).json({ error: err.message });
	}
};

exports.updateProgress = async (req, res) => {
	try {
		const { user, profile, content, progress } = req.body;
		req.logDebug?.(
			"Update progress requested",
			{ userId: user, profileId: profile, contentId: content },
			"watch:update"
		);
		// findOneAndUpdate( filter, update, options )
		const record = await WatchHistory.findOneAndUpdate(
			{ user, profile, content },
			{ progress, lastWatchedAt: Date.now() },
			{ new: true, upsert: true } //upsert: update or insert
		);
		console.log("Watch progress updated for content:", content);
		req.logInfo?.(
			"Watch progress updated",
			{ userId: user, profileId: profile, contentId: content },
			"watch:update"
		);
		res.json(record);
	} catch (err) {
		console.error("Error updating watch progress:", err);
		req.logError?.(
			"Error updating watch progress",
			err,
			{ userId: req.body?.user, profileId: req.body?.profile, contentId: req.body?.content },
			"watch:update"
		);
		res.status(500).json({ error: err.message });
	}
};

// New function for updating episode progress
exports.updateEpisodeProgress = async (req, res) => {
	try {
		const {
			user,
			profile,
			content,
			seasonNumber,
			episodeNumber,
			progress,
			completed,
		} = req.body;

		req.logDebug?.(
			"Update episode progress requested",
			{
				userId: user,
				profileId: profile,
				contentId: content,
				seasonNumber,
				episodeNumber,
			},
			"watch:update"
		);

		const record = await WatchHistory.findOne({ user, content });

		if (!record) {
			// Create new record
			const newRecord = new WatchHistory({
				user,
				profile,
				content,
				currentEpisode: { seasonNumber, episodeNumber },
				episodeProgress: [
					{
						seasonNumber,
						episodeNumber,
						progress,
						completed: completed || false,
					},
				],
				lastWatchedAt: Date.now(),
			});
			await newRecord.save();
			console.log("Episode progress record created:", newRecord._id.toString());
			req.logInfo?.(
				"Episode progress record created",
				{
					userId: user,
					profileId: profile,
					contentId: content,
					seasonNumber,
					episodeNumber,
					historyId: newRecord._id,
				},
				"watch:update"
			);
			return res.json(newRecord);
		}

		// Update existing record
		record.profile = profile;
		const existingEpisode = record.episodeProgress.find(
			(ep) =>
				ep.seasonNumber === seasonNumber && ep.episodeNumber === episodeNumber
		);

		if (existingEpisode) {
			existingEpisode.progress = progress;
			if (completed !== undefined) {
				existingEpisode.completed = completed;
			}
		} else {
			record.episodeProgress.push({
				seasonNumber,
				episodeNumber,
				progress,
				completed: completed || false,
			});
		}

		record.currentEpisode = { seasonNumber, episodeNumber };
		record.lastWatchedAt = Date.now();

		await record.save();
		console.log(
			"Episode progress updated:",
			`S${seasonNumber}E${episodeNumber}`,
			"for content",
			content
		);
		req.logInfo?.(
			"Episode progress updated",
			{
				userId: user,
				profileId: profile,
				contentId: content,
				seasonNumber,
				episodeNumber,
			},
			"watch:update"
		);
		res.json(record);
	} catch (err) {
		console.error("Error updating episode progress:", err);
		req.logError?.(
			"Error updating episode progress",
			err,
			{
				userId: req.body?.user,
				profileId: req.body?.profile,
				contentId: req.body?.content,
				seasonNumber: req.body?.seasonNumber,
				episodeNumber: req.body?.episodeNumber,
			},
			"watch:update"
		);
		res.status(500).json({ error: err.message });
	}
};

// Get episode progress for a series
exports.getEpisodeProgress = async (req, res) => {
	try {
		const { userId, contentId } = req.params;
		req.logDebug?.(
			"Episode progress requested",
			{ userId, contentId },
			"watch:read"
		);
		const record = await WatchHistory.findOne({
			user: userId,
			content: contentId,
		});

		if (!record) {
			return res.json({ episodeProgress: [], currentEpisode: null });
		}

		res.json({
			episodeProgress: record.episodeProgress || [],
			currentEpisode: record.currentEpisode || null,
		});
	} catch (err) {
		console.error("Error fetching episode progress:", err);
		req.logError?.(
			"Error fetching episode progress",
			err,
			{ userId: req.params.userId, contentId: req.params.contentId },
			"watch:read"
		);
		res.status(500).json({ error: err.message });
	}
};

exports.deleteHistory = async (req, res) => {
	try {
		await WatchHistory.findByIdAndDelete(req.params.id);
		console.log("Watch history deleted:", req.params.id);
		req.logInfo?.(
			"Watch history deleted",
			{ historyId: req.params.id },
			"watch:delete"
		);
		res.json({ message: "Deleted successfully" });
	} catch (err) {
		console.error("Error deleting watch history:", err);
		req.logError?.(
			"Error deleting watch history",
			err,
			{ historyId: req.params.id },
			"watch:delete"
		);
		res.status(500).json({ error: err.message });
	}
};

exports.getPopularity = async (req, res) => {
	try {
		const stats = await WatchHistory.aggregate([
			{
				$group: {
					_id: "$content",
					watchCount: { $addToSet: "$profile" }, // unique profiles
				},
			},
			{
				$project: {
					content: "$_id",
					popularity: { $size: "$watchCount" },
					_id: 0,
				},
			},
		]);

		req.logDebug?.(
			"Watch popularity fetched",
			{ items: stats.length },
			"watch:read"
		);
		res.json(stats);
	} catch (err) {
		console.error("Error fetching watch popularity:", err);
		req.logError?.(
			"Error fetching watch popularity",
			err,
			{},
			"watch:read"
		);
		res.status(500).json({ error: err.message });
	}
};
