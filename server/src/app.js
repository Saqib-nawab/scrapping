const express = require('express');
const scraper = require('./scrapper');
const goodsScrapper = require('./goodsScrapper');
const cors = require('cors');
const fs = require('fs'); // File system module to read HTML file
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
        console.log("overview", overview);

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


app.get('/goodsscrape', async (req, res) => {


    try {
        const goods = await goodsScrapper(); // Call the scraper
        console.log("Scraped Goods:", goods);

        // Insert scraped data into the database
        const insertQuery = `
            INSERT INTO wits_goods (hs_6_code, good) 
            VALUES ($1, $2)
            ON CONFLICT (hs_6_code) DO NOTHING; -- Avoid duplicates
        `;

        // Use a transaction to insert all rows
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const row of goods) {
                console.log("posting to db", row);
                for (const item of row) {
                    const { number, description } = item;
                    if (number && description) {
                        await client.query(insertQuery, [number, description]);
                    }
                }
            }

            await client.query('COMMIT');
            console.log('Data successfully saved to the database.');
            res.status(200).json({ message: 'Data successfully saved to the database', goods });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error; // Rethrow to be caught in the outer catch block
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ message: 'Error scraping or saving data', error });
    }
});


// New route to get country list from HTML file
app.get('/scrapeCountryList', async (req, res) => {
    try {
        const html = fs.readFileSync('./countryListHtml.html', 'utf8'); // Read the HTML file
        const regex = /<option value="(\d+)">(.*?)<\/option>/g; // Regex to extract values and names

        const countries = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            const value = match[1];
            const name = match[2];
            countries.push({ value, name });
        }

        console.log("Extracted Country List:", countries);
        res.status(200).json({ message: 'Country list successfully extracted', countries });
    } catch (error) {
        console.error('Error occurred while extracting country list:', error);
        res.status(500).json({ message: 'Error extracting country list', error });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
