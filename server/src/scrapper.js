const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        // Enter Export Country
        await page.waitForSelector('.input.export', { visible: true, timeout: 10000 });
        await page.click('.input.export');
        console.log('Clicked on the element with class "input export"');
        await page.waitForSelector('.chosen-search-input', { visible: true, timeout: 10000 });
        await page.focus('.chosen-search-input');  // Ensuring focus
        await page.keyboard.type(exportCountry);
        console.log(`Typed "${exportCountry}" into the export field`);

        // Enter Destination Country using `tabindex="2"` selector
        await page.waitForSelector('.input.import', { visible: true, timeout: 10000 });
        await page.click('.input.import');  // Click to focus on the destination field
        console.log('Clicked on the destination country input with tabindex="2"');
        await page.waitForSelector('[tabindex="2"]', { visible: true, timeout: 10000 });
        await page.focus('[tabindex="2"]');  // Ensuring focus
        await page.keyboard.type(destinationCountry);
        console.log(`Typed "${destinationCountry}" into the destination field`);

        // Enter Product
        await page.waitForSelector('.input.product', { visible: true, timeout: 10000 });
        await page.click('.input.product');
        console.log('Clicked on the element with class "input product"');
        await page.waitForSelector('#product-list', { visible: true, timeout: 10000 });
        await page.focus('#product-list');  // Ensuring focus
        await page.keyboard.type(product);
        console.log(`Typed "${product}" into the product field`);

        // Click the submit button
        await page.waitForSelector('#submit', { visible: true, timeout: 10000 });
        await page.click('#submit');
        console.log('Clicked the submit button');

        // Wait for the results to load
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        console.log('Results loaded');

        // Wait for 5 seconds before closing the browser
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
        console.error('Error interacting with elements:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await browser.close();
    }

    const result = { message: `Successfully entered ${exportCountry}, ${destinationCountry}, and ${product}` };
    return result;
}

module.exports = scraper;
