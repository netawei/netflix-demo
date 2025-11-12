const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
	try {
		const { MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_PORT, MONGO_DB } =
			process.env;
		const MONGO_URI = `mongodb://${MONGO_USER}:${encodeURIComponent(
			MONGO_PASS
		)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

		await mongoose.connect(MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("MongoDB connected");
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

module.exports = { connectDB };
