// End-to-end smoke test using the system Chrome. Run the app on :3000 first
// (`npm run build && npm run start`), then `npm run e2e`.
// Covers: dashboard stats, a cloud extraction, the on-device download gate +
// a real in-browser extraction, history persistence, a 2-model comparison,
// mobile overflow, and the theme toggle.
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.setDefaultTimeout(60_000);
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("favicon")) errors.push(`console: ${m.text().slice(0, 200)}`);
});

async function clickByText(selector, text) {
  const handle = await page.evaluateHandle(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent?.includes(t)),
    selector, text
  );
  const el = handle.asElement();
  if (!el) throw new Error(`No ${selector} containing "${text}"`);
  await el.click();
  return el;
}
async function waitForText(text, timeout = 60_000) {
  await page.waitForFunction(
    (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    { timeout }, text
  );
}

console.log("1. Dashboard loads with real stats...");
await page.goto(BASE, { waitUntil: "networkidle2" });
await waitForText("Cloud models");
await waitForText("Quickstart");
console.log("   OK");

console.log("2. Workspace: load sample, run on GPT-OSS 20B (cloud)...");
await page.goto(`${BASE}/chat`, { waitUntil: "networkidle2" });
await sleep(2500);
// Explicitly select the cloud model via the rail picker (real pointer events)
const railTrigger = await page.$('aside [aria-haspopup="menu"]');
await railTrigger.click();
await sleep(600);
await clickByText('[role="menuitem"]', "GPT-OSS 20B");
await sleep(600);
await clickByText("button", "Load a sample");
await sleep(400);
await clickByText('[role="menuitem"]', "Cough & fever visit");
await sleep(400);
// Run (Cmd+Enter path also exists; click the button)
await clickByText("button", "Run");
console.log("   waiting for findings (cloud)...");
await waitForText("saved to history", 90_000);
await waitForText("Diagnoses");
console.log("   OK — cloud extraction completed and persisted");

console.log("3. WebGPU availability in this headless Chrome:");
const gpu = await page.evaluate(async () => {
  if (!navigator.gpu) return "no navigator.gpu";
  try { const a = await navigator.gpu.requestAdapter(); return a ? "adapter OK" : "no adapter"; }
  catch (e) { return "error: " + e.message; }
});
console.log("   " + gpu);

console.log("4. On-device model: select SmolLM2 135M, run with gate...");
// Open model picker (desktop rail trigger shows current model name)
const railTrigger2 = await page.$('aside [aria-haspopup="menu"]');
await railTrigger2.click();
await sleep(500);
await clickByText('[role="menuitem"]', "SmolLM2 135M");
await sleep(500);
await clickByText("button", "Run");
await sleep(800);
// Spec gate should appear
await waitForText("Run SmolLM2 135M on this device");
console.log("   gate dialog shown with specs");
await clickByText("button", "Download");
console.log("   downloading + preparing (this takes a while)...");
await page.waitForFunction(
  () => {
    const t = document.body.innerText;
    return t.includes("saved to history") || t.includes("This run didn't finish");
  },
  { timeout: 360_000 }
);
const failed = await page.evaluate(() => document.body.innerText.includes("This run didn't finish"));
console.log(failed ? "   DEVICE RUN FAILED (error panel shown)" : "   OK — on-device extraction completed");
if (failed) {
  const msg = await page.evaluate(() => document.body.innerText.split("This run didn't finish")[1]?.slice(0, 300));
  console.log("   error:", msg);
}

console.log("5. History shows persisted runs...");
await page.goto(`${BASE}/history`, { waitUntil: "networkidle2" });
await waitForText("GPT-OSS 20B");
console.log("   OK — history lists the cloud run");



console.log("6. Compare: two cloud models on a sample...");
await page.goto(`${BASE}/compare`, { waitUntil: "networkidle2" });
await sleep(2500);
// Default seed = first two online cloud models. The shared input may already
// hold the sample from step 2; load one only if it's empty.
const inputEmpty = await page.evaluate(
  () => !document.querySelector("textarea")?.value?.trim()
);
if (inputEmpty) {
  await clickByText("button", "Load a sample");
  await sleep(500);
}
// Wait until the Run button is actually enabled (models seeded + input set)
await page.waitForFunction(() => {
  const b = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Run on all models"));
  return b && !b.disabled;
}, { timeout: 30_000 });
await clickByText("button", "Run on all models");
await page.waitForFunction(
  () => {
    const t = document.body.innerText.toLowerCase();
    return t.includes("fastest:") || t.includes("didn't finish");
  },
  { timeout: 120_000 }
);
const sum = await page.evaluate(() => {
  const t = document.body.innerText;
  const i = t.toLowerCase().indexOf("leaders");
  return t.slice(i, i + 160).replace(/\n+/g, " | ");
});
console.log("   " + sum);

console.log("7. Mobile (375px) horizontal overflow check...");
await page.setViewport({ width: 375, height: 720 });
for (const p of ["/", "/chat", "/compare", "/models", "/history"]) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle2" });
  await sleep(1200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`   ${p}: overflow ${overflow}px ${overflow > 2 ? "⚠️" : "OK"}`);
}

console.log("8. Dark mode toggle...");
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await sleep(800);
const before = await page.evaluate(() => document.documentElement.classList.contains("dark"));
await page.click('button[aria-label*="dark mode"], button[aria-label*="light mode"]');
await sleep(400);
const after = await page.evaluate(() => document.documentElement.classList.contains("dark"));
console.log(`   dark class: ${before} -> ${after} ${before !== after ? "OK" : "⚠️"}`);


console.log("\nPage errors:", errors.length ? errors.slice(0, 8) : "none");
await browser.close();
process.exit(failed ? 1 : 0);
