const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
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