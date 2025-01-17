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
            return rows.map(row => {
                return Array.from(row.querySelectorAll('td')).map(td => {
                    const link = td.querySelector('a'); // Select the link element
                    if (!link) return { number: null, description: null };

                    const rawText = link.innerText.trim(); // Get raw text
                    const match = rawText.match(/^(\d{6})\s*--\s*(.+)$/); // Match the number and description

                    const number = match ? match[1] : null; // Extract 6-digit number
                    const description = match ? match[2] : null; // Extract description

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
