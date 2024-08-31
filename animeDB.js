require("dotenv").config()
const connectDB = require("./db/connect")
const Anime =  require("./models/Anime")

const start = async()=>{
    try {
        await connectDB(process.env.MONGO_URI)
        await Anime.deleteMany();
        console.log("saccess")
    } catch (error) {
        console.log(error)
    }
}

start();