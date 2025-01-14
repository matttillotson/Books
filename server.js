const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const HttpsProxyAgent = require('https-proxy-agent');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Free proxy list - you might want to rotate through multiple proxies
const PROXY_URL = 'http://proxy.scrapeops.io/v1/';
const SCRAPEOPS_API_KEY = 'YOUR_API_KEY'; // Sign up at scrapeops.io for free key

app.post('/scrape', async (req, res) => {
    try {
        let { url } = req.body;
        console.log('Initial URL:', url);

        // If it's a shortened URL (amzn.to), follow the redirect first
        if (url.includes('amzn.to')) {
            console.log('Following redirect for shortened URL...');
            const redirectResponse = await axios.get(url);
            url = redirectResponse.request.res.responseUrl;
            console.log('Redirected to:', url);
        }

        // Encode the target URL
        const encodedUrl = encodeURIComponent(url);
        const proxyUrl = `${PROXY_URL}?api_key=${SCRAPEOPS_API_KEY}&url=${encodedUrl}`;

        console.log('Fetching Amazon page through proxy...');
        const response = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('Parsing page content...');
        const $ = cheerio.load(response.data);

        // Extract book data with more robust selectors
        const title = $('#productTitle, #title').text().trim();
        console.log('Found title:', title);

        const author = $('#bylineInfo .author a, #bylineInfo .contributorNameID, .author a, .contributorNameID, .bylineInfo a')
            .first()
            .text()
            .trim() || 'Unknown Author';
        console.log('Found author:', author);

        const subject = $('#wayfinding-breadcrumbs_feature_div li:last-child, .zg_hrsr li:first')
            .text()
            .trim() || 'Uncategorized';
        console.log('Found subject:', subject);

        // Try to get the image URL
        let coverUrl = null;
        const imageData = $('#imgBlkFront, #landingImage, #ebooksImgBlkFront').attr('data-a-dynamic-image');
        
        if (imageData) {
            try {
                const images = JSON.parse(imageData);
                coverUrl = Object.keys(images)[0];
            } catch (e) {
                console.log('Failed to parse image data:', e);
            }
        }

        if (!coverUrl) {
            coverUrl = $('#imgBlkFront, #landingImage, #ebooksImgBlkFront').attr('src') ||
                      'https://via.placeholder.com/200x300?text=No+Cover';
        }

        console.log('Found cover URL:', coverUrl);

        if (!title) {
            throw new Error('Could not find book title');
        }

        const bookData = {
            title,
            author,
            subject,
            coverUrl,
            amazonUrl: url
        };

        console.log('Sending response:', bookData);
        res.json(bookData);
    } catch (error) {
        console.error('Scraping error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to scrape book data',
            details: error.message,
            stack: error.stack
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 