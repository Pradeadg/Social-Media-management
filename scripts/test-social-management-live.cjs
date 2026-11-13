// Read-only smoke tests against the local backend and a public example page.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scrapePublic } = require('../apps/backend/dist/apps/backend/src/social-management/smm.research.js');
const results = [];
async function check(name, fn) {
  try { await fn(); results.push({name,status:'PASS'}); }
  catch(error) { results.push({name,status:'FAIL',error:error.message}); process.exitCode=1; }
}
(async()=>{
  await check('Public HTML fetch works with Node 22 DNS pinning', async()=>{
    const page=await scrapePublic('https://example.com/');
    assert.ok(page.text.includes('Example Domain'));
    assert.ok(page.text.length>80);
    assert.ok(page.fetchedAt);
  });
  await check('Unauthenticated workspace request returns 401', async()=>{
    const response=await fetch('http://127.0.0.1:3000/social-management');assert.equal(response.status,401);
  });
  await check('Incorrect webhook verification token returns 403', async()=>{
    const response=await fetch('http://127.0.0.1:3000/social-management-webhook/meta?hub.mode=subscribe&hub.verify_token=test-invalid&hub.challenge=test');assert.equal(response.status,403);
  });
  await check('Invalid webhook signature returns 403', async()=>{
    const response=await fetch('http://127.0.0.1:3000/social-management-webhook/meta',{method:'POST',headers:{'Content-Type':'application/json','x-hub-signature-256':'sha256='+'0'.repeat(64)},body:'{}'});assert.equal(response.status,403);
  });
  const file=path.resolve(__dirname,'../../log-pengujian/social-management-live-tests.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({date:new Date().toISOString(),results},null,2));
  for(const r of results)console.log(`${r.status} ${r.name}${r.error?': '+r.error:''}`);
})();
