const mongoose = require("mongoose");
const Log = require("../models/Log");

const isMongooseConnected = () => mongoose.connection.readyState === 1;

const LEVELS = {
	debug: 10,
	info: 20,
	error: 30,
};

const getConfiguredLevel = () =>
	(process.env.LOG_LEVEL || "info").toLowerCase();

const shouldLog = (level) => {
	const configuredLevel = LEVELS[getConfiguredLevel()] ?? LEVELS.info;
	const requestedLevel = LEVELS[level] ?? LEVELS.info;
	return requestedLevel >= configuredLevel;
};

const persistLog = async (payload) => {
	if (!shouldLog(payload.level)) {
		return;
	}

	if (!isMongooseConnected()) {
		console.error("Skipping log persistence: MongoDB is not connected", payload);
		return;
	}

	try {
		await Log.create(payload);
	} catch (err) {
		console.error("Failed to persist log", err);
	}
};

const sanitizeMetadata = (metadata = {}) => {
	const { requestId, userId, ...rest } = metadata;
	const clone = { ...rest };

	if (clone.body) {
		const redactedBody = { ...clone.body };
		["password", "newPassword", "confirmPassword"].forEach((field) => {
			if (redactedBody[field]) {
				redactedBody[field] = "***redacted***";
			}
		});
		clone.body = redactedBody;
	}

	return clone;
};

const createBasePayload = (message, metadata, context, level) => ({
	level,
	message,
	context,
	metadata: sanitizeMetadata(metadata),
	requestId: metadata?.requestId,
	userId: metadata?.userId,
});

const logDebug = async (message, metadata = {}, context = "application") => {
	const payload = createBasePayload(message, metadata, context, "debug");
	await persistLog(payload);
};

const logInfo = async (message, metadata = {}, context = "application") => {
	const payload = createBasePayload(message, metadata, context, "info");
	await persistLog(payload);
};

const logError = async (
	message,
	error,
	metadata = {},
	context = "application"
) => {
	const errorPayload = error
		? {
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
		  }
		: {};

	const payload = {
		...createBasePayload(message, metadata, context, "error"),
		...errorPayload,
	};

	await persistLog(payload);
};

module.exports = {
	logDebug,
	logInfo,
	logError,
	logEvent: logInfo,
};

