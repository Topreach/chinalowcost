const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {config}=require('../config.cjs');
const {Store,digest}=require('../store.cjs');
const {Auth,totp,passwordMatches}=require('../auth.cjs');
const {createServer}=require('../server.cjs');
const {Files}=require('../files.cjs');
const {spawnSync}=require('node:child_process');
async function fixture(t,options={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clc-security-'));
  const settings=config({DATABASE_FILE:path.join(dir,'app.sqlite'),UPLOAD_DIRECTORY:path.join(dir,'files'),APP_ENCRYPTION_KEY:'ab'.repeat(32),...(options.scanner?{CLAMSCAN_PATH:'mock-scanner'}:{})});
  const store=new Store(settings.file),auth=new Auth(store,settings),mail=[];
  const mailer={send:async message=>{mail.push(message);return {accepted:[message.to],messageId:'test'};}};
  const password='Long unique password 2026!';
  const customer=await auth.create('a@example.test',password,'customer',true),other=await auth.create('b@example.test',password,'customer',true);
  const order=store.approve({id:'ORDER-A',email:customer.email,amountKobo:10000});
  const server=createServer(settings,store,async()=>{throw Error('Unexpected provider call');},mailer,options.scan);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();fs.rmSync(dir,{recursive:true,force:true});});
  const session=user=>auth.issue(user,user.mfa_enabled===1);
  const call=(route,{method='GET',body,session:s,headers={}}={})=>fetch(base+route,{method,headers:{...(method==='POST'?{Origin:settings.appUrl,'Content-Type':'application/json'}:{}),...(s?{Cookie:'clc_session='+s.token,'X-CSRF-Token':s.csrf}:{}),...headers},...(body!==undefined?{body:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body)}:{})});
  return {dir,settings,store,auth,customer,other,order,server,base,password,mail,session,call};
}
test('server passwords are salted scrypt hashes; sessions and checkout tokens are stored as hashes',async t=>{
  const f=await fixture(t);assert(!f.customer.password.includes(f.password));assert.notEqual(f.customer.password,f.other.password);assert(await passwordMatches(f.password,f.customer.password));
  const s=f.session(f.customer),row=f.store.db.prepare('SELECT * FROM sessions').get();assert.equal(row.hash,digest(s.token));assert(!JSON.stringify(row).includes(s.token));
  const orderRow=f.store.db.prepare('SELECT * FROM orders').get();assert(!JSON.stringify(orderRow).includes(f.order.token));assert.equal(orderRow.token_hash,digest(f.order.token));
});
test('HTTP login sets HttpOnly SameSite cookie and does not return bearer session token',async t=>{
  const f=await fixture(t);const response=await f.call('/api/auth/login',{method:'POST',body:{email:f.customer.email,password:f.password}});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert(cookie.includes('HttpOnly'));assert(cookie.includes('SameSite=Strict'));const data=await response.json();assert(data.csrf);assert(!data.token);assert(!data.user.password);
  assert.equal((await f.call('/api/auth/login',{method:'POST',body:{email:f.customer.email,password:'wrong'}})).status,401);
});
test('unauthenticated access, CSRF bypass and wrong customer access are denied',async t=>{
  const f=await fixture(t);assert.equal((await f.call('/api/orders')).status,401);
  const own=f.session(f.customer),other=f.session(f.other);
  const list=await(await f.call('/api/orders',{session:other})).json();assert.deepEqual(list.orders,[]);
  assert.equal((await f.call('/api/paystack/verify',{method:'POST',session:other,body:{token:f.order.token}})).status,404);
  assert.equal((await f.call('/api/paystack/verify',{method:'POST',session:own,headers:{'X-CSRF-Token':'wrong'},body:{orderId:f.order.id}})).status,403);
  assert.equal((await f.call('/api/paystack/verify',{method:'POST',session:own,headers:{Origin:'https://evil.test'},body:{orderId:f.order.id}})).status,403);
  assert.equal((await f.call('/api/admin/users',{session:own})).status,403);
});
test('administrator without enrolled MFA can access APIs; enabling MFA revokes old sessions and rejects OTP replay',async t=>{
  const f=await fixture(t);const user=await f.auth.create('admin@example.test',f.password,'admin',true),pending=f.auth.issue(user);
  assert.equal((await f.call('/api/admin/users',{session:pending})).status,200);
  const enrollment=await(await f.call('/api/auth/mfa/enroll',{method:'POST',session:pending,body:{password:f.password}})).json();assert(enrollment.secret);assert(!f.auth.user(user.id).mfa_secret.includes(enrollment.secret));
  const code=totp(enrollment.secret),response=await f.call('/api/auth/mfa/confirm',{method:'POST',session:pending,body:{otp:code}});assert.equal(response.status,200);
  const result=await response.json(),cookie=response.headers.get('set-cookie').split(';')[0],token=cookie.split('=')[1];const elevated={token,csrf:result.csrf};
  assert.equal((await f.call('/api/admin/users',{session:elevated})).status,200);
  assert.equal((await f.call('/api/orders',{session:pending})).status,401);
  assert.equal(await f.auth.login(user.email,f.password,code),null);assert.equal(await f.auth.login(user.email,f.password),null);
  assert.equal(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',1),'287082');
});
test('password change invalidates all sessions; logout and inactivity expire sessions',async t=>{
  const f=await fixture(t),one=f.session(f.customer),two=f.session(f.customer);
  assert.equal((await f.call('/api/auth/password',{method:'POST',session:one,body:{current:f.password,password:'Another long unique password 2026!'}})).status,200);
  assert.equal((await f.call('/api/orders',{session:two})).status,401);
  const idle=f.session(f.other);f.store.db.prepare('UPDATE sessions SET seen=? WHERE hash=?').run(Date.now()-1800001,digest(idle.token));assert.equal((await f.call('/api/orders',{session:idle})).status,401);
  const out=f.session(f.other);assert.equal((await f.call('/api/auth/logout',{method:'POST',session:out,body:{}})).status,200);assert.equal((await f.call('/api/orders',{session:out})).status,401);
});
test('single-use expiring reset links preserve MFA and revoke existing sessions',async t=>{
  const f=await fixture(t),s=f.session(f.customer);const secret=f.auth.enroll(f.customer);f.auth.db.prepare('UPDATE users SET mfa_enabled=1 WHERE id=?').run(f.customer.id);
  const token=f.auth.challenge(f.customer,'reset');assert(!JSON.stringify(f.store.db.prepare('SELECT * FROM challenges').get()).includes(token));
  assert(await f.auth.consumeChallenge(token,'reset','A new reset password 2026!'));assert.equal(await f.auth.consumeChallenge(token,'reset','A new reset password 2026!'),false);assert.equal(f.auth.user(f.customer.id).mfa_enabled,1);assert.equal(f.auth.decrypt(f.auth.user(f.customer.id).mfa_secret),secret);assert.equal((await f.call('/api/orders',{session:s})).status,401);
  const expired=f.auth.challenge(f.other,'reset');f.store.db.prepare('UPDATE challenges SET expires=0').run();assert.equal(await f.auth.consumeChallenge(expired,'reset','A new reset password 2026!'),false);
});
test('registration cannot choose staff role and email verification is required',async t=>{
  const f=await fixture(t);const response=await f.call('/api/auth/register',{method:'POST',body:{email:'new@example.test',password:f.password,role:'admin'}});assert.equal(response.status,202);assert.equal(f.mail.length,1);
  const user=f.store.db.prepare('SELECT * FROM users WHERE email=?').get('new@example.test');assert.equal(user.role,'customer');assert.equal(user.verified,0);assert.equal(await f.auth.login(user.email,f.password),null);
  const token=f.mail[0].text.match(/#verify=([a-f0-9]{64})/)[1];assert(await f.auth.consumeChallenge(token,'verify'));assert(await f.auth.login(user.email,f.password));
});
test('admin approval uses stored customer identity; revocation and suspension remove access',async t=>{
  const f=await fixture(t);let admin=await f.auth.create('admin@example.test',f.password,'admin',true);f.store.db.prepare('UPDATE users SET mfa_enabled=1 WHERE id=?').run(admin.id);admin=f.auth.user(admin.id);const s=f.session(admin);
  const response=await f.call('/api/admin/orders',{method:'POST',session:s,body:{id:'ORDER-B',customerId:f.customer.id,amountKobo:12000,email:f.other.email}});assert.equal(response.status,201);assert.equal(f.store.byId('ORDER-B').email,f.customer.email);
  const owner=f.session(f.customer);assert.equal((await f.call('/api/admin/orders/revoke',{method:'POST',session:s,body:{orderId:'ORDER-B'}})).status,200);
  assert.equal((await f.call('/api/paystack/initialize',{method:'POST',session:owner,body:{orderId:'ORDER-B'}})).status,404);
  assert.equal((await f.call('/api/admin/users/status',{method:'POST',session:s,body:{userId:f.customer.id,active:false}})).status,200);
  assert.equal((await f.call('/api/orders',{session:owner})).status,401);assert.equal(await f.auth.login(f.customer.email,f.password),null);
});
test('security headers forbid inline scripts and framing; sensitive files are not served',async t=>{
  const f=await fixture(t),response=await f.call('/secure');const csp=response.headers.get('content-security-policy');assert(csp.includes("script-src 'self'"));assert(!csp.includes('unsafe-inline'));assert.equal(response.headers.get('x-frame-options'),'DENY');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  for(const route of ['/.env','/backend/config.cjs','/data/app.sqlite','/api/files/../../.env'])assert.notEqual((await f.call(route)).status,200);
  const legacy=await f.call('/prototype');assert(legacy.headers.get('content-security-policy').includes('sandbox allow-scripts'));assert(legacy.headers.get('content-security-policy').includes("connect-src 'none'"));
});
test('original interface integration isolates inline prototype code from server credentials',async t=>{
  const f=await fixture(t),host=await f.call('/application');assert.equal(host.status,200);
  const html=await host.text();assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));
  assert(host.headers.get('content-security-policy').includes("script-src 'self'"));
  const frame=await f.call('/application/frame');assert.equal(frame.status,200);
  const policy=frame.headers.get('content-security-policy');assert(policy.includes('sandbox allow-scripts'));assert(policy.includes("connect-src 'none'"));assert(policy.includes("frame-ancestors 'self'"));
  assert((await frame.text()).includes('connectedRequest'));
});
test('business APIs require sessions, CSRF and roles while public catalog excludes drafts and private costs',async t=>{
  const f=await fixture(t),s=f.session(f.customer);
  assert.equal((await f.call('/api/business/snapshot')).status,401);
  assert.equal((await f.call('/api/business/cart',{method:'POST',body:{action:'clear',revision:0},session:s,headers:{'X-CSRF-Token':'forged'}})).status,403);
  assert.equal((await f.call('/api/business/staff',{method:'POST',body:{},session:s})).status,403);
  assert.equal((await f.call('/api/business/cart',{method:'POST',body:{action:'clear',revision:0},session:s})).status,200);
  const p={id:'b'.repeat(32),sku:'DRAFT-1',title:'Private draft',description:'',category:'Electronics',status:'draft',costKobo:123456,sources:['private supplier'],retailKobo:100000,wholesaleKobo:90000,moq:1,stockStatus:'available'};
  f.store.db.prepare('INSERT INTO products VALUES(?,?,?,?)').run(p.id,p.sku,p.status,JSON.stringify(p));
  const publicResponse=await f.call('/api/storefront/catalog');assert.equal(publicResponse.status,200);assert.equal((await publicResponse.json()).products.length,0);
  p.status='published';f.store.db.prepare('UPDATE products SET status=?,record=? WHERE id=?').run(p.status,JSON.stringify(p),p.id);
  const body=await (await f.call('/api/storefront/catalog')).text();assert(body.includes('DRAFT-1'));assert(!body.includes('costKobo'));assert(!body.includes('private supplier'));
});
test('rate limits survive database restart and request bodies have hard size limits',async t=>{
  const f=await fixture(t);assert(f.store.limit('test',1,60000));const another=new Store(f.settings.file);assert.equal(another.limit('test',1,60000),false);another.close();
  const huge=await f.call('/api/auth/login',{method:'POST',body:'x'.repeat(65537)});assert.equal(huge.status,413);
  for(let i=0;i<10;i++)f.store.limit('auth-account:'+digest(f.customer.email),10,900000);
  assert.equal((await f.call('/api/auth/login',{method:'POST',body:{email:f.customer.email,password:f.password}})).status,429);
});
test('upload fails closed without scanning, rejects unknown formats and restricts private downloads',async t=>{
  const f=await fixture(t,{scanner:true,scan:async()=>true}),files=new Files(f.store,f.settings,async()=>true),pdf=Buffer.from('%PDF-1.4\nTest only');
  await assert.rejects(files.upload(f.customer,f.order,Buffer.from('<script>alert(1)</script>')),/Only JPEG/);
  const uploaded=await files.upload(f.customer,f.order,pdf);assert.equal(uploaded.status,'clean');
  assert.throws(()=>files.download(f.other,uploaded.id),/not found/);
  const own=f.session(f.customer);assert.equal((await f.call('/api/files/'+uploaded.id,{session:own})).status,200);assert.equal((await f.call('/api/files/'+uploaded.id,{session:f.session(f.other)})).status,404);
  const infected=new Files(f.store,f.settings,async()=>false);await assert.rejects(infected.upload(f.customer,f.order,pdf),/rejected/);const rejected=f.store.db.prepare("SELECT * FROM files WHERE status='rejected'").get();assert(!fs.existsSync(path.join(f.settings.uploadDirectory,rejected.id)));
  const uncertain=new Files(f.store,f.settings,async()=>{throw Error('Scanner offline');});await assert.rejects(uncertain.upload(f.customer,f.order,pdf),/quarantined/);const quarantine=f.store.db.prepare("SELECT * FROM files WHERE status='quarantined'").get();assert.throws(()=>files.download(f.customer,quarantine.id),/not found/);
  await assert.rejects(new Files(f.store,{...f.settings,scanner:''}).upload(f.customer,f.order,pdf),/configured malware scanner/);
});
test('workers see and upload evidence only for explicitly assigned orders',async t=>{
  const f=await fixture(t,{scanner:true,scan:async()=>true}),worker=await f.auth.create('worker@example.test',f.password,'worker',true),s=f.session(worker);
  assert.deepEqual((await(await f.call('/api/orders',{session:s})).json()).orders,[]);
  assert.equal((await f.call('/api/orders/'+f.order.id+'/files',{session:s})).status,404);
  f.store.db.prepare('INSERT INTO assignments VALUES(?,?)').run(f.order.id,worker.id);
  assert.equal((await(await f.call('/api/orders',{session:s})).json()).orders.length,1);
  assert.equal((await f.call('/api/orders/'+f.order.id+'/files',{method:'POST',session:s,headers:{'Content-Type':'application/octet-stream'},body:Buffer.from('%PDF-1.4\nTest')})).status,201);
  assert.equal((await f.call('/api/paystack/verify',{method:'POST',session:s,body:{orderId:f.order.id}})).status,404);
});
test('HTTPS production configuration is enforced and cookies use Secure host scope',async t=>{
  assert.throws(()=>config({APP_URL:'http://example.com'}),/HTTPS/);assert.throws(()=>config({NODE_ENV:'production'}),/Production/);
  const f=await fixture(t),secure=new Auth(f.store,{...f.settings,secure:true});const cookie=secure.cookie('abc');assert(cookie.startsWith('__Host-clc_session='));assert(cookie.includes('; Secure'));assert(!cookie.includes('Domain='));
});
test('backup CLI creates an integrity-checked snapshot while the database is open',async t=>{
  const f=await fixture(t);const script=path.resolve(__dirname,'../backup.cjs');const env={...process.env,DATABASE_FILE:f.settings.file,APP_ENCRYPTION_KEY:'ab'.repeat(32),EMAIL_PROVIDER:'disabled',APP_URL:'http://localhost:3000',PAYSTACK_SECRET_KEY:''};
  const result=spawnSync(process.execPath,[script],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const directory=path.join(f.dir,'backups'),file=fs.readdirSync(directory).find(name=>name.endsWith('.sqlite'));assert(file);
  const check=spawnSync(process.execPath,[script,'--check',path.join(directory,file)],{env,encoding:'utf8'});assert.equal(check.status,0,check.stderr);
  const snapshot=new Store(path.join(directory,file));assert.equal(snapshot.byId(f.order.id).customerId,f.customer.id);snapshot.close();
});
