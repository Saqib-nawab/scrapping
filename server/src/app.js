const express = require('express');
const scraper = require('./scrapper');
const app = express();
const PORT = 5000;

app.get('/scrape', async (req, res) => {
    try {
        const data = await scraper();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error scraping data', error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
