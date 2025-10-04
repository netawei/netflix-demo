const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");

// Disable SSL verification for self-signed certificates (for development only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Set Mongoose strictQuery option to avoid deprecation warning
mongoose.set('strictQuery', false);

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(bodyParser.json());

// Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});