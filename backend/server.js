/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { connectDB } = require("./config/db");

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

// // allow our local frontend to access backend api
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
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(bodyParser.json());
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

// Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
