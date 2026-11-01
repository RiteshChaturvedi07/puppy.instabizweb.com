const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, '..', 'puppy.instabizweb.com', '_next', 'static', 'chunks');

const chunksToFetch = [
  '0cz1d0mv5g_q7.js',
  '0l31q30pdlxu0.js',
  '0rz6mxnug9go7.js',
  '0te0tivnjcmcm.js',
  '1r-q3nrxl-xzq.js',
  '37w5q0adtoy9q.js'
];

async function fetchChunk(chunkName) {
  const url = `https://puppy.instabizweb.com/_next/static/chunks/${chunkName}`;
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const content = await res.text();
  const filePath = path.join(CHUNKS_DIR, chunkName);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Saved ${chunkName} (${content.length} bytes) to ${filePath}`);
}

async function run() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  }
  for (const chunk of chunksToFetch) {
    try {
      await fetchChunk(chunk);
    } catch (err) {
      console.error(err.message);
    }
  }
  console.log('All missing chunks downloaded!');
}

run();

