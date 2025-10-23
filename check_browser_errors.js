const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // التقاط console errors
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url()));
  
  try {
    await page.goto('http://localhost:8788', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Page loaded successfully');
    
    // فحص محتوى #root
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML : 'ROOT NOT FOUND';
    });
    console.log('ROOT CONTENT:', rootContent);
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  
  await browser.close();
})();
