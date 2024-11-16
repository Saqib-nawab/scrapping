const express = require('express');
const scraper = require('./scrapper');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

// Database configuration using environment variables
const pool = new Pool({
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD
});

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// POST endpoint to scrape and save data
app.post('/scrape', async (req, res) => {
    try {
        console.log('Request body:', req.body);
        const { exportCountry, destinationCountry, product } = req.body;

        // Scrape data
        const { overview, rawHtml, updatedUrl } = await scraper(exportCountry, destinationCountry, product);

        // Insert scraped data into the database
        const query = `
            INSERT INTO trade_regulation (
                exporting_country,
                destination_country,
                data,
                url,
                raw,
                hs6_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [
            exportCountry, // exporting_country
            destinationCountry, // destination_country
            JSON.stringify(overview), // data
            updatedUrl, // url
            rawHtml, // raw
            product // hs6_id
        ];

        const result = await pool.query(query, values);

        console.log('Data successfully saved to the database:', result.rows[0]);

        // Respond with the inserted data
        res.json({ message: 'Data successfully saved to the database', data: result.rows[0] });
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ message: 'Error scraping or saving data', error });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
