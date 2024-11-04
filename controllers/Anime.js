const Anime = require("../models/Anime")
const puppeteer = require('puppeteer');

// get all anime data

const getAllAnimes = async (req, res) => {


  const allAnimes = await Anime.find({});

  res.status(200).json({
      allAnimes
  });
};

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
        try {
          const animeList = req.body;
    
          for (let i = 0; i < animeList.length; i++) {
            const { id, title, slug, image, trailer, episodes } = animeList[i];
    
            if (!id || !episodes) {
              return res.status(400).json({ error: "ID or episodes cannot be null" });
            }
    
            let existingAnime = await Anime.findOne({ id });
    
            if (existingAnime) {
              // If anime exists, update episodes array
              existingAnime.episodes = [...existingAnime.episodes, ...episodes];
              await existingAnime.save();
            } else {
              // Otherwise, create a new anime entry
              let newAnime = new Anime({
                id,
                title,
                slug,
                image,
                trailer,
                episodes,
              });
              await newAnime.save();
            }
          }
          res.status(200).json({ success: "success" });
        } catch (error) {
          console.error("Error:", error);
          res.status(500).json({ error: "Server error" });
        }
      } else {
        res.status(400).json({ error: "This method is not allowed" });
      }
};


// scrapeAnimes function to get all anime episdodes

const scrapeAnimes = async (req, res) => {
  const { id, url, server } = req.body;
  if (!id || !url) {
    return res.status(400).json({ error: 'ID or URL not provided' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  executablePath: '/usr/bin/google-chrome-stable',
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(80000);

    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14E5239e Safari/602.1'
    );

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Handle Navigation Steps and Scraping Process here...

    await handleNavigationSteps(page);

    // Check if we are back to the desired URL
    const currentUrl = await page.url();
    console.log('Final URL after all navigation steps:', currentUrl);

    if (currentUrl === url) {
      console.log('Successfully navigated to the desired URL. Now scraping episode details...');

      // Start scraping episodes

      const episodes = await scrapeEpisodes(page, server);

      // Close the browser
      await browser.close();

      res.status(200).json({ message: 'Episode details successfully scraped', episodes });
    } else {
      console.log('Navigation completed but final URL does not match. No scraping performed.');
      await browser.close();
      res.status(400).json({ message: 'Final URL did not match. Scraping not performed.' });
    }
  } catch (error) {
    console.error('Error during navigation:', error);
    res.status(500).json({ error: 'Navigation failed', details: error.message });
  }
}

// Function to scrape episodes and handle server selection
async function scrapeEpisodes(page, server) {
  const episodes = [];

  // Scrape additional episodes based on their onclick attribute
  const additionalEpisodes = await page.evaluate(() => {
    const episodeElements = document.querySelectorAll('.episode-short');
    const episodeData = [];

    episodeElements.forEach((episode) => {
      const EpisodeTitle = episode.getAttribute('title');
      const onclickAttr = episode.getAttribute('onclick');

      // Skip first episode since it's already playing
      if (!onclickAttr) return;

      // Extract the episode number from onclick attribute
      const episodeNumberMatch = onclickAttr.match(/setNewShortAnimeEpisode\((\d+)\)/);
      const episodeNumber = episodeNumberMatch ? parseInt(episodeNumberMatch[1], 10) : null;

      if (episodeNumber) {
        episodeData.push({
          EpisodeTitle,
          episodeNumber,
        });
      }
    });

    return episodeData;
  });

  // Click each episode and get its iframe src
  for (let i = 0; i < additionalEpisodes.length; i++) {
    const { episodeNumber, EpisodeTitle } = additionalEpisodes[i];

    if (episodeNumber) {

      // Click on the episode to load it
      await page.evaluate((epNumber) => {
        const episodeDiv = document.querySelector(`div[onclick="setNewShortAnimeEpisode(${epNumber})"]`);
        if (episodeDiv) episodeDiv.click();
      }, episodeNumber);

      
      // Try to get the iframe src using server first
      // await selectServer(page, server)
        // Wait for the iframe to load the new episode
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 5 seconds to ensure iframe has loaded
  
        let iframeSrc = await getEpisodeIframeSrc(page);
        let serverType = `${server}`;

      // If this sever fails (iframeSrc is null), switch to next server
      if (!iframeSrc) {
        await selectNextServer(page);

        // Wait for the iframe to load the new episode
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 5 seconds to ensure iframe has loaded

        // Try to get the iframe src again
        iframeSrc = await getEpisodeIframeSrc(page);
        serverType = `hin`;
      }

      // Add the episode details
      episodes.push({
        EpisodeTitle,
        episodeNumber,
        iframeSrc,
        serverType,
      });
    }
  }

  return episodes;
}

// Function to get the iframe src of the current episode
async function getEpisodeIframeSrc(page) {
  const iframeSrc = await page.evaluate(() => {
    const iframeElement = document.querySelector('iframe#video-player');
    return iframeElement ? iframeElement.src : null;
  });
  return iframeSrc;
}

// Function to select Telugu server if Multi fails
async function selectNextServer(page) {

  const ServerButton = await page.$('div.server-btn-a[lan="hin"]');
  if (ServerButton) {
    await ServerButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("hindi server selected successfully.");
  } else {
    console.log("hindi server button not found. Cannot switch server.");
  }
}

// async function selectServer(page, server) {
//   try {
//     await page.waitForSelector(`div.button-a-b-cc.server-btn-a[lan="${server}"][ismul="false"]`, { timeout: 5000 }); // Wait up to 10 seconds
//     const ServerButton = await page.$(`div.button-a-b-cc.server-btn-a[lan="${server}"][ismul="false"]`);
//     if (ServerButton) {
//       console.log("Waiting 3 seconds for 'server' button...");
//       await new Promise(resolve => setTimeout(resolve, 3000));
//       await ServerButton.click(`div.button-a-b-cc.server-btn-a[lan="${server}"][ismul="false"]`);
//       console.log("server selected successfully.");
//     } else {
//       console.log("server button not found. Cannot switch server.");
//     }
//   } catch (error) {
//     console.error("Error selecting server:", error);
//   }
// }


// Navigation function to skip ads
async function handleNavigationSteps(page) {
  // Step 1: Skip Ad and Enjoy button click
  if (await page.$('button#skip-ad-btn-2')) {
    console.log("Clicking 'Skip Ad and Enjoy' button...");
    await page.click('button#skip-ad-btn-2');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
   }

   console.log("Wait for next page");
   
  // Step 2: Click 'Click here to continue'
  if (await page.$('button#anchor-btn')) {
    console.log("Waiting 3 seconds for 'im not a robot' button...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 15 seconds
    await page.click('button#anchor-btn');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.click('button#anchor-btn');
    console.log("button#anchor-btn");
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("Wait for Navigation");
  }

  // Step 3: Wait 15 seconds and click 'Continue' button
  if (await page.$('button#anchor-btn')) {
    console.log("Waiting 15 seconds for 'Continue' button...");
    await new Promise(resolve => setTimeout(resolve, 23000)); // Wait for 15 seconds
    await page.click('button#anchor-btn');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.click('button#anchor-btn');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  // Step 4: Wait another 15 seconds for next 'Continue' button
  if (await page.$('button#anchor-btn')) {
    console.log("Waiting another 15 seconds for 'Continue' button...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.click('button#anchor-btn');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await page.click('button#anchor-btn');
    console.log("clicked to 'Continue' button...");
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("waitForNavigation");
  }
  console.log("step 4 comp");

  if (await page.$('div#mul-0')) {
    console.log("Waiting 3 seconds for 'Get Link' button...");
    await page.click('div#mul-0');
  }
}




// module.exports = {getAllAnimes, getAllAnimesTesting, getAnimeid,Addanimes}
module.exports = {Addanimes, getAllAnimes, scrapeAnimes}