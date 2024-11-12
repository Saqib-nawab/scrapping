const express = require('express');
const scraper = require('./scrapper');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json()); // Enable parsing of JSON bodies

// Change to POST to match the client
app.post('/scrape', async (req, res) => {
    try {
        const { exportCountry, destinationCountry, product } = req.body;
        const data = await scraper(exportCountry, destinationCountry, product);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error scraping data', error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
