import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 400 });
const page = await browser.newPage();

await page.goto('http://localhost:3000/login');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tmp-login-new.png' });

// Click "Pamiršote slaptažodį?"
const forgotBtn = page.locator('button:has-text("Pamiršote")');
if (await forgotBtn.isVisible()) {
  await forgotBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tmp-forgot.png' });
  console.log('Forgot password form visible');
} else {
  console.log('Forgot button NOT visible');
}

await browser.close();
