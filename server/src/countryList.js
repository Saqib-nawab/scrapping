const puppeteer = require('puppeteer');

async function scrapeCountryList() {
    const url = 'https://www.macmap.org/en//query/results?reporter=276&partner=586&product=380210&level=6';

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle2'] });

        // Wait for the dropdown to appear
        await page.waitForSelector('#exporting-country', { visible: true, timeout: 20000 });

        // Extract country options and their values
        const countryList = await page.$$eval('#exporting-country option', options => {
            return options.map(option => ({
                value: option.value.trim(),
                name: option.textContent.trim()
            })).filter(option => option.value !== ''); // Filter out the default "Select country" option
        });

        console.log('Scraped country list:', countryList);
        return countryList;
    } catch (error) {
        console.error('Error while scraping country list:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await browser.close();
    }
}

module.exports = scrapeCountryList;

// To test the scraper, uncomment the lines below:
// (async () => {
//     const countryList = await scrapeCountryList();
//     console.log('Country List:', countryList);
// })();