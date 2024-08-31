const express= require("express");
const app = express()
var cors = require('cors')
const PORT = process.env.PORT || 5000 ;
const anime_routes = require("./routes/Anime");
const connectDB = require("./db/connect");

app.use(cors())
app.use(express.json());
app.use("/anime" , anime_routes)

const start = async()=>{
    try {
        await connectDB(process.env.MONGO_URI);
        app.listen(PORT,()=>{
            console.log(`anime api is working`)
        })
    } catch (error) {
        console.log(error);
    }
}

start()