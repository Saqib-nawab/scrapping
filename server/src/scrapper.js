const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Capture console messages from the page context
    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.text());
    });

    await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle2'] });

    try {
        // Existing code to set export country, destination country, and product
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
        console.log('Clicked on the destination country input');
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

        // Resize viewport before processing legislation clicks
        await page.setViewport({ width: 1280, height: 800 });
        console.log('Resized viewport for legislation interaction');

        // Wait for the main legislation links to appear
        await page.waitForSelector('.detail-link.toggle', { visible: true, timeout: 10000 });
        console.log('Main legislation links are now visible');

        // Get all main legislation link elements
        const legislationLinks = await page.$$('.detail-link.toggle');
        if (legislationLinks.length === 0) {
            throw new Error('No legislation links found on the page.');
        }
        console.log(`Found ${legislationLinks.length} main legislation links.`);


        const overview = {
            exporting_country: exportCountry,
            importing_country: destinationCountry,
            product: await page.$eval('#collapseExample', el => el.textContent.trim()),
            customs_tariffs: {
                mfn: {
                    applied: parseFloat(await page.$eval('tr:nth-of-type(1) > td:nth-of-type(2)', el => el.textContent.trim().replace('%', '') || '0')),
                    average: parseFloat(await page.$eval('tr:nth-of-type(1) > td:nth-of-type(3)', el => el.textContent.trim().replace('%', '') || '0'))
                },
                preferential: {
                    applied: parseFloat(await page.$eval('tr.even > td:nth-of-type(2)', el => el.textContent.trim().replace('%', '') || 'null')),
                    average: parseFloat(await page.$eval('tr.even > td:nth-of-type(3)', el => el.textContent.trim().replace('%', '') || 'null'))
                }
            },
            trade_remedies: null,
            regulatory_requirements: {
                ntm_year: parseInt(await page.$eval('.overview-message.overview-message-data strong', el => el.textContent.trim())) || null,
                import_requirements: []
            }
        };

        // for (let link of legislationLinks) {
        //     // Click the main legislation link
        //     await link.click();
        //     console.log('Clicked on a main legislation link');

        //     // Wait for the expanded content to load
        //     await page.waitForSelector('.ntm-summary-detail-result', { visible: true, timeout: 5000 });

        //     // Get the unique ID of the parent detail
        //     const parentDetailId = await link.evaluate(el => el.getAttribute('data-detail'));

        //     // Extract the main legislation name (e.g., "Labelling requirements")
        //     const mainLegislationName = await page.$eval(
        //         `#parent-tr-nsd-${parentDetailId} .measure-summary`,
        //         el => el.textContent.trim()
        //     );
        //     console.log(`Extracted Main Legislation Name: ${mainLegislationName}`);

        //     const subLegislationSelector = `#nsd-${parentDetailId} .toggle-more`;

        //     // Find all sub-legislation toggle links within the current parent legislation
        //     const subLegislationLinks = await page.$$(subLegislationSelector);

        //     // Initialize an array to store sub-legislation details
        //     const subLegislationDetails = [];

        //     for (let subLink of subLegislationLinks) {
        //         // Click each sub-legislation toggle link
        //         await subLink.click();
        //         console.log(`Clicked on sub-legislation toggle for parent ID: ${parentDetailId}`);

        //         // Wait for the sub-legislation details to appear
        //         await page.waitForSelector('.req-detail', { visible: true, timeout: 2000 });

        //         // Extract details of the sub-legislation
        //         const subLegislationContent = await subLink.evaluate(el => {
        //             const parentRow = el.closest('tr');
        //             const title = parentRow.querySelector('.req-title em')?.textContent.trim() || 'No Title';
        //             const details = Array.from(parentRow.querySelectorAll('.req-detail li')).map(detail => {
        //                 const label = detail.querySelector('em')?.textContent.trim() || '';
        //                 const value = detail.textContent.replace(label, '').trim();
        //                 const link = detail.querySelector('a')?.href || null;
        //                 return { label, value, link };
        //             });
        //             return { title, details };
        //         });

        //         console.log(`Extracted Sub-Legislation Content:`, subLegislationContent);

        //         // Add sub-legislation details to the array
        //         subLegislationDetails.push(subLegislationContent);

        //         // Pause briefly to ensure smooth processing
        //         await new Promise(resolve => setTimeout(resolve, 3000));
        //     }

        //     // Add the parent legislation and its sub-legislation details to the overview
        //     overview.regulatory_requirements.import_requirements.push({
        //         parent_id: parentDetailId,
        //         name: mainLegislationName,
        //         sub_legislations: subLegislationDetails
        //     });

        //     console.log(`Added Parent Legislation and Sub-Legislations for ID: ${parentDetailId}`);
        // }


        for (let link of legislationLinks) {
            // Click the main legislation link
            await link.click();
            console.log('Clicked on a main legislation link');

            // Wait for the expanded content to load
            const parentDetailId = await link.evaluate(el => el.getAttribute('data-detail'));
            const mainLegislationSelector = `#parent-tr-nsd-${parentDetailId}`;
            const expandedContentSelector = `#tr-nsd-${parentDetailId}`;

            // Wait for the expanded content of this legislation to load
            await page.waitForSelector(expandedContentSelector, { visible: true, timeout: 2000 });

            // Extract the main legislation name (e.g., "Labelling requirements")
            const mainLegislationName = await page.$eval(
                `${mainLegislationSelector} .measure-summary`,
                el => el.textContent.trim()
            );
            console.log(`Extracted Main Legislation Name: ${mainLegislationName}`);

            // Get the sub-legislation rows within this legislation
            const subLegislationRows = await page.$$(`${expandedContentSelector} .req-list`);

            const subLegislationDetails = [];

            for (let subRow of subLegislationRows) {
                // Extract sub-legislation title
                const subLegislationTitle = await subRow.$eval('.req-title em', el => el.textContent.trim());

                // Extract sub-legislation details
                const detailsList = await subRow.$$eval('.req-detail li', details => {
                    return details.map(detail => {
                        const label = detail.querySelector('em')?.textContent.trim() || '';
                        const text = detail.textContent.replace(label, '').trim();
                        const link = detail.querySelector('a')?.href || null;
                        return { label, text, link };
                    });
                });

                console.log(`Extracted Sub-Legislation: ${subLegislationTitle}`);
                console.log(`Details:`, detailsList);

                subLegislationDetails.push({
                    title: subLegislationTitle,
                    details: detailsList
                });
            }

            // Add the main legislation and its sub-legislation details to the overview
            overview.regulatory_requirements.import_requirements.push({
                parent_id: parentDetailId,
                name: mainLegislationName,
                sub_legislations: subLegislationDetails
            });

            console.log(`Added Parent Legislation and Sub-Legislations for ID: ${parentDetailId}`);
        }


        console.log("Scraped Data:", overview);
        return { overview };

    } catch (error) {
        console.error('Error during scraping:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

module.exports = scraper;
