const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
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

        // Enter Destination Country
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

        // Wait for results to load
        await page.waitForSelector('#collapseExample', { visible: true, timeout: 50000 });
        console.log('Results loaded');

        // Wait for the legislation rows to be present
        await page.waitForSelector('.toggle-trigger.clickable.styled-row', { visible: true, timeout: 15000 });

        // Get all legislation rows and retrieve their ids
        const legislationRowSelectors = [];
        const legislationRows = await page.$$('.toggle-trigger.clickable.styled-row');

        for (let row of legislationRows) {
            const idHandle = await row.getProperty('id');
            const id = await idHandle.jsonValue();
            legislationRowSelectors.push(`#${id}`);
        }
        console.log("Legislation Row Selectors:", legislationRowSelectors);
        if (legislationRowSelectors.length === 0) {
            throw new Error("No legislation rows found on the page.");
        }

        // Execute the main scraping logic in the page context
        const resultData = await page.evaluate(
            async (exportCountry, destinationCountry, legislationRowSelectors) => {
                const ntmYearElement = document.querySelector('.overview-message.overview-message-data strong');
                const ntmYear = ntmYearElement ? parseInt(ntmYearElement.textContent.trim()) : null;

                const overview = {
                    exporting_country: exportCountry,
                    importing_country: destinationCountry,
                    product: document.querySelector('#collapseExample')?.textContent.trim() || '',
                    customs_tariffs: {
                        mfn: {
                            applied: parseFloat(document.querySelector('tr:nth-of-type(1) > td:nth-of-type(2)')?.textContent.trim().replace('%', '') || '0'),
                            average: parseFloat(document.querySelector('tr:nth-of-type(1) > td:nth-of-type(3)')?.textContent.trim().replace('%', '') || '0')
                        },
                        preferential: {
                            applied: parseFloat(document.querySelector('tr.even > td:nth-of-type(2)')?.textContent.trim().replace('%', '') || 'null'),
                            average: parseFloat(document.querySelector('tr.even > td:nth-of-type(3)')?.textContent.trim().replace('%', '') || 'null')
                        }
                    },
                    trade_remedies: null,
                    regulatory_requirements: {
                        ntm_year: ntmYear,
                        import_requirements: []
                    }
                };

                // Loop through each legislation row by selector
                for (let selector of legislationRowSelectors) {
                    const row = document.querySelector(selector);
                    if (row) {
                        row.click(); // Open the popover

                        // Wait for the popover to appear
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        // Get the expanded content in the popover
                        const expandedContent = document.querySelector('.expanded');
                        if (expandedContent) {
                            const requirementTitle = expandedContent.querySelector('.req-title')?.textContent.trim() || '';
                            const detailsList = Array.from(expandedContent.querySelectorAll('.req-detail li')).map(detail => {
                                const labelElement = detail.querySelector('.measure-property');
                                const label = labelElement ? labelElement.textContent.trim() : '';
                                const text = labelElement ? detail.textContent.replace(label, '').trim() : detail.textContent.trim();
                                const linkElement = detail.querySelector('a');
                                const link = linkElement ? linkElement.href : null;

                                return { label, text, link };
                            });

                            overview.regulatory_requirements.import_requirements.push({
                                name: requirementTitle,
                                data: detailsList
                            });
                        }

                        // Close the popover
                        const closeButton = document.querySelector('.modal-footer.footer-white .btn.btn-secondary[data-dismiss="modal"]');
                        if (closeButton) {
                            closeButton.click();
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                }

                return { overview };
            },
            exportCountry,
            destinationCountry,
            legislationRowSelectors // Pass row selectors to use within evaluate
        );

        console.log("Scraped Data:", resultData);
        return resultData;

    } catch (error) {
        console.error('Error interacting with elements:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await browser.close();
    }
}

module.exports = scraper;