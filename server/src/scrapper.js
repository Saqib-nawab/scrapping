const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        // Your existing code for entering export country, destination country, and product
        await page.waitForSelector('.input.export', { visible: true, timeout: 10000 });
        await page.click('.input.export');
        console.log('Clicked on the element with class "input export"');
        await page.waitForSelector('.chosen-search-input', { visible: true, timeout: 10000 });
        await page.focus('.chosen-search-input');
        await page.keyboard.type(exportCountry);
        console.log(`Typed "${exportCountry}" into the export field`);

        // Enter Destination Country using `tabindex="2"` selector
        await page.waitForSelector('.input.import', { visible: true, timeout: 10000 });
        await page.click('.input.import');
        console.log('Clicked on the destination country input with tabindex="2"');
        await page.waitForSelector('[tabindex="2"]', { visible: true, timeout: 10000 });
        await page.focus('[tabindex="2"]');
        await page.keyboard.type(destinationCountry);
        console.log(`Typed "${destinationCountry}" into the destination field`);

        // Enter Product
        await page.waitForSelector('.input.product', { visible: true, timeout: 10000 });
        await page.click('.input.product');
        console.log('Clicked on the element with class "input product"');
        await page.waitForSelector('#product-list', { visible: true, timeout: 10000 });
        await page.focus('#product-list');
        await page.keyboard.type(product);
        console.log(`Typed "${product}" into the product field`);

        // Click the submit button and wait for the page to reload
        await page.waitForSelector('#submit', { visible: true, timeout: 10000 });
        await page.click('#submit');
        console.log('Clicked the submit button');

        // // Wait for the results page to load fully
        // await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        // console.log('Results loaded');

        // Wait for the specific #collapseExample element to ensure the page has fully loaded its content
        await page.waitForSelector('#collapseExample', { visible: true, timeout: 10000 });
        console.log('Found #collapseExample on the results page');
        // Extract the product name from #collapseExample after results load
        const resultData = await page.evaluate((exportCountry, destinationCountry) => {
            const overview = {
                exporting_country: exportCountry,
                importing_country: destinationCountry,
                product: document.querySelector('#collapseExample')?.textContent.trim() || '',

                // Placeholder values for now
                customs_tariffs: {
                    mfn: 0,
                    pref: 0
                },
                trade_remedies: null,
                regulatory_requirements: {
                    ntm_year: 0,
                    import_requirements: []
                }
            };
            return { overview };
        }, exportCountry, destinationCountry); // Passing parameters to evaluate function

        return resultData;

    } catch (error) {
        console.error('Error interacting with elements:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await browser.close();
    }
}

module.exports = scraper;
