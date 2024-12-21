const puppeteer = require('puppeteer');

async function goodsScrapper(exportCountry, destinationCountry, product) {
    const url = 'https://wits.worldbank.org/trade/country-byhs6product.aspx?lang=en#void';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.text());
    });

    await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle2'] });

    try {
        // Wait for the content to load
        await page.waitForSelector('#searchResults');

        // Extract data
        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#searchResults .tabbedBox tbody tr'));
            return rows.map(row => { // Process all rows
                return Array.from(row.querySelectorAll('td')).map(td => {
                    const text = td.querySelector('a').innerText.trim();
                    const number = text.split('--')[0].trim(); // Extract the number
                    const description = text.split('--')[1]?.trim(); // Extract the description
                    return { number, description };
                });
            });
        });

        return data;

    } catch (error) {
        console.error('Error during scraping:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

module.exports = goodsScrapper;
//wrking but issue


