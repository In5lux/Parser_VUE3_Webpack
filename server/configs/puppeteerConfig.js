const puppeteerConfig = {
  headless: 'true', // false: enables one to view the Chrome instance in action
  defaultViewport: { width: 1400, height: 700 }, // optional
  slowMo: 25
  //args: ['--no-sandbox', '--headless', '--disable-gpu']
};

export default puppeteerConfig;
