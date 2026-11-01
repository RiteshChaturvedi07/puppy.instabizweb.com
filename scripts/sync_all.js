const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://puppy.instabizweb.com';
const ROOT_DIR = path.resolve(__dirname, '..');
const SITE_DIR = fs.existsSync(path.join(ROOT_DIR, 'puppy.instabizweb.com'))
  ? path.join(ROOT_DIR, 'puppy.instabizweb.com')
  : ROOT_DIR;

const PAGES = [
  '/',
  '/puppies',
  '/happy-families',
  '/how-it-works',
  '/faq',
  '/contact',
  '/gone-home'
];

const PUPPY_SLUGS = [
  '/puppies/maltipoo-max-male',
  '/puppies/korean-teacup-maltipoo-female',
  '/puppies/korean-teacup-poodle-female',
  '/puppies/maltipoo-cavapoo-male',
  '/puppies/toy-poodle-male-female',
  '/puppies/maltipoo-female-2',
  '/puppies/pomeranian-female',
  '/puppies/copper-male',
  '/puppies/shitzu-female',
  '/puppies/shitzu-male',
  '/puppies/maltipoo-female-1',
  '/puppies/maltipoo-female',
  '/puppies/korean-teacup-pomeranian-1',
  '/puppies/korean-teacup-pomeranian',
  '/puppies/korean-teacup-pomeranian-male',
  '/puppies/pomeranian-ace-boy',
  '/puppies/poodle-leo-male',
  '/puppies/maltipoo-mia-girl',
  '/puppies/maltipoo-sadie-girl',
  '/puppies/blue-marle-pomeranian'
];

const STATIC_ASSETS = [
  '/brand/logo.png',
  '/icon.png',
  '/cursor/paw.svg',
  '/cursor/paw-press.svg',
  '/media/dSAUmXs8Qai9/ef39cbea20/27b888_323008bb0f6a41d4bde2a0da7206cd98-720p.mp4'
];

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function downloadFile(urlPath, targetLocalPath, headers = {}) {
  try {
    ensureDir(path.dirname(targetLocalPath));
    const fullUrl = BASE_URL + urlPath;
    const res = await fetch(fullUrl, { headers });
    if (!res.ok) {
      console.warn(`[WARN] ${res.status} for ${fullUrl}`);
      return false;
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(targetLocalPath, Buffer.from(arrayBuffer));
    console.log(`[OK] Downloaded: ${urlPath} -> ${targetLocalPath} (${arrayBuffer.byteLength} bytes)`);
    return true;
  } catch (err) {
    console.error(`[ERROR] Failed to download ${urlPath}:`, err.message);
    return false;
  }
}

async function syncPages() {
  console.log('--- 1. SYNCING HTML & RSC FOR MAIN PAGES ---');
  for (const page of PAGES) {
    const pageSubdir = page === '/' ? '' : page.replace(/^\//, '');
    const htmlTarget = page === '/' 
      ? path.join(SITE_DIR, 'index.html') 
      : path.join(SITE_DIR, pageSubdir, 'index.html');
    const rscTarget = page === '/'
      ? path.join(SITE_DIR, 'index.rsc')
      : path.join(SITE_DIR, pageSubdir, 'page.rsc');

    // Download full HTML (standard browser Accept)
    await downloadFile(page, htmlTarget, {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    // Download RSC Payload (Next.js client navigation)
    await downloadFile(page, rscTarget, {
      'rsc': '1',
      'next-router-prefetch': '1',
      'accept': 'text/x-component'
    });
  }

  console.log('\n--- 2. SYNCING PUPPY DETAIL PAGES ---');
  for (const slug of PUPPY_SLUGS) {
    const subPath = slug.replace(/^\//, '');
    const htmlTarget = path.join(SITE_DIR, subPath, 'index.html');
    const rscTarget = path.join(SITE_DIR, subPath, 'page.rsc');

    await downloadFile(slug, htmlTarget, {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });
    await downloadFile(slug, rscTarget, {
      'rsc': '1',
      'next-router-prefetch': '1',
      'accept': 'text/x-component'
    });
  }

  console.log('\n--- 3. SYNCING STATIC ASSETS ---');
  for (const asset of STATIC_ASSETS) {
    const target = path.join(SITE_DIR, asset.replace(/^\//, ''));
    if (!fs.existsSync(target)) {
      await downloadFile(asset, target);
    } else {
      console.log(`[SKIP] Already exists: ${asset}`);
    }
  }

  console.log('\n--- 4. EXTRACTING & PRE-CACHING IMAGES ---');
  const cacheDir = path.join(SITE_DIR, '_next_image_cache');
  ensureDir(cacheDir);

  // Scan all HTML files for /_next/image?url=...
  const allImageUrls = new Set();
  function scanDir(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (item !== 'node_modules' && item !== '_next_image_cache') {
          scanDir(full);
        }
      } else if (item.endsWith('.html') || item.endsWith('.rsc') || item.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        const matches = content.match(/\/_next\/image\?[^"'\s<>)]+/g) || [];
        for (const m of matches) {
          const clean = m.replace(/&amp;/g, '&');
          allImageUrls.add(clean);
        }
      }
    }
  }

  scanDir(SITE_DIR);
  console.log(`Found ${allImageUrls.size} unique Next.js image queries across the project.`);

  let imgCount = 0;
  for (const imgUrl of allImageUrls) {
    // Generate cache filename from query string
    const safeName = Buffer.from(imgUrl).toString('base64url') + '.webp';
    const cacheFile = path.join(cacheDir, safeName);
    if (!fs.existsSync(cacheFile)) {
      const ok = await downloadFile(imgUrl, cacheFile);
      if (ok) imgCount++;
    }
  }
  console.log(`Pre-cached ${imgCount} new images to ${cacheDir}`);
  console.log('\n=== ALL ASSETS SYNCED SUCCESSFULLY! ===');
}

syncPages().catch(console.error);
