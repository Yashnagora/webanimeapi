const express = require("express");
// const { getAllAnimesTesting , getAllAnimes, getAnimeid,Addanimes } = require("../controllers/Anime");
const {Addanimes, getAllAnimes, scrapeAnimes } = require("../controllers/Anime");
const router = express.Router();

router.route('/').get(getAllAnimes);
// router.route('/:id').get(getAnimeid);
router.route('/byAdmin').post(Addanimes);
router.route('/AddAnimes').post(scrapeAnimes);
// router.route('/Testing').get(getAllAnimesTesting)


module.exports = router