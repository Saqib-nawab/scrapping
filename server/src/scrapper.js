const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product) {
    const url = 'https://www.macmap.org/';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.text());
    });

    await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle2'] });
    try {
        await page.waitForSelector('.input.export', { visible: true, timeout: 20000 });
        await page.click('.input.export');
        await page.waitForSelector('.chosen-search-input', { visible: true, timeout: 20000 });
        await page.focus('.chosen-search-input');
        await page.keyboard.type(exportCountry);

        // Enter Destination Country
        await page.waitForSelector('.input.import', { visible: true, timeout: 20000 });
        await page.click('.input.import');
        await page.waitForSelector('[tabindex="2"]', { visible: true, timeout: 20000 });
        await page.focus('[tabindex="2"]');
        await page.keyboard.type(destinationCountry);

        // Enter Product
        await page.waitForSelector('.input.product', { visible: true, timeout: 20000 });
        await page.click('.input.product');
        await page.waitForSelector('#product-list', { visible: true, timeout: 20000 });
        await page.focus('#product-list');
        await page.keyboard.type(product);

        await page.waitForSelector('#submit', { visible: true, timeout: 10000 });
        await page.click('#submit');

        await page.waitForSelector('#collapseExample', { visible: true, timeout: 50000 });

        await page.setViewport({ width: 1280, height: 800 });
        console.log('Resized viewport for legislation interaction');

        await page.waitForSelector('.detail-link.toggle', { visible: true, timeout: 10000 });
        console.log('Main legislation links are now visible');

        const legislationLinks = await page.$$('.detail-link.toggle');
        if (legislationLinks.length === 0) {
            throw new Error('No legislation links found on the page.');
        }
        console.log(`Found ${legislationLinks.length} main legislation links.`);
        const overview = {
            exporting_country: exportCountry,
            importing_country: destinationCountry,
            trade_regulation_id: product,
            product: await page.$eval('#collapseExample', el => el.textContent.trim()),
            customs_tariffs: {
                mfn: {
                    applied: parseFloat(await page.$eval('tr:nth-of-type(1) > td:nth-of-type(2)', el => el.textContent.trim().replace('%', '') || '0')),
                    average: parseFloat(await page.$eval('tr:nth-of-type(1) > td:nth-of-type(3)', el => el.textContent.trim().replace('%', '') || '0'))
                },
                preferential: await (async () => {
                    // Dynamically find rows with "even" class for preferential tariffs
                    const preferentialRows = await page.$$('tr.even');
                    let preferentialData = {
                        applied: null,
                        average: null
                    };

                    if (preferentialRows.length > 0) {
                        for (let row of preferentialRows) {
                            try {
                                const applied = await row.$eval('td:nth-of-type(2)', el =>
                                    parseFloat(el.textContent.trim().replace('%', '') || '0')
                                );
                                const average = await row.$eval('td:nth-of-type(3)', el =>
                                    parseFloat(el.textContent.trim().replace('%', '') || '0')
                                );
                                preferentialData = { applied, average };
                                break; // Assume first valid row is enough
                            } catch (e) {
                                console.warn('Error extracting preferential tariff data for a row:', e);
                            }
                        }
                    }
                    return preferentialData;
                })()
            },
            trade_remedies: null,
            regulatory_requirements: {
                ntm_year: parseInt(await page.$eval('.overview-message.overview-message-data strong', el => el.textContent.trim())) || null,
                import_requirements: []
            }
        };

        for (let link of legislationLinks) {
            // Click the main legislation link
            await link.click();
            console.log('Clicked on a main legislation link');

            // Wait for the expanded content to load
            const parentDetailId = await link.evaluate(el => el.getAttribute('data-detail'));
            const mainLegislationSelector = `#parent-tr-nsd-${parentDetailId}`;
            const expandedContentSelector = `#tr-nsd-${parentDetailId}`;

            // Wait for the expanded content of this legislation to load
            await page.waitForSelector(expandedContentSelector, { visible: true, timeout: 5000 });

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

        // Capture raw HTML updated URL of the page
        const rawHtml = await page.content();
        const updatedUrl = page.url();

        console.log("Scraped Data:", overview);
        return { overview, rawHtml, updatedUrl };

    } catch (error) {
        console.error('Error during scraping:', error);
        return { message: 'Error during scraping', error };
    } finally {
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

module.exports = scraper;