const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema({
    episodeNum: { type: Number, required: true },
    url: { type: String, required: true, unique: true}
});

const AnimeSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String },
    slug: { type: String, unique: true },
    image: { type: String },
    episodes: [EpisodeSchema]
}, { timestamps: true });

module.exports = mongoose.models.Anime || mongoose.model("Anime", AnimeSchema);