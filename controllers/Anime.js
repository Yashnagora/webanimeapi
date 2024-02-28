const animeschema = require("../models/Anime")

// get all anime data

const getAllAnimes = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = 9;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const data = await animeschema.find({}).skip(startIndex).limit(limit);

  const totalItems = await animeschema.countDocuments({});

  res.status(200).json({
      data,
      par_page: limit,
      total: totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page
  });
};

// get anime id

const getAnimeid = async(req, res)=>{
    const animeId = req.params.id;
    const anime = await animeschema.findOne({ mal_id: parseInt(animeId) });
  
    if (anime) {
      res.json(anime);
    } else {
      res.status(404).json({ error: 'Anime not found' });
    }
}
const getAllAnimesTesting = async(req, res)=>{
    const data = await animeschema.find(req.query);
    res.status(200).json({data})
}


// add animes

const Addanimes = async(req, res)=>{
  try {
    if (req.method.toUpperCase() === 'POST') {
      if (!req.body || !Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      for (let i = 0; i < req.body.length; i++) {
        let Addanime = new animeschema({
          mal_id: req.body[i].mal_id,
          images: req.body[i].images,
          trailer: req.body[i].trailer,
          title_english: req.body[i].title_english,
          episodes: req.body[i].episodes,
          type: req.body[i].type,
          duration: req.body[i].duration,
          rating: req.body[i].rating,
          score: req.body[i].score,
          synopsis: req.body[i].synopsis,
          aired: req.body[i].aired,
          genres: req.body[i].genres,
          studios: req.body[i].studios,
          broadcast: req.body[i].broadcast,
          cover_image: req.body[i].cover_image,
          episode: req.body[i].episode,
          episode_name: req.body[i].episode_name,
          movie: req.body[i].movie,
        });

        await Addanime.save();
      }

      res.status(200).json({ success: true, message: 'Anime added successfully' });
    } else {
      res.status(400).json({ error: 'This method is not allowed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}



module.exports = {getAllAnimes, getAllAnimesTesting, getAnimeid,Addanimes}