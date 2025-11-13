const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
	{
		level: {
			type: String,
			enum: ["debug", "info", "error"],
			required: true,
			default: "info",
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		context: {
			type: String,
			default: "application",
			trim: true,
		},
		requestId: {
			type: String,
			index: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
		error: {
			name: String,
			message: String,
			stack: String,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	}
);

LogSchema.index({ level: 1, createdAt: -1 });
LogSchema.index({ context: 1, createdAt: -1 });

module.exports = mongoose.model("Log", LogSchema);

