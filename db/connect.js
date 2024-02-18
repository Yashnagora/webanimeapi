const mongoose = require("mongoose")
require("dotenv").config();

const connectDB = (uri)=>{
    console.log("Trying to connect...");
    try {
        return mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        throw error;
    }
};

module.exports= connectDB;