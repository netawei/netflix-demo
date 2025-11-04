/** @format */

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
		console.log(MONGO_URI);

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

const dropDB = async () => {
	await connectDB();
	const collections = await mongoose.connection.db.collections();

	for (let collection of collections) {
		try {
			await collection.drop();
			console.log(`Dropped collection: ${collection.collectionName}`);
		} catch (error) {
			console.error(
				`Error dropping collection: ${collection.collectionName}`,
				error
			);
		}
	}
};

module.exports = { connectDB, dropDB };
