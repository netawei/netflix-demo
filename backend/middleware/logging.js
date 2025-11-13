const { v4: uuidv4 } = require("uuid");
const { logDebug, logInfo, logError } = require("../utils/logger");

const requestContext = (req, res, next) => {
	const existingRequestId =
		req.headers["x-request-id"] || req.headers["x-correlation-id"];
	const requestId = existingRequestId || uuidv4();

	req.requestId = requestId;
	res.setHeader("X-Request-Id", requestId);

	req.logDebug = (message, metadata = {}, context = "http") =>
		logDebug(message, buildMetadata(req, metadata), context);

	req.logInfo = (message, metadata = {}, context = "http") =>
		logInfo(message, buildMetadata(req, metadata), context);

	req.logEvent = req.logInfo;

	req.logError = (message, error, metadata = {}, context = "http") =>
		logError(message, error, buildMetadata(req, metadata), context);

	next();
};

const requestLogger = (req, res, next) => {
	const startTime = Date.now();

	req.logDebug("Request received", {
		method: req.method,
		path: req.originalUrl,
		ip: req.ip,
		query: req.query,
		body: req.body,
	});

	res.on("finish", () => {
		const duration = Date.now() - startTime;
		req.logDebug("Request completed", {
			method: req.method,
			path: req.originalUrl,
			statusCode: res.statusCode,
			durationMs: duration,
		});
	});

	next();
};

const errorLogger = (err, req, res, next) => {
	if (req.logError) {
		req.logError("Unhandled error", err, {
			method: req.method,
			path: req.originalUrl,
			statusCode: res.statusCode,
		});
	} else {
		logError("Unhandled error (no req.logError)", err, {
			requestId: req.requestId,
		});
	}

	next(err);
};

const buildMetadata = (req, metadata = {}) => {
	const userId = req.session?.user?.id || req.user?._id;

	return {
		requestId: req.requestId,
		userId,
		...metadata,
	};
};

module.exports = {
	requestContext,
	requestLogger,
	errorLogger,
};

