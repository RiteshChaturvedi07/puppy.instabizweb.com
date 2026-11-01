const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.resolve('puppy.instabizweb.com/_next/static/chunks');
const BASE_URL = 'https://puppy.instabizweb.com/_next/static/chunks';

async function fixChunks() {
  const files = fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.js'));
  console.log(`Found ${files.length} JavaScript chunk files to restore.`);

  for (const file of files) {
    const url = `${BASE_URL}/${file}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[WARN] Failed to fetch ${url} (status: ${res.status})`);
        continue;
      }
      const code = await res.text();
      const targetPath = path.join(CHUNKS_DIR, file);
      fs.writeFileSync(targetPath, code, 'utf8');
      console.log(`[OK] Restored pristine chunk: ${file} (${code.length} bytes)`);
    } catch (err) {
      console.error(`[ERROR] Failed to download ${file}:`, err.message);
    }
  }

  console.log('\nAll JS chunks restored from pristine source!');
}

fixChunks();

