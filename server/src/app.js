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
        console.log('Request body:', req.body); // Add this line to log the request body
        const { exportCountry, destinationCountry, product } = req.body;
        const data = await scraper(exportCountry, destinationCountry, product);
        res.json(data);
    } catch (error) {
        console.error('Error occurred:', error); // Log the error for debugging
        res.status(500).json({ message: 'Error scraping data', error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
