const Anime = require("../models/Anime")

// get all anime data

// const getAllAnimes = async (req, res) => {
//   const page = Number(req.query.page) || 1;
//   const limit = 9;
//   const startIndex = (page - 1) * limit;
//   const endIndex = page * limit;

//   const data = await Anime.find({}).skip(startIndex).limit(limit);

//   const totalItems = await Anime.countDocuments({});

//   res.status(200).json({
//       data,
//       par_page: limit,
//       total: totalItems,
//       totalPages: Math.ceil(totalItems / limit),
//       currentPage: page
//   });
// };

// get anime id

// const getAnimeid = async(req, res)=>{
//     const animeId = req.params.id;
//     const anime = await Anime.findOne({ id: parseInt(animeId) });
  
//     if (anime) {
//       res.json(anime);
//     } else {
//       res.status(404).json({ error: 'Anime not found' });
//     }
// }
// const getAllAnimesTesting = async(req, res)=>{
//     const data = await Anime.find(req.query);
//     res.status(200).json({data})
// }


// add animes

const Addanimes = async (req, res) => {
  if (req.method === "POST") {
      for (let i = 0; i < req.body.length; i++) {
          console.log(req.body)
          let existingAnime = await Anime.findOne({ id: req.body[i].id });

          if (existingAnime) {
              existingAnime.episodes.push({
                  episodeNum: req.body[i].episodeNum,
                  url: req.body[i].url
              });
              await existingAnime.save();
          } else {
              let newAnime = new Anime({
                  id: req.body[i].id,
                  title: req.body[i].title,
                  slug: req.body[i].slug,
                  image: req.body[i].image,
                  episodes: [
                      {
                          episodeNum: req.body[i].episodeNum,
                          url: req.body[i].url
                      }
                  ]
              });
              await newAnime.save();
          }
        }
        res.status(200).json({ success: "success", data: req.body });
  } else {
      res.status(400).json({ error: "This method is not allowed" });
  }
};



// module.exports = {getAllAnimes, getAllAnimesTesting, getAnimeid,Addanimes}
module.exports = {Addanimes}