const mongoose = require("mongoose")


const Anime = new mongoose.Schema({
    mal_id: {
        type: Number,
        required: true,
        unique: true
    },
    images: {
        type: Object
    },
    trailer: {
        type: Object
    },
    title_english: {
        type: String
    },
    episodes: {
        type: Number
    },
    type: {type: String},
    duration: {type: String},
    rating: {type: String},
    score: {
        type: Number
    },
    studios: {type: Array},
    synopsis: {type: String},
    aired: {type: String},
    genres: {type: Array},
    broadcast: {type: Object},
    movie:{type: Object},
    episode: {type: Object},
    episode_name: {type: Array},
    cover_image: {type: String},
})

module.exports = mongoose.model("animeschema" , Anime)