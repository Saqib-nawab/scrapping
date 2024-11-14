const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/en//query/results?reporter=276&partner=586&product=380210&level=6';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Capture console messages from the page context
    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.text());
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        // Wait for results to load
        await page.waitForSelector('#collapseExample', { visible: true, timeout: 50000 });
        console.log('Results loaded');

        // Wait for the table to load and become visible
        await page.waitForSelector('.table-responsive .table-toggle-list', { visible: true, timeout: 20000 });
        console.log('Legislation table loaded');

        // Select all `span` elements with class `detail-link toggle` to click them one by one
        const legislationLinks = await page.$$('.detail-link.toggle');

        for (let link of legislationLinks) {
            // Click each `detail-link` span to expand the row details
            await link.click();
            console.log('Clicked on a legislation detail link');

            await page.waitForTimeout(3000);
        }

        console.log('All legislation detail links have been clicked');

    } catch (error) {
        console.error('Error interacting with elements:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await browser.close();
    }
}

module.exports = scraper;
