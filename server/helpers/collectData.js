export const collectData = async (page, url, query, site) => {
  if (query && site == 'b2b-center.ru') {
    try {
      await page.goto(url, {
        waitUntil: 'load',
        timeout: 0
      });
      //await new Promise((resolve) => setTimeout(resolve, 3000));
      await page.waitForSelector('#f_keyword', { timeout: 0 });
      await page.keyboard.type(query);
      await page.click('#search_button');
      await new Promise((r) => setTimeout(r, 3000));
      return await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        return document.documentElement.outerHTML;
      });
    } catch (err) {
      console.error(err.message);
      return false;
    }
  } else {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await page.content();
    } catch (err) {
      console.error(err.message);
      return false;
    }
  }
};
