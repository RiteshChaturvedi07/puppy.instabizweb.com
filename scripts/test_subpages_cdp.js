const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch (e) {}
    await sleep(300);
  }
  throw new Error('Could not connect to Edge DevTools');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.consoleLogs = [];
    this.networkRequests = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
          console.log(`[Browser Console ${msg.params.type}]`, text);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error(`[Browser Exception]`, msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || '');
        } else if (msg.method === 'Network.responseReceived') {
          const { url, status, mimeType } = msg.params.response;
          this.networkRequests.push({ url, status, mimeType });
          if (status >= 400) {
            console.warn(`[Network ${status}] ${url}`);
          }
        }
      }
    };
  }

  async ready() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
    });
  }

  async send(method, params = {}) {
    await this.ready();
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text} - ${JSON.stringify(res.exceptionDetails.exception)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async captureScreenshot(outPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot to ${outPath}`);
  }
}

async function run() {
  console.log('Launching Edge headless...');
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1400,900',
    '--user-data-dir=' + path.join(__dirname, '..', '.edge_test_profile')
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to Edge DevTools:', wsUrl);

    // Create a new target/page
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
    const target = await newTabRes.json();
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    console.log('\n--- 1. Testing /puppies direct load ---');
    await client.send('Page.navigate', { url: 'http://localhost:3001/puppies' });
    await sleep(3000);

    const title = await client.eval('document.title');
    console.log('Page Title:', title);

    const puppiesCount = await client.eval(`
      document.querySelectorAll('a[href*="/puppies/"]').length
    `);
    console.log('Puppy cards count found:', puppiesCount);

    const filterPills = await client.eval(`
      Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean)
    `);
    console.log('Buttons/Pills found:', filterPills);

    await client.captureScreenshot(path.join(__dirname, 'test_puppies_page.png'));

    // Test clicking a filter button, e.g., "Maltipoo"
    console.log('\n--- 2. Testing clicking filter button "Maltipoo" ---');
    const clickedMaltipoo = await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Maltipoo');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked Maltipoo button:', clickedMaltipoo);
    await sleep(1500);

    const maltipooCount = await client.eval(`
      document.querySelectorAll('a[href*="/puppies/"]').length
    `);
    console.log('Puppy cards count after filtering Maltipoo:', maltipooCount);
    await client.captureScreenshot(path.join(__dirname, 'test_puppies_filtered.png'));

    // Test navigation: click "Happy families" in navbar
    console.log('\n--- 3. Testing client-side navigation to "Happy families" ---');
    const clickedNav = await client.eval(`
      (() => {
        const link = Array.from(document.querySelectorAll('nav a, header a')).find(a => a.textContent.includes('Happy families'));
        if (link) {
          link.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked Happy families nav link:', clickedNav);

    // Check curtain state over the next 2.5 seconds
    for (let i = 0; i < 5; i++) {
      await sleep(500);
      const curtainState = await client.eval(`
        (() => {
          const curtain = document.querySelector('[data-state], .tp-curtain, [class*="curtain"]');
          return curtain ? {
            className: curtain.className,
            dataState: curtain.getAttribute('data-state'),
            style: curtain.getAttribute('style')
          } : 'no curtain found';
        })()
      `);
      console.log(`T+${(i+1)*0.5}s Curtain State:`, curtainState);
    }

    const currentUrl = await client.eval('window.location.href');
    console.log('Current URL after navigation:', currentUrl);
    await client.captureScreenshot(path.join(__dirname, 'test_happy_families.png'));

    // Test /how-it-works
    console.log('\n--- 4. Testing /how-it-works direct load ---');
    await client.send('Page.navigate', { url: 'http://localhost:3001/how-it-works' });
    await sleep(2000);
    await client.captureScreenshot(path.join(__dirname, 'test_how_it_works.png'));

    // Test /faq
    console.log('\n--- 5. Testing /faq direct load & accordions ---');
    await client.send('Page.navigate', { url: 'http://localhost:3001/faq' });
    await sleep(2000);
    const faqQuestions = await client.eval(`
      Array.from(document.querySelectorAll('button, summary, [role="button"]'))
        .map(el => el.textContent.trim())
        .filter(t => t.includes('?'))
    `);
    console.log('FAQ questions found:', faqQuestions);

    const accordionClicked = await client.eval(`
      (() => {
        const item = document.querySelector('button, [role="button"], summary');
        if (item) {
          item.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked FAQ accordion:', accordionClicked);
    await sleep(1000);
    await client.captureScreenshot(path.join(__dirname, 'test_faq.png'));

    // Test /contact
    console.log('\n--- 6. Testing /contact direct load ---');
    await client.send('Page.navigate', { url: 'http://localhost:3001/contact' });
    await sleep(2000);
    await client.captureScreenshot(path.join(__dirname, 'test_contact.png'));

    console.log('\n=== Summary of network 404s ===');
    const errors = client.networkRequests.filter(r => r.status >= 400);
    console.log(`Total HTTP errors: ${errors.length}`);
    errors.forEach(e => console.log(`  [${e.status}] ${e.url}`));

  } finally {
    edge.kill();
  }
}

run().catch(console.error);

