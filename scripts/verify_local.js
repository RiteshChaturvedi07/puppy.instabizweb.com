async function verify() {
  const tests = [
    '/',
    '/index.html',
    '/puppies',
    '/puppies.html',
    '/puppies/index.html',
    '/puppies/maltipoo-max-male',
    '/puppies/maltipoo-max-male/index.html',
    '/happy-families',
    '/happy-families.html',
    '/how-it-works',
    '/how-it-works.html',
    '/faq',
    '/faq.html',
    '/contact',
    '/contact.html',
    '/gone-home',
    '/gone-home.html',
    '/assets/js/main.js',
    '/brand/logo.png',
    '/_next/static/chunks/2gh-2btcjgkih.css'
  ];

  let allOk = true;
  for (const t of tests) {
    try {
      const res = await fetch('http://localhost:3001' + t);
      const ct = res.headers.get('content-type');
      const buf = await res.arrayBuffer();
      console.log(t.padEnd(45), res.status, ct, `(${buf.byteLength} bytes)`);
      if (res.status !== 200 || buf.byteLength === 0) {
        allOk = false;
      }
    } catch (err) {
      console.error(t.padEnd(45), 'FAILED:', err.message);
      allOk = false;
    }
  }

  console.log('\n--- VERIFICATION RESULT ---');
  console.log(allOk ? 'SUCCESS: All routes, pages, assets, and scripts are working perfectly!' : 'FAILURE: Some routes failed.');
}

verify();
