/** @format */

const express = require("express");
const router = express.Router();
const {
	createWatchHistory,
	getAllHistories,
	getUserHistory,
	getBulkProgress,
	updateProgress,
	updateEpisodeProgress,
	getEpisodeProgress,
	deleteHistory,
	getPopularity,
} = require("../controllers/watchHistoryController");

router.post("/", createWatchHistory);
router.get("/", getAllHistories);
router.get("/user/:userId", getUserHistory);
router.get("/bulk-progress/:userId", getBulkProgress);
router.put("/progress", updateProgress);
router.put("/episode-progress", updateEpisodeProgress);
router.get("/episode-progress/:userId/:contentId", getEpisodeProgress);
router.get("/popularity", getPopularity);
router.delete("/:id", deleteHistory);

module.exports = router;
