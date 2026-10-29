import pkg from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pkg;

const BASE = 'http://localhost:5175';
const OUT = '/home/user/verilex/verilex-demo-video/public/screens';
const EMAIL = `demo-video-${Date.now()}@example.com`;
const PASSWORD = 'DemoVideo123';

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('captured', name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  // 1. Landing page
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await shot(page, '01-landing');

  // 2. Login page
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await shot(page, '02-login');

  // Sign up
  await page.getByText("Don't have an account?").scrollIntoViewIfNeeded().catch(() => {});
  await page.getByRole('button', { name: /create one/i }).click();
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
  await page.waitForTimeout(500);

  // 3. App home
  await shot(page, '03-app-home');

  // 4. Fill a scenario in coverage (tenancy/security deposit) and search
  await page.fill('textarea', 'My landlord in Pune is refusing to return my full security deposit even though I moved out two months ago and left the flat in good condition.');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/search\//, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot(page, '04-results');

  // 5. Open the first result's source (cards navigate via onClick, not <a>)
  const sourceCard = page.locator('.panel[style*="cursor: pointer"]').first();
  if (await sourceCard.count()) {
    await sourceCard.click();
    await page.waitForURL(/\/sources\//, { timeout: 15000 });
    await page.waitForTimeout(600);
    await shot(page, '05-source');

    // 6. Explanation
    const explainBtn = page.getByRole('button', { name: /explain/i }).first();
    if (await explainBtn.count()) {
      await explainBtn.click();
      await page.waitForURL(/\/explanations\//, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await shot(page, '06-explanation');
    }
  }

  await browser.close();
  console.log('done');
})();
