const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to copy real subpage index.html to root clean HTML files
const subpages = [
  'puppies',
  'happy-families',
  'how-it-works',
  'faq',
  'contact',
  'gone-home'
];

for (const sub of subpages) {
  const subIndex = path.join(ROOT_DIR, sub, 'index.html');
  const rootHtml = path.join(ROOT_DIR, `${sub}.html`);
  if (fs.existsSync(subIndex)) {
    // Copy sub/index.html to root sub.html so both /sub and /sub.html work out of the box
    fs.copyFileSync(subIndex, rootHtml);
    console.log(`Synced ${sub}/index.html -> ${sub}.html`);
  }
}

// Find all HTML files in project
function findHtmlFiles(dir) {
  let list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (['node_modules', '.git', 'scripts', '_next'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      list = list.concat(findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      list.push(full);
    }
  }
  return list;
}

const htmlFiles = findHtmlFiles(ROOT_DIR);
console.log(`Found ${htmlFiles.length} HTML files to clean and format.`);

// Function to clean telemetry, scraper URLs, next/image URLs
function cleanHtmlContent(content) {
  let cleaned = content;

  // 1. Remove Cloudflare insights & cdn-cgi script tags
  cleaned = cleaned.replace(/<script[^>]*static\.cloudflareinsights\.com[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*data-cf-beacon[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*email-decode\.min\.js[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*\/cdn-cgi\/[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Remove Cloudflare email protection
  cleaned = cleaned.replace(/\/cdn-cgi\/l\/email-protection#[a-zA-Z0-9]+/g, 'mailto:teddypupsadmin@gmail.com');
  cleaned = cleaned.replace(/<a[^>]*class=["'][^"']*__cf_email__[^"']*["'][^>]*>\[email&#160;protected\]<\/a>/g, 'teddypupsadmin@gmail.com');

  // 3. Replace scraper absolute domain with relative/root paths
  cleaned = cleaned.replace(/https?:\/\/puppy\.instabizweb\.com\//g, '/');
  cleaned = cleaned.replace(/https?:\/\/puppy\.instabizweb\.com/g, '');

  // 4. Clean up /_next/image URLs in src and srcset
  // Replace: /_next/image?url=%2Fbrand%2Flogo.png&amp;w=128&amp;q=75 -> /brand/logo.png
  // Replace: /_next/image?url=%2Fmedia%2F...&amp;w=... -> /media/...
  cleaned = cleaned.replace(/\/_next\/image\?url=([^"'\s>]+)/gi, (match, queryPart) => {
    const rawUrl = queryPart.split(/&amp;|&/)[0];
    let decoded = decodeURIComponent(rawUrl);
    // Remove any trailing query artifacts
    decoded = decoded.replace(/&amp;.*$/, '').replace(/&.*$/, '');
    return decoded;
  });

  // Also clean any leftover &amp;w=... or &w=... on media/brand URLs
  cleaned = cleaned.replace(/(\/(?:media|brand)\/[^"'\s>]+?)(?:&amp;|&)w=\d+[^"'\s>]*/gi, '$1');

  // Also clean srcset and srcSet attributes with /_next/image
  cleaned = cleaned.replace(/(srcSet|srcset)=["']([^"']+)["']/gi, (match, attrName, srcsetValue) => {
    const cleanedSrcset = srcsetValue.split(',').map(entry => {
      const parts = entry.trim().split(/\s+/);
      let url = parts[0];
      if (url.includes('/_next/image?url=')) {
        const urlMatch = url.match(/url=(%2F[^&]+)/);
        if (urlMatch) {
          url = decodeURIComponent(urlMatch[1]);
        }
      }
      return parts.length > 1 ? `${url} ${parts[1]}` : url;
    }).join(', ');
    return `${attrName}="${cleanedSrcset}"`;
  });

  // 5. Ensure main.js script is included before </body>
  if (!cleaned.includes('/assets/js/main.js')) {
    cleaned = cleaned.replace('</body>', '  <script src="/assets/js/main.js" defer></script>\n</body>');
  }

  return cleaned;
}

// Function to format HTML with clean indentation
function formatHtml(html) {
  let formatted = '';
  let indent = 0;
  const tab = '  ';

  // Normalize lines around tags
  const tokens = html
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Comment
    if (token.startsWith('<!--')) {
      formatted += tab.repeat(indent) + token + '\n';
      continue;
    }

    // Closing tag
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + token + '\n';
      continue;
    }

    // Opening tag
    if (token.startsWith('<')) {
      const tagMatch = token.match(/^<([a-zA-Z0-9_\-]+)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
      const isSelfClosing = token.endsWith('/>') || voidTags.has(tagName);

      formatted += tab.repeat(indent) + token + '\n';

      if (!isSelfClosing && tagName) {
        indent++;
      }
      continue;
    }

    // Text content
    formatted += tab.repeat(indent) + token + '\n';
  }

  return formatted.trim() + '\n';
}

for (const file of htmlFiles) {
  console.log(`Processing: ${path.relative(ROOT_DIR, file)}`);
  const raw = fs.readFileSync(file, 'utf8');
  const cleaned = cleanHtmlContent(raw);
  const formatted = formatHtml(cleaned);
  fs.writeFileSync(file, formatted, 'utf8');
}

console.log('All HTML files cleaned and formatted successfully!');
