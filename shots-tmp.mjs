import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:4173/";
const OUT = "C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\shots";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 120000,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function settle(page) {
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 800));
}

// desktop full page + hero closeups
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await settle(page);
  await page.screenshot({ path: `${OUT}/desktop-hero.png` });
  await page.screenshot({ path: `${OUT}/desktop-full.png`, fullPage: true });

  // dark hero
  await page.click("#themeToggle");
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/desktop-hero-dark.png` });
  await page.click("#themeToggle");
  await new Promise((r) => setTimeout(r, 500));

  // gallery + lightbox
  await page.evaluate(() => document.getElementById("projects").scrollIntoView());
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/desktop-projects.png` });
  await page.evaluate(() => document.querySelector(".gallery__trigger").click());
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/desktop-lightbox.png` });
  await page.keyboard.press("Escape");

  // contact
  await page.evaluate(() => document.getElementById("contact").scrollIntoView());
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/desktop-contact.png` });

  // chat open
  await page.evaluate(() => document.getElementById("chatToggle").click());
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/desktop-chat.png` });
  await page.close();
}

// mobile
{
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await settle(page);
  await page.screenshot({ path: `${OUT}/mobile-hero.png` });
  await page.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true });
  await page.evaluate(() => document.getElementById("menuToggle").click());
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/mobile-menu.png` });
  await page.evaluate(() => document.getElementById("menuToggle").click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.getElementById("contact").scrollIntoView());
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/mobile-contact.png` });
  await page.close();
}

// tablet
{
  const page = await browser.newPage();
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await settle(page);
  await page.screenshot({ path: `${OUT}/tablet-hero.png` });
  await page.screenshot({ path: `${OUT}/tablet-full.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log("done");
