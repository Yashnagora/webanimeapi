

const mongoose = require("mongoose")
require("dotenv").config();

const connectDB = (uri)=>{
    console.log("Trying to connect...");
    try {
        return mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // Server selection timeout
        });
        // console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1); // Exit the process if MongoDB connection fails
    }
};

module.exports= connectDB;