const puppeteer = require('puppeteer');

async function scraper(exportCountry, destinationCountry, product, dynamicUrl) {
    const startTime = Date.now();
    const timings = []; // Array to store timings
    const addCheckpoint = (label) => timings.push({ label, time: Date.now() - startTime }); // Helper function

    const url = 'https://www.macmap.org/';
    console.log("dynamic url:", dynamicUrl);

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.text());
    });

    try {
        addCheckpoint('Browser launched and page created');

        await page.goto(dynamicUrl, { waitUntil: ['domcontentloaded', 'networkidle2'] });
        addCheckpoint('Page loaded');

        await page.waitForSelector('#collapseExample', { visible: true, timeout: 50000 });
        addCheckpoint('Collapse example found');

        await page.setViewport({ width: 1280, height: 800 });
        addCheckpoint('Viewport resized');

        let legislationLinks = [];
        try {
            await page.waitForSelector('.detail-link.toggle', { visible: true, timeout: 5000 });
            legislationLinks = await page.$$('.detail-link.toggle');
            addCheckpoint('Legislation links found');
        } catch (e) {
            console.warn("No legislation links found. Proceeding with empty data for legislation links.");
            addCheckpoint('No legislation links found');
        }

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
                    const preferentialRows = await page.$$('tr.even');
                    let preferentialData = { applied: null, average: null };

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
                                break;
                            } catch (e) {
                                console.warn('Error extracting preferential tariff data for a row:', e);
                            }
                        }
                    }
                    return preferentialData;
                })()
            },
            trade_remedies: null,
            regulatory_requirements: null // Default as null; updated if legislation links exist
        };
        addCheckpoint('Overview constructed');

        if (legislationLinks.length > 0) {
            overview.regulatory_requirements = {
                ntm_year: parseInt(await page.$eval('.overview-message.overview-message-data strong', el => el.textContent.trim())) || null,
                import_requirements: []
            };
            addCheckpoint('Regulatory requirements initialized');

            for (let link of legislationLinks) {
                await link.click();
                const parentDetailId = await link.evaluate(el => el.getAttribute('data-detail'));
                const mainLegislationSelector = `#parent-tr-nsd-${parentDetailId}`;
                const expandedContentSelector = `#tr-nsd-${parentDetailId}`;

                await page.waitForSelector(expandedContentSelector, { visible: true, timeout: 5000 });
                const mainLegislationName = await page.$eval(
                    `${mainLegislationSelector} .measure-summary`,
                    el => el.textContent.trim()
                );

                const subLegislationRows = await page.$$(`${expandedContentSelector} .req-list`);
                const subLegislationDetails = [];

                for (let subRow of subLegislationRows) {
                    const subLegislationTitle = await subRow.$eval('.req-title em', el => el.textContent.trim());
                    const detailsList = await subRow.$$eval('.req-detail li', details => {
                        return details.map(detail => {
                            const label = detail.querySelector('em')?.textContent.trim() || '';
                            const text = detail.textContent.replace(label, '').trim();
                            const link = detail.querySelector('a')?.href || null;
                            return { label, text, link };
                        });
                    });

                    subLegislationDetails.push({
                        title: subLegislationTitle,
                        details: detailsList
                    });
                }

                overview.regulatory_requirements.import_requirements.push({
                    parent_id: parentDetailId,
                    name: mainLegislationName,
                    sub_legislations: subLegislationDetails
                });
            }
            addCheckpoint('Legislation details processed');
        }

        const rawHtml = await page.content();
        const updatedUrl = page.url();
        addCheckpoint('Page content retrieved');

        return { overview, rawHtml, updatedUrl };

    } catch (error) {
        console.error('Error during scraping:', error);
        return { message: 'Error during scraping', error };
    } finally {
        const endTime = Date.now();
        console.log(`Scraping process completed in ${(endTime - startTime) / 1000} seconds.`);

        console.log('Timings breakdown:', timings);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await browser.close();
    }
}

module.exports = scraper;