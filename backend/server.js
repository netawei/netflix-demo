/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { connectDB } = require("./config/db");
const {
	requestContext,
	requestLogger,
	errorLogger,
} = require("./middleware/logging");
const { logInfo, logError } = require("./utils/logger");

const userRoutes = require("./routes/userRoutes");
const contentRoutes = require("./routes/contentRoutes");
const watchHistoryRoutes = require("./routes/watchHistoryRoutes");
// const cors = require("cors");

dotenv.config();

// Disable SSL verification for self-signed certificates (for development only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Set Mongoose strictQuery option to avoid deprecation warning
mongoose.set("strictQuery", false);

const app = express();

process.on("unhandledRejection", (reason) => {
	let derivedMessage;
	if (typeof reason === "string") {
		derivedMessage = reason;
	} else {
		try {
			derivedMessage = JSON.stringify(reason);
		} catch (serializationErr) {
			derivedMessage = "Unhandled rejection with non-serializable reason";
		}
	}
	const error =
		reason instanceof Error
			? reason
			: new Error(derivedMessage || "Unhandled promise rejection");
	logError("Unhandled promise rejection", error, {}, "process").catch(
		() => {}
	);
	console.error("Unhandled promise rejection", reason);
});

process.on("uncaughtException", (error) => {
	logError("Uncaught exception", error, {}, "process")
		.catch(() => {})
		.finally(() => {
			console.error("Uncaught exception", error);
			process.exit(1);
		});
});

process.on("SIGTERM", () => {
	logInfo("Process received SIGTERM", {}, "process")
		.catch(() => {})
		.finally(() => process.exit(0));
});

// allow our local frontend to access backend api
// app.use(
// 	cors({
// 		origin: "*", // your frontend address
// 		methods: ["GET", "POST", "PUT", "DELETE"],
// 		credentials: true,
// 	})
// );

// Connect Database
connectDB();

// Middleware - CORS
app.use((req, res, next) => {
	const origin = req.headers.origin;
	res.header("Access-Control-Allow-Origin", origin || "*");
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	);
	if (req.method === "OPTIONS") {
		return res.sendStatus(200);
	}
	next();
});
app.use(requestContext);
app.use(bodyParser.json());
app.use(requestLogger);
app.use(
	session({
		secret: process.env.COOKIE_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false },
	})
);

app.use("/api/users", userRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/watchHistory", watchHistoryRoutes);

app.use(errorLogger);

app.use((err, req, res, next) => {
	if (res.headersSent) {
		return next(err);
	}
	const statusCode = err.status || err.statusCode || 500;
	res.status(statusCode).json({
		message: err.message || "Server error",
	});
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

// Serve index.html for root route
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	logInfo("HTTP server started", { port: PORT }, "infrastructure:http").catch(
		() => {}
	);
});
