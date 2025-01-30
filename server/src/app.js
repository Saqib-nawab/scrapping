const express = require('express');
const scraper = require('./scrapper');
const goodsScrapper = require('./goodsScrapper');
const cors = require('cors');
const fs = require('fs'); // File system module to read HTML file
const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file
const xml2js = require('xml2js');

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


// New route to get country list from HTML file and insert into the database
app.get('/scrapeCountryList', async (req, res) => {
    console.log("password", process.env.SQL_PASSWORD);
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

        // Insert data into the database
        const insertQuery = `
            INSERT INTO countries (foreign_id, country_name) 
            VALUES ($1, $2)
            ON CONFLICT (foreign_id) DO NOTHING; -- Avoid duplicates
        `;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const country of countries) {
                const { value, name } = country;
                await client.query(insertQuery, [value, name]);
            }

            await client.query('COMMIT');
            console.log('Country list successfully saved to the database.');
            res.status(200).json({ message: 'Country list successfully saved to the database', countries });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error; // Rethrow to be caught in the outer catch block
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error occurred while saving country list to the database:', error);
        res.status(500).json({ message: 'Error saving country list to the database', error });
    }
});

app.post('/importCpv', async (req, res) => {
    try {
        const xmlData = fs.readFileSync('./cpv_2008.xml', 'utf8'); // Read the XML file
        const parser = new xml2js.Parser();

        // Parse the XML file
        parser.parseString(xmlData, async (err, result) => {
            if (err) throw err;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const cpvCodes = result.CPV_CODE.CPV;

                // Iterate over CPV entries
                for (const cpv of cpvCodes) {
                    const cpvCode = cpv.$.CODE; // Get the CODE attribute
                    const texts = cpv.TEXT;

                    for (const text of texts) {
                        const lang = text.$.LANG;
                        const description = text._;

                        // Insert into DB
                        const insertQuery = `
                            INSERT INTO cpv_codes (cpv_code, lang, description)
                            VALUES ($1, $2, $3)
                            ON CONFLICT DO NOTHING;
                        `;
                        await client.query(insertQuery, [cpvCode, lang, description]);
                        console.log("inserted", cpvCode, lang, description);
                    }
                }

                await client.query('COMMIT');
                res.status(200).json({ message: 'CPV data successfully imported into the database' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        });
    } catch (error) {
        console.error('Error importing CPV data:', error);
        res.status(500).json({ message: 'Error importing CPV data', error });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
