const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9225;

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

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--window-size=1400,900',
    '--user-data-dir=' + path.join(__dirname, '..', '.edge_tmp_detail')
  ]);

  try {
    const wsUrl = await getWsUrl();
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
    const target = await newTabRes.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
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
    await send('Runtime.enable');

    console.log('Navigating to http://localhost:3001/puppies/maltipoo-max-male');
    await send('Page.navigate', { url: 'http://localhost:3001/puppies/maltipoo-max-male' });
    await sleep(2500);

    const title = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
    console.log('Page Title:', title.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'test_puppy_detail.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved test_puppy_detail.png');
  } finally {
    edge.kill();
  }
}

run().catch(console.error);

