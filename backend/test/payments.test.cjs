const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { config } = require('../config.cjs');
const { Store } = require('../store.cjs');
const { Payments } = require('../payments.cjs');
const { createServer } = require('../server.cjs');
const { createMailer } = require('../email.cjs');
const { Auth } = require('../auth.cjs');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clc-payment-'));
  t.after(() => {store.close();fs.rmSync(dir, { recursive: true, force: true });});
  const settings = config({ PAYSTACK_SECRET_KEY: 'sk_test_fixture', DATA_FILE: path.join(dir, 'store.json'), EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.test', SMTP_USER: 'test', SMTP_PASSWORD: 'fake', EMAIL_FROM: 'test@example.test' });
  const store = new Store(settings.file);
  store.db.prepare('INSERT INTO users(id,email,role,password,verified) VALUES(?,?,?,?,1)').run('buyer','buyer@example.test','customer','unused');
  const order = store.approve({ id: 'ORDER-1', email: 'buyer@example.test', amountKobo: 125000 });
  const counts = { init: 0, verify: 0, email: 0 }; let override = {}, emailFailure = false;
  const request = async (url, options) => {
    if(url.endsWith('/initialize')){ counts.init++; const body=JSON.parse(options.body); assert.equal(body.amount,'125000'); assert.equal(body.reference,order.reference); return { ok:true,json:async()=>({status:true,data:{reference:order.reference,authorization_url:'https://checkout.paystack.com/fixture'}}) }; }
    counts.verify++;
    return { ok:true,json:async()=>({status:true,data:{id:123,status:'success',reference:order.reference,amount:125000,currency:'NGN',domain:'test',customer:{email:order.email},...override}}) };
  };
  const mailer = {send: async message => { counts.email++; assert(message.messageId.includes(order.reference)); if(emailFailure){const e=Error('SMTP rejected');e.responseCode=550;throw e;}return {messageId:'email-1',accepted:[order.email]}; }};
  return { settings, store, order, counts, request, mailer, override: value => {override=value;}, failEmail: value => {emailFailure=value;} };
}
test('configuration rejects live keys and incomplete email configuration',()=>{
  assert.throws(()=>config({PAYSTACK_SECRET_KEY:'sk_live_example'}),/test keys/);
  assert.throws(()=>config({EMAIL_PROVIDER:'smtp'}),/requires/);
  assert.equal(config({}).emailProvider,'disabled');
});
test('approved amount cannot be replaced; concurrent initialization reuses one transaction',async t=>{
  const f=fixture(t),payments=new Payments(f.settings,f.store,f.request,f.mailer);
  assert.throws(()=>f.store.approve({id:f.order.id,email:f.order.email,amountKobo:1}),/already exists/);
  const results=await Promise.all([payments.initialize(f.order),payments.initialize(f.order)]);
  assert.equal(f.counts.init,1);assert.deepEqual(results[0],results[1]);
  const restored=new Store(f.settings.file);assert.equal(restored.byToken(f.order.token).authorizationUrl,results[0].authorizationUrl);restored.close();
});
test('verification rejects amount, currency, reference, customer and environment mismatches',async t=>{
  const f=fixture(t),payments=new Payments(f.settings,f.store,f.request,f.mailer);
  for(const override of [{amount:1},{currency:'USD'},{reference:'other'},{customer:{email:'other@example.test'}},{domain:'live'}]){
    f.override(override);await assert.rejects(payments.verify(f.order),/does not match/);assert.equal(f.order.status,'approved');
  }
  assert.equal(f.counts.email,0);
});
test('duplicate successful callbacks send one receipt and retain paid record after restart',async t=>{
  const f=fixture(t),payments=new Payments(f.settings,f.store,f.request,f.mailer);
  await Promise.all([payments.verify(f.order),payments.verify(f.order)]);
  assert.equal(f.counts.verify,1);assert.equal(f.counts.email,1);
  const db=new Store(f.settings.file),restored=db.byReference(f.order.reference);assert.equal(restored.status,'paid');assert.equal(restored.receipt,'sent');assert.equal(db.db.prepare('SELECT count(*) AS n FROM ledger').get().n,1);db.close();
});
test('email failure preserves paid status and retries without repeating payment',async t=>{
  const f=fixture(t),payments=new Payments(f.settings,f.store,f.request,f.mailer);f.failEmail(true);
  assert.equal((await payments.verify(f.order)).receipt,'pending');assert.equal(f.order.status,'paid');
  f.failEmail(false);assert.equal((await payments.verify(f.order)).receipt,'sent');assert.equal(f.counts.verify,1);assert.equal(f.counts.email,2);
});
test('expired orders cannot initialize; pending payments are never marked paid',async t=>{
  const f=fixture(t),payments=new Payments(f.settings,f.store,f.request,f.mailer);f.order.expiresAt=0;f.store.save(f.order);
  await assert.rejects(payments.initialize(f.order),/expired/);
  f.override({status:'pending'});assert.equal((await payments.verify(f.order)).status,'pending');assert.equal(f.order.status,'approved');
});
test('SMTP transport requires encryption and constructs mail without a network connection',async t=>{
  const f=fixture(t);let transportOptions;
  const mailer=createMailer(f.settings,options=>{transportOptions=options;return require('nodemailer').createTransport({streamTransport:true,buffer:true});});
  const result=await mailer.send({from:f.settings.emailFrom,to:f.order.email,subject:'Test receipt',text:'Test payment only'});
  assert.equal(transportOptions.requireTLS,true);assert.equal(transportOptions.secure,false);assert.equal(transportOptions.port,587);
  assert(result.message.toString().includes('Test payment only'));
});
test('ambiguous SMTP delivery is retained and not automatically resent',async t=>{
  const f=fixture(t);let sends=0;
  const mailer={send:async()=>{sends++;throw Error('Connection lost after DATA');}};
  const payments=new Payments(f.settings,f.store,f.request,mailer);
  assert.equal((await payments.verify(f.order)).receipt,'uncertain');
  await payments.verify(f.order);assert.equal(sends,1);assert.equal(f.order.status,'paid');
});
test('HTTP rejects forged webhooks, unknown tokens and cross-origin requests; authentic webhook verifies provider',async t=>{
  const f=fixture(t),server=createServer(f.settings,f.store,f.request,f.mailer);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const auth=new Auth(f.store,f.settings),session=auth.issue(auth.user('buyer'));
  const post=(route,body,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:'clc_session='+session.token,'X-CSRF-Token':session.csrf,...headers},body:typeof body==='string'?body:JSON.stringify(body)});
  assert.equal((await post('/api/paystack/initialize',{token:f.order.token},{Origin:'https://evil.test'})).status,403);
  assert.equal((await post('/api/paystack/initialize',{token:'unknown'},{Origin:f.settings.appUrl})).status,404);
  const event=JSON.stringify({event:'charge.success',data:{reference:f.order.reference,amount:1}});
  assert.equal((await post('/api/paystack/webhook',event,{'x-paystack-signature':'0'.repeat(128)})).status,401);
  assert.equal(f.counts.verify,0);
  const signature=createHmac('sha512',f.settings.key).update(event).digest('hex');
  assert.equal((await post('/api/paystack/webhook',event,{'x-paystack-signature':signature})).status,200);
  assert.equal(f.counts.verify,1);assert.equal(f.store.byId(f.order.id).status,'paid');
  const result=await (await post('/api/paystack/verify',{token:f.order.token,amountKobo:1},{Origin:f.settings.appUrl})).json();
  assert.equal(result.amountKobo,125000);assert.equal(f.counts.email,1);
  assert.equal((await fetch(base+'/api/config')).status,401);
  const page=await(await fetch(base+'/')).text();assert(page.includes('id="storefront"'));assert(page.includes('sandbox="allow-scripts"'));assert(!page.includes(f.settings.key));
});
