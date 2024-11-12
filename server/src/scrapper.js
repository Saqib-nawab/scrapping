const puppeteer = require('puppeteer');

async function scraper() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.macmap.org/');  // Replace with the actual target URL

    // Wait for the checkbox input with `type="checkbox"` and click it
    await page.waitForSelector('input[type="checkbox"]');
    await page.click('input[type="checkbox"]');

    // Additional scraping or actions can go here
    const data = await page.evaluate(() => {
        return { message: 'Checkbox clicked successfully' };
    });

    await browser.close();
    return data;
}

module.exports = scraper;
