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

        // Wait for the specific #collapseExample element to ensure the page has fully loaded its content after searching
        await page.waitForSelector('#collapseExample', { visible: true, timeout: 10000 });
        console.log('Results loaded');
        // Extract the product name from #collapseExample after results load
        const resultData = await page.evaluate(async (exportCountry, destinationCountry) => {
            // Wait for the NTM YEAR section to be visible before extracting
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

            // Wait explicitly for the legislation rows to load
            await page.waitForSelector('.toggle-trigger.clickable.styled-row', { visible: true, timeout: 15000 });

            // Select the legislation rows
            const legislationRows = await page.$$('.toggle-trigger.clickable.styled-row');

            if (!legislationRows || legislationRows.length === 0) {
                throw new Error("No legislation rows found on the page.");
            }


            for (let row of legislationRows) {
                row.click(); // Click to open the popover

                // Wait for the popover to appear and ensure it has loaded
                await new Promise(resolve => setTimeout(resolve, 500));

                // Locate the expanded content in the popover
                const expandedContent = document.querySelector('.expanded');
                if (expandedContent) {
                    // Extract the title of the requirement
                    const requirementTitle = expandedContent.querySelector('.req-title')?.textContent.trim() || '';

                    // Extract details from each <li> inside the .req-detail list
                    const detailsList = Array.from(expandedContent.querySelectorAll('.req-detail li')).map(detail => {
                        const labelElement = detail.querySelector('.measure-property');
                        const label = labelElement ? labelElement.textContent.trim() : '';

                        // The rest of the content after the label
                        const text = labelElement ? detail.textContent.replace(label, '').trim() : detail.textContent.trim();

                        // For links, get the href attribute if it's a document or link
                        const linkElement = detail.querySelector('a');
                        const link = linkElement ? linkElement.href : null;

                        return {
                            label,
                            text,
                            link
                        };
                    });

                    // Add requirement and details to the import_requirements array
                    overview.regulatory_requirements.import_requirements.push({
                        name: requirementTitle,
                        data: detailsList
                    });
                }

                // Close the popover by clicking the Close button
                const closeButton = document.querySelector('.modal-footer.footer-white .btn.btn-secondary[data-dismiss="modal"]');
                if (closeButton) {
                    closeButton.click();
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for the popover to close
                }
            }

            return { overview };
        }, exportCountry, destinationCountry);





        console.log("Scrapped Data:", resultData);
        return resultData;

    } catch (error) {
        console.error('Error interacting with elements:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await new Promise(resolve => setTimeout(resolve, 90000000));
        await browser.close();
    }
}

module.exports = scraper;
