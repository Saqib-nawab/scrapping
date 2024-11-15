const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/en//query/results?reporter=276&partner=586&product=380210&level=6';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.text());
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        // Wait for results to load
        await page.waitForSelector('#collapseExample', { visible: true, timeout: 50000 });
        console.log('Results loaded');

        // Select all main legislation elements to click and expand
        const legislationLinks = await page.$$('.detail-link.toggle');

        for (let link of legislationLinks) {
            // Click to expand the main legislation details
            await link.click();
            console.log('Clicked on a main legislation link');
            await page.waitForSelector('.ntm-summary-detail-result', { visible: true, timeout: 2000 });

            // Get the unique ID of the expanded section from the main legislation link
            const parentDetailId = await link.evaluate(el => el.getAttribute('data-detail'));
            const subLegislationSelector = `#nsd-${parentDetailId} .toggle-more`;

            // Select sub-legislation elements specific to the expanded section
            const subLegislationLinks = await page.$$(subLegislationSelector);

            for (let subLink of subLegislationLinks) {
                // Click each sub-legislation toggle within the current main legislation context
                await subLink.click();
                console.log('Clicked on a sub-legislation toggle');

                // Pause briefly for any content to load
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('All main and sub-legislation links have been clicked');

    } catch (error) {
        console.error('Error interacting with elements:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await browser.close();
    }
}

module.exports = scraper;
