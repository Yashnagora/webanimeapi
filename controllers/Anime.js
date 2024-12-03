const Anime = require("../models/Anime")
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
console.log(chromium.executablePath);

require("dotenv").config();

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
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const scrapeAnimes = async (req, res) => {
  console.log('Chromium Path:', chromium.executablePath);
  const { id, url, server } = req.body;
  if (!id || !url) {
    return res.status(400).json({ error: 'ID or URL not provided' });
  }

  try {
    const isLocal = !!process.env.CHROME_EXECUTABLE_PATH;

    const browser = await puppeteer.launch({
      headless: chromium.headless,
      // headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
  ],
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(40000);

    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14E5239e Safari/602.1'
    );

    // Step 1: Navigate to animedb.in and click "Skip Ads"
    console.log("Navigating to animedb.in...");
    await page.goto('https://animedb.in/', { waitUntil: 'networkidle2' });

    // Find and click "Skip Ads for Hiddenleaf.to" link
    const skipAdsSelector = 'a[href="/interstitial/"]';
    await page.waitForSelector(skipAdsSelector, { timeout: 15000 });

    const isSkipAdsClicked = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a =>
        a.textContent.includes('Skip Ads for Hiddenleaf.to')
      );
      if (link) {
        link.click();
        return true;
      }
      return false;
    });

    if (!isSkipAdsClicked) {
      throw new Error("Could not find 'Skip Ads for Hiddenleaf.to' link on animedb.in.");
    }
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Step 2: Handle additional navigation steps
    console.log("Handling navigation steps...");
    await handleNavigationSteps(page);

    // Step 3: Navigate to the user-provided URL
    console.log("Navigating to user-provided URL:", url);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Step 4: Scrape episode details
    console.log("Scraping episode details...");
    const episodes = await scrapeEpisodes(page, server);

    // Close the browser
    await browser.close();

    res.status(200).json({ message: 'Episode details successfully scraped', episodes });
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

// Navigation function to skip ads
async function handleNavigationSteps(page) {

  await new Promise(resolve => setTimeout(resolve, 3000)); 


  // Check if the ad close button exists and click it
  try {
    // Step 1: Wait for the iframe to load
    console.log("Waiting for the ad iframe...");
    await page.waitForSelector('iframe#aswift_1', { timeout: 30000 }); // Wait for the iframe
    console.log("Ad iframe detected.");

    // Step 2: Access the iframe
    const adIframe = await page.$('iframe#aswift_1'); // Select the iframe
    const frame = await adIframe.contentFrame(); // Access the iframe's content frame
    if (!frame) throw new Error("Unable to access iframe content.");

    // Step 3: Wait for the close button inside the iframe
    console.log("Waiting for the close button inside the iframe...");
    await frame.waitForSelector('div#dismiss-button', { timeout: 30000 }); // Wait for the close button inside iframe
    console.log("Close button detected inside the iframe. Clicking...");

    // Step 4: Click the close button
    await frame.evaluate(() => {
        const closeButton = document.querySelector('div#dismiss-button');
        if (closeButton) closeButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 3000));// Wait for ad to fully close
    console.log("Ad closed successfully.");
} catch (error) {
    console.log("Error while handling ad iframe or close button:", error.message);
}
   
  // Step 1: Click 'Click here to continue'

  try {

    console.log("start step 1");
    await page.waitForSelector('p.center-items', { timeout: 30000 });

    // Simulate user activity
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.evaluate(() => window.scrollBy(0, 200));

    // Wait for timer
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds

    // Ensure button is visible
    await page.evaluate(() => {
        const button = document.querySelector('button.verify-btn');
        if (button) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.style.visibility = 'visible';
            button.style.pointerEvents = 'auto';
        }
    });

    // Retry clicking the button
    const clickWithRetry = async (selector, retries = 5, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
            try {
                await page.click(selector);
                console.log(`Clicked '${selector}' successfully.`);
                return;
            } catch (error) {
                console.log(`Retry ${i + 1}/${retries} failed. Waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retry
            }
        }
        throw new Error(`Failed to click '${selector}' after ${retries} retries.`);
    };

    await clickWithRetry('button.verify-btn');

    // Proceed to next step
    await new Promise(resolve => setTimeout(resolve, 5000));
    const buttons = await page.$$('button.ad-tut-btn.center-items'); // Select all matching buttons

if (buttons.length > 1) {
    await buttons[1].click(); // Click the second button (index 1)
    console.log('Clicked the second "Continue" button.');
} else {
    console.log('Button not found or only one button is present.');
}
await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("Step 1 completed successfully.");

} catch (error) {
  console.log("Step 1 not completed:", error.message);
}


  // Step 2: Wait 15 seconds and click 'Continue' button

  try {

    console.log("start step 2");
    await page.waitForSelector('p.center-items', { timeout: 30000 });

    // Simulate user activity
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.evaluate(() => window.scrollBy(0, 200));

    // Wait for timer
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds

    // Ensure button is visible
    await page.evaluate(() => {
        const button = document.querySelector('button.verify-btn');
        if (button) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.style.visibility = 'visible';
            button.style.pointerEvents = 'auto';
        }
    });

    // Retry clicking the button
    const clickWithRetry = async (selector, retries = 5, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
            try {
                await page.click(selector);
                console.log(`Clicked '${selector}' successfully.`);
                return;
            } catch (error) {
                console.log(`Retry ${i + 1}/${retries} failed. Waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retry
            }
        }
        throw new Error(`Failed to click '${selector}' after ${retries} retries.`);
    };

    await clickWithRetry('button.verify-btn');

    // Wait for 7 seconds before starting the process
    await new Promise(resolve => setTimeout(resolve, 7000));

    console.log("Searching for 'Continue' button...");
    let retryCount = 0; // Retry counter
    const maxRetries = 4; // Maximum retries
    let navigationHappened = false; // To track navigation status
    
    // Start navigation listener
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2' }).then(() => {
        navigationHappened = true; // Mark navigation as complete
        console.log("Navigation detected!");
    });
    
    // Loop until navigation happens or retry limit is reached
    while (retryCount < maxRetries && !navigationHappened) {
        try {
            retryCount++; // Increment retry counter
            console.log(`Attempt ${retryCount}/${maxRetries}: Searching for the button...`);
    
            // Fetch fresh button handles
            const buttons = await page.$$('button.ad-tut-btn.center-items');
    
            if (buttons.length > 1) {
                console.log('Trying to click the second "Continue" button...');
                await buttons[1].click(); // Attempt to click the second button
                console.log('Clicked the second "Continue" button.');
            } else {
                console.log("Button not found or only one button is present. Retrying...");
            }
    
            // Small delay before re-checking
            await new Promise(resolve => setTimeout(resolve, 1000));
    
            // Break loop if navigation has happened
            if (navigationHappened) {
                console.log("Navigation detected during the loop. Exiting...");
                break;
            }
        } catch (error) {
            console.log('Error clicking the button. Retrying...', error.message);
        }
    }
    
    // Wait for navigation to complete
    await navigationPromise;
    
    // Check if navigation happened successfully
    if (navigationHappened) {
        console.log('Step 2 completed successfully.');
    } else {
        console.log(`Navigation did not occur after ${maxRetries} retries.`);
        throw new Error("Failed to navigate after maximum retries.");
    }

} catch (error) {
  console.log("Step 2 not completed:", error.message);
}


  // Step 3: Wait another 15 seconds for next 'Continue' button
  try {
  
    console.log("start step 3");
    await page.waitForSelector('p.center-items', { timeout: 30000 });

    // Simulate user activity
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.evaluate(() => window.scrollBy(0, 200));

    // Wait for timer
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds

    // Ensure button is visible
    await page.evaluate(() => {
        const button = document.querySelector('button.verify-btn');
        if (button) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.style.visibility = 'visible';
            button.style.pointerEvents = 'auto';
        }
    });

    // Retry clicking the button
    const clickWithRetry = async (selector, retries = 5, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
            try {
                await page.click(selector);
                console.log(`Clicked '${selector}' successfully.`);
                return;
            } catch (error) {
                console.log(`Retry ${i + 1}/${retries} failed. Waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retry
            }
        }
        throw new Error(`Failed to click '${selector}' after ${retries} retries.`);
    };

    await clickWithRetry('button.verify-btn');

     // Wait for 7 seconds before starting the process
await new Promise(resolve => setTimeout(resolve, 7000));

console.log("Searching for 'Continue' button...");
let retryCount = 0; // Retry counter
const maxRetries = 4; // Maximum retries
let navigationHappened = false; // To track navigation status

while (retryCount < maxRetries && !navigationHappened) {
    try {
        retryCount++;
        console.log(`Attempt ${retryCount}/${maxRetries}: Searching for the button...`);

        // Fetch fresh button handles
        const buttons = await page.$$('button.ad-tut-btn.center-items');
        console.log("Buttons found:", buttons.length);

        if (buttons.length > 1) {
            console.log('Trying to click the second "Continue" button...');
            await buttons[1].click(); // Click the second button
            console.log('Clicked the second "Continue" button.');

            // Check for navigation using DOM changes
            navigationHappened = await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).then(() => true),
                page.waitForFunction(() => !document.querySelector('button.ad-tut-btn.center-items'), {
                    timeout: 20000
                }).then(() => true)
            ]);

            if (navigationHappened) {
                console.log("Navigation successful. Exiting loop...");
                break;
            } else {
                console.log("Navigation did not happen; retrying...");
            }
        } else {
            console.log("Button not found or only one button is present. Retrying...");
        }

        // Short delay before next retry
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.log(`Error during attempt ${retryCount}:`, error.message);
    }
}

// Final check
if (!navigationHappened) {
    console.log("Navigation did not occur after all retries.");
    throw new Error("Failed to navigate after maximum retries.");
}

console.log("Step 3 completed successfully.");

} catch (error) {
  console.log("Step 3 not completed:", error.message);
}
// await page.waitForNavigation({ waitUntil: 'networkidle2' });
console.log("Navigation Steps completed successfully.");

}




// module.exports = {getAllAnimes, getAllAnimesTesting, getAnimeid,Addanimes}
module.exports = {Addanimes, getAllAnimes, scrapeAnimes}