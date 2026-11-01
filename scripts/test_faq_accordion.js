const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9224;

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

async function test() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--window-size=1400,900',
    '--user-data-dir=' + path.join(__dirname, '..', '.edge_tmp_faq')
  ]);

  try {
    const wsUrl = await getWsUrl();
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
    const t = await newTabRes.json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(m, p = {}) {
      return new Promise(r => {
        const curId = id++;
        const onMsg = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === curId) {
            ws.removeEventListener('message', onMsg);
            r(d.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: curId, method: m, params: p }));
      });
    }

    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:3001/faq' });
    await sleep(2500);

    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'faq_initial.png'), Buffer.from(shot1.data, 'base64'));

    const elements = await send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent && el.textContent.includes('Are your puppies vaccinated'))
          .map(el => ({ tag: el.tagName, className: el.className }))
      `,
      returnByValue: true
    });
    console.log('Vaccinated elements:', elements.result.value);

    // Click the question element
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const els = Array.from(document.querySelectorAll('*')).filter(el => el.textContent && el.textContent.includes('Are your puppies vaccinated'));
          // Find the most specific clickable or leaf element
          const target = els[els.length - 1];
          if (target) target.click();
        })()
      `
    });

    await sleep(1000);
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'faq_after_click.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Done test_faq_accordion!');
  } finally {
    edge.kill();
  }
}

test().catch(console.error);
