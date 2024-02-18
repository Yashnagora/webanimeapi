require("dotenv").config()
const connectDB = require("./db/connect")
const Anime =  require("./models/Anime")

const start = async()=>{
    try {
        await connectDB(process.env.MONGODB_URL)
        await Anime.deleteMany();
        console.log("saccess")
    } catch (error) {
        console.log(error)
    }
}

start();