const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';

// Base directory to serve files from
const ROOT_DIR = __dirname;
const SITE_DIR = fs.existsSync(path.join(ROOT_DIR, 'puppy.instabizweb.com'))
  ? path.join(ROOT_DIR, 'puppy.instabizweb.com')
  : ROOT_DIR;

const CACHE_DIR = path.join(SITE_DIR, '_next_image_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// MIME types map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.rsc': 'text/x-component; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

// Helper to determine Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Handle HTTP range requests (for video streaming)
function serveFileWithRange(req, res, filePath, contentType) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      return res.end();
    }

    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// Handle Next.js image endpoint: /_next/image?url=...&w=...&q=...
async function handleNextImage(req, res, parsedUrl) {
  const fullReqUrl = req.url;
  const safeName = Buffer.from(fullReqUrl).toString('base64url') + '.webp';
  const cachedFilePath = path.join(CACHE_DIR, safeName);

  // 1. If already in disk cache, serve it immediately
  if (fs.existsSync(cachedFilePath)) {
    return serveFileWithRange(req, res, cachedFilePath, 'image/webp');
  }

  // 2. Check if the raw image exists locally in site directory
  const imageParam = parsedUrl.query.url;
  if (imageParam) {
    const decodedUrl = decodeURIComponent(imageParam);
    const localDirectPath = path.join(SITE_DIR, decodedUrl.replace(/^\//, ''));
    if (fs.existsSync(localDirectPath) && fs.statSync(localDirectPath).isFile()) {
      return serveFileWithRange(req, res, localDirectPath, getContentType(localDirectPath));
    }
  }

  // 3. Fallback: proxy fetch from the live origin and cache for offline use
  try {
    const remoteUrl = 'https://puppy.instabizweb.com' + fullReqUrl;
    console.log(`[Proxy] Fetching image from remote: ${remoteUrl}`);
    const remoteRes = await fetch(remoteUrl);
    if (remoteRes.ok) {
      const buffer = Buffer.from(await remoteRes.arrayBuffer());
      fs.writeFileSync(cachedFilePath, buffer);
      const cType = remoteRes.headers.get('content-type') || 'image/webp';
      res.writeHead(200, {
        'Content-Type': cType,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(buffer);
    }
  } catch (err) {
    console.warn(`[Warning] Could not fetch remote image for ${fullReqUrl}:`, err.message);
  }

  // 4. Fallback 1x1 transparent PNG if image not found
  const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': emptyPng.length
  });
  res.end(emptyPng);
}

// Main HTTP request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. Next.js image optimizer handler
  if (pathname === '/_next/image') {
    return handleNextImage(req, res, parsedUrl);
  }

  // Check if this is a Next.js client-side navigation (RSC) request
  const isRscRequest = req.headers['rsc'] === '1' || parsedUrl.query._rsc !== undefined || pathname.endsWith('.rsc');

  // Normalize path
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1);
  }

  // Handle explicit .rsc extension requests
  if (pathname.endsWith('.rsc')) {
    const rawRoute = pathname.slice(0, -4); // e.g. /puppies or /happy-families
    const candidateRsc1 = path.join(SITE_DIR, rawRoute.replace(/^\//, ''), 'page.rsc');
    const candidateRsc2 = path.join(SITE_DIR, rawRoute.replace(/^\//, '') + '.rsc');
    const candidateRsc3 = path.join(SITE_DIR, pathname.replace(/^\//, ''));
    if (fs.existsSync(candidateRsc1)) {
      return serveFileWithRange(req, res, candidateRsc1, MIME_TYPES['.rsc']);
    }
    if (fs.existsSync(candidateRsc2)) {
      return serveFileWithRange(req, res, candidateRsc2, MIME_TYPES['.rsc']);
    }
    if (fs.existsSync(candidateRsc3)) {
      return serveFileWithRange(req, res, candidateRsc3, MIME_TYPES['.rsc']);
    }
  }

  // 2. Try direct file match in SITE_DIR
  let directPath = path.join(SITE_DIR, pathname.replace(/^\//, ''));

  // If path is root
  if (pathname === '/' || pathname === '') {
    if (isRscRequest && fs.existsSync(path.join(SITE_DIR, 'index.rsc'))) {
      return serveFileWithRange(req, res, path.join(SITE_DIR, 'index.rsc'), MIME_TYPES['.rsc']);
    }
    const indexPath = path.join(SITE_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveFileWithRange(req, res, indexPath, 'text/html; charset=utf-8');
    }
  }

  // If it's a known page route (e.g. /puppies, /faq, /happy-families, /puppies/maltipoo-max-male)
  const dirOfRoute = path.join(SITE_DIR, pathname.replace(/^\//, ''));
  if (fs.existsSync(dirOfRoute) && fs.statSync(dirOfRoute).isDirectory()) {
    if (isRscRequest) {
      const rscFile = path.join(dirOfRoute, 'page.rsc');
      if (fs.existsSync(rscFile)) {
        return serveFileWithRange(req, res, rscFile, MIME_TYPES['.rsc']);
      }
    }
    const htmlFile = path.join(dirOfRoute, 'index.html');
    if (fs.existsSync(htmlFile)) {
      return serveFileWithRange(req, res, htmlFile, 'text/html; charset=utf-8');
    }
  }

  // If direct file exists and is a file
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return serveFileWithRange(req, res, directPath, getContentType(directPath));
  }

  // Also check if .html extension was omitted
  const htmlPathCandidate = directPath + '.html';
  if (fs.existsSync(htmlPathCandidate) && fs.statSync(htmlPathCandidate).isFile()) {
    if (isRscRequest) {
      const rscCandidate = directPath + '.rsc';
      if (fs.existsSync(rscCandidate)) {
        return serveFileWithRange(req, res, rscCandidate, MIME_TYPES['.rsc']);
      }
    }
    return serveFileWithRange(req, res, htmlPathCandidate, 'text/html; charset=utf-8');
  }

  // 3. Fallback proxy for any missing static asset (under _next, media, brand, cursor, etc.)
  if (pathname.startsWith('/_next/') || pathname.startsWith('/media/') || pathname.startsWith('/brand/') || pathname.startsWith('/cursor/')) {
    try {
      const remoteUrl = 'https://puppy.instabizweb.com' + req.url;
      console.log(`[Proxy Asset] Fetching missing asset from remote: ${remoteUrl}`);
      const remoteRes = await fetch(remoteUrl);
      if (remoteRes.ok) {
        const buffer = Buffer.from(await remoteRes.arrayBuffer());
        const targetDir = path.dirname(directPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(directPath, buffer);
        const cType = remoteRes.headers.get('content-type') || getContentType(directPath);
        res.writeHead(200, {
          'Content-Type': cType,
          'Content-Length': buffer.length,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(buffer);
      }
    } catch (err) {
      console.warn(`[Proxy Asset Error] ${pathname}:`, err.message);
    }
  }

  // 3. Fallback to homepage for SPA routing if HTML is requested
  const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (acceptsHtml) {
    const indexPath = path.join(SITE_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveFileWithRange(req, res, indexPath, 'text/html; charset=utf-8');
    }
  }

  // 4. 404 Not Found
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`404 Not Found: ${pathname}`);
});

// Try starting server, auto-incrementing port if busy
function startServer(port) {
  server.listen(port, HOST, () => {
    console.log('\n=============================================================');
    console.log(`🐾 TeddyPups U.A.E. is running locally!`);
    console.log(`🌐 Local URL: http://localhost:${port}/`);
    console.log(`📁 Serving from: ${SITE_DIR}`);
    console.log(`⚡ Zero setup required - all assets, pages, & images ready!`);
    console.log('=============================================================\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
