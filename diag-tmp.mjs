import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
await page.goto("http://localhost:4173/", { waitUntil: "networkidle0" });

const out = await page.evaluate(() => {
  const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const bgDesc = (el) => {
    const res = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
        res.push((n.tagName + "." + (n.className && n.className.split ? n.className.split(" ")[0] : "") + "=" + cs.backgroundColor));
      }
      n = n.parentElement;
    }
    return res.join(" < ") + " | body=" + getComputedStyle(document.body).backgroundColor;
  };

  const fails = [];
  document.querySelectorAll("p, a, li, h1, h2, h3, h4, span, button, label, small").forEach((el) => {
    if (!el.textContent.trim() || el.children.length > 0) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const cs = getComputedStyle(el);
    const text = el.textContent.trim().slice(0, 30);
    if (/Book a Site Visit/.test(text) || el.className === "eyebrow" || /eyebrow/.test(el.className) || /contact__label/.test(el.className)) {
      fails.push({
        text,
        tag: el.tagName,
        cls: el.className,
        color: cs.color,
        size: cs.fontSize,
        bgChain: bgDesc(el),
        inHeader: !!el.closest(".site-header"),
        headerSolid: el.closest(".site-header") ? el.closest(".site-header").classList.contains("is-solid") : null,
      });
    }
  });

  // anchors with no class
  const plain = Array.from(document.querySelectorAll("a"))
    .filter((a) => !a.className)
    .map((a) => {
      const r = a.getBoundingClientRect();
      return {
        href: a.getAttribute("href"),
        text: a.textContent.trim().slice(0, 30),
        w: Math.round(r.width),
        h: Math.round(r.height),
        parent: a.parentElement.tagName + "." + a.parentElement.className,
      };
    });

  return { fails, plain };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
