async function verify() {
  const tests = [
    '/',
    '/puppies',
    '/puppies/maltipoo-max-male',
    '/happy-families',
    '/how-it-works',
    '/faq',
    '/contact',
    '/brand/logo.png',
    '/_next/image?url=%2Fbrand%2Flogo.png&w=128&q=75'
  ];
  let allOk = true;
  for (const t of tests) {
    try {
      const res = await fetch('http://localhost:3001' + t);
      const ct = res.headers.get('content-type');
      const buf = await res.arrayBuffer();
      console.log(t.padEnd(50), res.status, ct, `(${buf.byteLength} bytes)`);
      if (res.status !== 200 || buf.byteLength === 0) {
        allOk = false;
      }
    } catch (err) {
      console.error(t.padEnd(50), 'FAILED:', err.message);
      allOk = false;
    }
  }
  console.log('\n--- VERIFICATION RESULT ---');
  console.log(allOk ? 'SUCCESS: All routes, pages, and images are working perfectly!' : 'FAILURE: Some routes failed.');
}

verify();
