const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { config } = require('./config.cjs');
const { Store,digest } = require('./store.cjs');
const { Payments } = require('./payments.cjs');
const {Auth,passwordMatches,passwordValid,emailValid}=require('./auth.cjs');
const {createMailer}=require('./email.cjs');
const {Files}=require('./files.cjs');
const {HttpError,headers,read,csrf,requireSession,admin}=require('./security.cjs');
const {randomBytes}=require('node:crypto');
const {Messages}=require('./messages.cjs');
const {AI,imageInput}=require('./ai.cjs');
const {Catalog}=require('./catalog.cjs');
const {Business}=require('./business.cjs');
const {Google}=require('./google.cjs');
function createServer(settings, store = new Store(settings.file), request = fetch, mailer=createMailer(settings), scan) {
  const trustProxy=require('./proxy.cjs').trustedProxies(settings.trustedProxyCIDRs||'');const auth=new Auth(store,settings),files=new Files(store,settings,scan);let authBusy=0;
  store.paymentMode=settings.paymentMode||'test';store.growth.environment=store.paymentMode;if(store.db.prepare('SELECT record FROM orders').all().some(r=>(JSON.parse(r.record).paymentEnvironment||'test')!==store.paymentMode))throw Error('Database payment environment does not match this deployment');
  const payments = new Payments(settings, store, request, mailer,auth);
  const messages=new Messages(store,settings,mailer),ai=new AI(store,auth,settings,request),catalog=new Catalog(store,settings,files,ai);
  const business=new Business(store,catalog),google=new Google(store,auth,settings,request),fulfillment=new (require('./fulfillment.cjs').Fulfillment)(store,business,auth);
  const notifications=new (require('./notifications.cjs').Notifications)(store,auth,settings,mailer);store.notifications=notifications;notifications.messages=messages;if(settings.backgroundJobs!==false)notifications.start();
  const operations=new (require('./operations.cjs').Operations)(store);store.operations=operations;const catalogImport=new (require('./catalog-import.cjs').CatalogImport)(store,business);const finance=new (require('./finance.cjs').Finance)(store,payments);
  const whatsapp=new (require('./whatsapp.cjs').WhatsApp)(store);
  const automation=new (require('./whatsapp-automation.cjs').WhatsAppAutomation)(store,auth,ai,catalog,request);if(settings.backgroundJobs!==false)automation.start();
  const {accountEmail}=require('./email-templates.cjs');
  const sendAccountEmail=async(user,kind,url)=>{if(!mailer)return;try{const {previewHtml,...content}=accountEmail(settings,kind,url);await mailer.send({from:settings.emailFrom,to:user.email,...(settings.supportEmail?{replyTo:settings.supportEmail}:{}),...content});}catch{store.audit(user.id,'email.delivery_failed',user.id);}};
  const sendLink=async(user,kind)=>{if(!mailer)throw new HttpError(503,'Email is not configured');const token=auth.challenge(user,kind);await sendAccountEmail(user,kind,settings.appUrl+'/secure#'+kind+'='+token);};
  const publicOrder=o=>({id:o.id,customerId:o.customerId,email:o.email,amountKobo:o.amountKobo,walletKobo:o.walletKobo||0,payableKobo:o.payableKobo??o.amountKobo,paymentEnvironment:o.paymentEnvironment||'test',paymentMethod:o.paymentMethod||'paystack',currency:o.currency,status:o.status,reference:o.reference,receipt:o.receipt,expiresAt:o.expiresAt,revoked:!!o.revoked,lines:o.lines||[],address:o.address||null,goodsKobo:o.goodsKobo,deliveryKobo:o.deliveryKobo,taxKobo:o.taxKobo,promoCode:o.promoCode,goodsDiscountKobo:o.goodsDiscountKobo||0,shippingDiscountKobo:o.shippingDiscountKobo||0,quoteId:o.quoteId,quoteVersion:o.quoteVersion});
  const server=http.createServer(async (req, res) => {
    headers(res,settings);let hashing=false;
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, settings.appUrl);
      if(url.pathname==='/healthz')return json(200,{status:'ok'});if(url.pathname==='/readyz'){store.db.prepare('SELECT 1').get();return json(200,{status:'ready'});}
      if(settings.maintenanceFile&&fs.existsSync(settings.maintenanceFile)){res.setHeader('Retry-After','60');return json(503,{error:'ChinaLowCost is being updated. Please retry shortly.'});}
      if(url.pathname==='/')url.pathname='/application';
      if(url.pathname==='/api/whatsapp/webhook'){if(req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(automation.verify(url.searchParams));return;}if(req.method==='POST'){automation.receive(await read(req,262144),req.headers['x-hub-signature-256']);return json(200,{ok:true});}throw new HttpError(405,'Method not allowed');}
      const ip=require('./proxy.cjs').clientIP(req,trustProxy);
      if(!store.limit('ip:'+ip,120,60000)){res.setHeader('Retry-After','60');throw new HttpError(429,'Too many requests. Try again later.');}
      if(req.method==='GET'&&url.pathname==='/application'){
        res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(self)');
        res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self'; connect-src 'self' https://www.google.com/recaptcha/; worker-src 'self'; manifest-src 'self'; frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChinaLowCost</title><link rel="manifest" href="/notification-manifest.json"><link rel="stylesheet" href="/storefront-host.css"></head><body><iframe id="storefront" title="ChinaLowCost application" sandbox="allow-scripts"></iframe><script src="/offline-queue.js"></script><script src="/storefront-host.js"></script></body></html>');return;
      }
      if(req.method==='GET'&&url.pathname==='/application/frame'){
        res.setHeader('X-Frame-Options','SAMEORIGIN');
        res.setHeader('Content-Security-Policy',"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src data: blob: "+settings.appUrl+"; img-src data: blob: "+settings.appUrl+"; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'");
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(__dirname,'../outputs/Connected-Storefront.html')));return;
      }
      const assets={'/offline-queue.js':['offline-queue.js','application/javascript'],'/notification-manifest.json':['notification-manifest.json','application/manifest+json'],'/notification-icon.svg':['notification-icon.svg','image/svg+xml'],'/notification-sw.js':['notification-sw.js','application/javascript'],'/storefront-host.js':['storefront-host.js','application/javascript'],'/storefront-host.css':['storefront-host.css','text/css'],'/secure':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','application/javascript'],'/features.js':['features.js','application/javascript'],'/i18n.js':['i18n.js','application/javascript'],'/app.css':['app.css','text/css']};
      if(req.method==='GET'&&assets[url.pathname]){const [file,type]=assets[url.pathname];res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(path.join(__dirname,'public',file)));return;}
      if(req.method==='GET'&&url.pathname==='/prototype'){res.setHeader('Content-Security-Policy',"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(__dirname,'../outputs/Screen-Blueprint.html')));return;}
      if(req.method==='GET'&&url.pathname==='/google-login'){
        if(!google.public().signInEnabled)throw new HttpError(503,'Google sign-in is disabled');
        const referral=url.searchParams.get('referral_code')||'',safeReferral=/^[A-Za-z0-9_-]{3,24}$/.test(referral)?referral:'';const nonce=google.nonce();res.setHeader('Set-Cookie','clc_google_nonce='+nonce+'; Path=/api/auth/google; HttpOnly; SameSite=Strict; Max-Age=300'+(settings.secure?'; Secure':''));
        res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' https://accounts.google.com/gsi/style; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com/gsi/; base-uri 'none'; frame-ancestors 'none'");
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><title>ChinaLowCost Google sign-in</title><meta name="google-client" content="'+google.public().clientId+'"><meta name="google-nonce" content="'+nonce+'"><h1>Customer Google sign-in</h1><label for="google-referral">Invitation code (optional, new accounts)</label><input id="google-referral" maxlength="24" value="'+safeReferral+'"><label for="google-otp">Authenticator or recovery code (if enabled)</label><input id="google-otp" autocomplete="one-time-code"><div id="google-button"></div><p id="google-status" role="status"></p><script src="https://accounts.google.com/gsi/client" defer></script><script src="/google-login.js" defer></script>');return;
      }
      if(req.method==='GET'&&url.pathname==='/google-login.js'){res.writeHead(200,{'Content-Type':'application/javascript'});res.end(fs.readFileSync(path.join(__dirname,'public/google-login.js')));return;}
      if(req.method==='GET'&&url.pathname==='/api/google/public')return json(200,google.public());
      if(req.method==='GET'&&url.pathname==='/api/whatsapp/config')return json(200,whatsapp.public());
      const session=auth.session(req);
      if(req.method==='GET'&&url.pathname==='/api/auth/profile'){const user=requireSession(session);if(user.role==='admin'){admin(session);operations.guard(user,req.method,url.pathname);}return json(200,{profile:auth.profile(user),user:auth.public(user),recoveryCodesRemaining:store.db.prepare('SELECT count(*) AS n FROM mfa_recovery WHERE user_id=?').get(user.id).n,activeSessions:store.db.prepare('SELECT count(*) AS n FROM sessions WHERE user_id=? AND created>? AND seen>?').get(user.id,Date.now()-43200000,Date.now()-1800000).n});}
      if(req.method==='GET'&&url.pathname==='/api/storefront/catalog')return json(200,{products:catalog.list()});
      const publicVideo=url.pathname.match(/^\/api\/storefront\/video\/([a-f0-9]{48})$/);if(req.method==='GET'&&publicVideo){const v=catalog.video(null,publicVideo[1]);res.setHeader('Cross-Origin-Resource-Policy','cross-origin');res.writeHead(200,{'Content-Type':v.mime});fs.createReadStream(v.path).on('error',()=>res.destroy()).pipe(res);return;}
      const publicMedia=url.pathname.match(/^\/api\/storefront\/media\/([a-f0-9]{48})$/);
      if(req.method==='GET'&&publicMedia){const media=catalog.media(null,publicMedia[1]);res.setHeader('Cross-Origin-Resource-Policy','cross-origin');res.writeHead(200,{'Content-Type':media.mime});fs.createReadStream(media.path).on('error',()=>res.destroy()).pipe(res);return;}
      if(req.method==='GET'&&url.pathname==='/api/auth/me')return json(200,session?{user:auth.public(session.user),csrf:session.csrf,mfaRequired:session.user.role==='admin'&&!session.mfa}:{user:null});
      if(req.method==='POST'&&url.pathname==='/api/paystack/webhook'){
        const raw=await read(req);
        if (!payments.validSignature(raw, req.headers['x-paystack-signature'])) return json(401, { error: 'Invalid signature' });
        const event = JSON.parse(raw);
        if (event.event === 'charge.success') {
          const order = store.byReference(event.data?.reference);
          if (order) await payments.verify(order);
        }
        return json(200, { received: true });
      }
      let body={};
      const uploadMatch=url.pathname.match(/^\/api\/orders\/([A-Za-z0-9-]{1,80})\/files$/);
      const productVideo=url.pathname.match(/^\/api\/business\/catalog\/([a-f0-9]{32})\/videos$/);
      const productUpload=url.pathname.match(/^\/api\/(?:admin|business)\/catalog\/([a-f0-9]{32})\/images$/);
      if(req.method==='POST'){
        if(req.headers.origin!==settings.appUrl)throw new HttpError(403,'Invalid origin');
        if(!uploadMatch&&!productUpload&&!productVideo){if(!(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'JSON content type required');body=JSON.parse((await read(req,['/api/ai/chat','/api/admin/catalog/discover','/api/worker/catalog/analyze'].includes(url.pathname)?1500000:url.pathname.startsWith('/api/admin/import/')?512000:65536)).toString());if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'JSON object required');}
      }
      if(req.method==='POST'&&url.pathname==='/api/whatsapp/link')return json(200,whatsapp.link(body,catalog));
      if(req.method==='POST'&&url.pathname.startsWith('/api/auth/')){
        const action=url.pathname.slice('/api/auth/'.length);
        if(!store.limit('auth-ip:'+ip,15,900000)||!store.limit('auth-account:'+digest(String(body.email||session?.user.id||ip).toLowerCase()),10,900000))throw new HttpError(429,'Too many account requests. Try again later.');
        if(authBusy>=4)throw new HttpError(429,'Account service busy. Try again shortly');authBusy++;hashing=true;
        if(action==='google'){
          const nonce=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('clc_google_nonce='))?.slice(17);
          const identity=await google.identity(body.credential,nonce);
          const linked=store.db.prepare('SELECT user_id FROM google_identities WHERE subject=?').get(identity.sub);let account;
          if(linked)account=store.db.prepare('SELECT * FROM users WHERE id=?').get(linked.user_id);
          else {
            if(store.db.prepare('SELECT id FROM users WHERE email=?').get(identity.email.toLowerCase()))throw new HttpError(409,'This email already has an account. Use your existing password to sign in');
            account=await auth.create(identity.email,randomBytes(48).toString('hex'),'customer',true,body.referralCode?u=>store.growth.attachInside(u,{code:body.referralCode}):null);
            store.db.prepare('INSERT INTO google_identities VALUES(?,?)').run(identity.sub,account.id);
          }
          if(!account?.active||!account.verified||account.role!=='customer')throw new HttpError(403,'Customer Google sign-in is unavailable for this account');
          if(account.mfa_enabled&&!auth.factor(account,body.otp))throw new HttpError(401,'Authenticator or recovery code required. Reopen Google sign-in and include your code');const result=auth.issue(account,!!account.mfa_enabled);res.setHeader('Set-Cookie',[auth.cookie(result.token),'clc_google_nonce=; Path=/api/auth/google; HttpOnly; SameSite=Strict; Max-Age=0'+(settings.secure?'; Secure':'')]);store.audit(account.id,'session.google_login');return json(200,{ok:true});
        }
        if(['login','login-factor','register','forgot','resend','consume'].includes(action)){
          if(['login','register','forgot','resend'].includes(action))await google.captcha(body.captchaToken,action);
          if(action==='login'){const result=body.stepwise?await auth.beginLogin(body.email,body.password):await auth.login(body.email,body.password,body.otp);if(!result){store.audit(null,'session.login_failed');throw new HttpError(401,'Invalid credentials, verification or authenticator code');}if(result.factorRequired)return json(200,result);res.setHeader('Set-Cookie',auth.cookie(result.token));return json(200,{user:result.user,csrf:result.csrf,mfaRequired:result.mfaRequired});}
          if(action==='login-factor'){const result=auth.finishLogin(body.challenge,body.otp);if(!result)throw new HttpError(401,'Invalid or expired code. Try again or return to sign in.');res.setHeader('Set-Cookie',auth.cookie(result.token));return json(200,{user:result.user,csrf:result.csrf,mfaRequired:result.mfaRequired});}
          if(action==='consume'){if(!['verify','reset','invite'].includes(body.kind))throw new HttpError(400,'Invalid request');const challenge=typeof body.token==='string'&&/^[a-f0-9]{64}$/.test(body.token)?store.db.prepare('SELECT user_id FROM challenges WHERE hash=? AND kind=?').get(digest(body.token),body.kind):null;if(!await auth.consumeChallenge(body.token,body.kind,body.password))throw new HttpError(400,'Link is invalid or expired');if(challenge)await sendAccountEmail(auth.user(challenge.user_id),body.kind==='reset'?'password':'welcome');return json(200,{ok:true});}
          if(!mailer)throw new HttpError(503,'Email is not configured');
          if(!emailValid(body.email))throw new HttpError(400,'Valid email required');
          if(!store.limit('email:'+digest(body.email.toLowerCase()),3,3600000))throw new HttpError(429,'Too many email requests. Try again later.');
          const existing=store.db.prepare('SELECT * FROM users WHERE email=?').get(body.email.toLowerCase());
          if(action==='register'){if(!passwordValid(body.password))throw new HttpError(400,'Use a password with 12–128 characters');if(!existing){const user=await auth.create(body.email,body.password,'customer',false,u=>{if(body.referralCode)store.growth.attachInside(u,{code:body.referralCode});if(body.name)auth.saveProfile(u,{name:body.name,phone:'',language:'en'});});await sendLink(user,'verify');}}
          if(action==='forgot'&&existing?.active)await sendLink(existing,'reset');
          if(action==='resend'&&existing?.active&&!existing.verified)await sendLink(existing,'verify');
          return json(202,{message:'If the account is eligible, an email will arrive shortly.'});
        }
        const user=requireSession(session);csrf(req,session);
        if(action==='profile'){if(user.role==='admin')admin(session);return json(200,{profile:auth.saveProfile(user,body),user:auth.public(user)});}
        if(action==='sessions/revoke-others'){if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current password required');const count=store.db.prepare('DELETE FROM sessions WHERE user_id=? AND hash<>?').run(user.id,session.hash).changes;store.audit(user.id,'sessions.others_revoked',user.id);return json(200,{ok:true,count});}
        if(['mfa/disable','mfa/recovery'].includes(action)){
          if(action==='mfa/disable'&&user.role==='admin')throw new HttpError(403,'Two-factor authentication is mandatory for administrators');
          if(!user.mfa_enabled||!session.mfa)throw new HttpError(403,'Two-factor authentication must be enabled');
          if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current password required');
          const result=store.transaction(()=>{if(!auth.factor(auth.user(user.id),body.otp))throw new HttpError(403,'Fresh authenticator or unused recovery code required');
            if(action==='mfa/recovery'){const codes=auth.recoveryCodes(user);store.audit(user.id,'mfa.recovery_regenerated',user.id);return {recoveryCodes:codes};}
            store.db.prepare('UPDATE users SET mfa_enabled=0,mfa_secret=NULL,mfa_step=-1 WHERE id=?').run(user.id);store.db.prepare('DELETE FROM mfa_recovery WHERE user_id=?').run(user.id);store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);store.audit(user.id,'mfa.disabled',user.id);return {ok:true};
          });
          if(action==='mfa/disable')res.setHeader('Set-Cookie',auth.cookie('',0));return json(200,result);
        }
        if(action==='logout'){store.db.prepare('DELETE FROM sessions WHERE hash=?').run(session.hash);res.setHeader('Set-Cookie',auth.cookie('',0));return json(200,{ok:true});}
        if(action==='password'){if(!passwordValid(body.password))throw new HttpError(400,'Use a password with 12–128 characters');if(!await auth.changePassword(session,body.current,body.password))throw new HttpError(400,'Current password is incorrect');await sendAccountEmail(user,'password');res.setHeader('Set-Cookie',auth.cookie('',0));return json(200,{ok:true});}
        if(action==='mfa/enroll'){if(user.mfa_enabled)throw new HttpError(400,'MFA already enabled');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current password required');const secret=auth.enroll(user);return json(200,{secret,uri:'otpauth://totp/ChinaLowCost:'+encodeURIComponent(user.email)+'?secret='+secret+'&issuer=ChinaLowCost'});}
        if(action==='mfa/confirm'){if(user.mfa_enabled)throw new HttpError(400,'MFA already enabled');const result=auth.confirmMfa(session,body.otp);if(!result)throw new HttpError(400,'Invalid authenticator code');res.setHeader('Set-Cookie',auth.cookie(result.token));return json(200,{user:result.user,csrf:result.csrf,mfaRequired:false,recoveryCodes:result.recoveryCodes});}
        throw new HttpError(404,'Not found');
      }
      const user=requireSession(session);if(user.role==='admin')admin(session);
      if(req.method==='POST')csrf(req,session);
      if(!store.limit('user:'+user.id,60,60000))throw new HttpError(429,'Too many requests. Try again later.');
      const videoMatch=url.pathname.match(/^\/api\/catalog\/video\/([a-f0-9]{48})$/);
      if(req.method==='GET'&&videoMatch){const v=catalog.video(user,videoMatch[1]);res.writeHead(200,{'Content-Type':v.mime});fs.createReadStream(v.path).on('error',()=>res.destroy()).pipe(res);return;}
      if(req.method==='POST'&&productVideo){const p=catalog.get(productVideo[1]);if(!p||!business.canCatalog(user,p))throw new HttpError(403,'Catalog draft access required');return json(201,await catalog.addVideo(user,p,await read(req,5242880)));}
      if(req.method==='POST'&&url.pathname==='/api/business/video-remove'){const p=catalog.get(body.id);if(!p||!business.canCatalog(user,p))throw new HttpError(403,'Catalog draft access required');return json(200,catalog.removeVideo(user,p,body.videoId));}
      if(req.method==='GET'&&url.pathname==='/api/admin/operations'){admin(session);return json(200,{...operations.snapshot(user),inventory:operations.scopes(user).some(s=>['owner','operations','finance'].includes(s))?store.inventory.snapshot(user):{stock:[],reservations:[],purchaseOrders:[],receipts:[]},finance:operations.scopes(user).some(s=>['owner','finance'].includes(s))?finance.snapshot(user):null});}
      if(req.method==='GET'&&url.pathname==='/api/admin/reports'){admin(session);return json(200,operations.report(user,Object.fromEntries(url.searchParams)));}
      if(req.method==='POST'&&url.pathname==='/api/admin/import/preview'){admin(session);return json(200,catalogImport.preview(user,body));}if(req.method==='POST'&&url.pathname==='/api/admin/import/commit'){admin(session);return json(200,catalogImport.commit(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/orders/cancel')return json(200,finance.cancel(user,body));
      if(req.method==='POST'&&url.pathname.startsWith('/api/admin/operations/')){admin(session);const action=url.pathname.split('/').pop(),scope=['stock','po-create','po-review','po-receive'].includes(action)?'operations':['policy','scopes'].includes(action)?'owner':action==='category'?'catalog':'finance';operations.require(user,scope);const actions={stock:()=>store.inventory.adjust(user,body),'po-create':()=>store.inventory.createPO(user,body),'po-review':()=>store.inventory.approvePO(user,body),'po-receive':()=>store.inventory.receivePO(user,body),policy:()=>operations.save(user,body),scopes:()=>operations.setScopes(user,body),category:()=>operations.category(user,body),'refund-request':()=>finance.request(user,body),'refund-review':()=>finance.approve(user,body),'refund-execute':()=>finance.execute(user,body),'refund-verify':()=>finance.verify(user,body),'settlement-create':()=>finance.settlement(user,body),'settlement-review':()=>finance.settleReview(user,body),'settlement-execute':()=>finance.settleExecute(user,body),'settlement-verify':()=>finance.settleVerify(user,body)};if(!Object.hasOwn(actions,action))throw new HttpError(404,'Unknown operation');return json(200,await actions[action]());}
      if(req.method==='GET'&&url.pathname==='/api/business/snapshot'){const data={...business.snapshot(user),fulfillment:fulfillment.snapshot(user)};if(user.role==='admin'&&!operations.scopes(user).includes('owner')){const scopes=operations.scopes(user);if(!scopes.includes('operations')){data.staff=[];data.tasks=[];data.suppliers=[];data.rates=[];data.fulfillment={shipments:[],records:[],returns:[],cash:[],availability:[],settings:{codEnabled:false}};}if(!scopes.includes('catalog'))data.drafts=[];if(!scopes.includes('support'))data.support=[];if(!scopes.some(s=>['finance','operations','support'].includes(s)))data.quotes=[];}return json(200,data);}
      if(req.method==='POST'&&url.pathname.startsWith('/api/fulfillment/')){
        const actions={'visit-consent':()=>fulfillment.visitConsent(user,body),'renew-code':()=>fulfillment.renewCode(user,body),availability:()=>fulfillment.availability(user,body),submit:()=>fulfillment.submission(user,body),review:()=>fulfillment.review(user,body),dispatch:()=>fulfillment.dispatch(user,body),transit:()=>fulfillment.transit(user,body),'return-request':()=>fulfillment.requestReturn(user,body),'return-review':()=>fulfillment.returnReview(user,body),cash:()=>fulfillment.cash(user,body),'cash-review':()=>fulfillment.reconcileCash(user,body),settings:()=>fulfillment.configure(user,body)};
        const action=url.pathname.slice('/api/fulfillment/'.length);if(!Object.hasOwn(actions,action))throw new HttpError(404,'Unknown fulfillment action');if(action==='submit'&&body.otp&&!store.limit('delivery-code:'+user.id+':'+body.taskId,5,900000))throw new HttpError(429,'Too many delivery code attempts');return json(200,actions[action]());
      }
      if(req.method==='GET'&&url.pathname==='/api/business/growth')return json(200,user.role==='admin'?{settings:store.growth.settings(),promotions:store.growth.promotions(user)}:user.role==='customer'?{referral:store.growth.summary(user),promotions:store.growth.promotions(user)}:{});
      if(req.method==='POST'&&url.pathname==='/api/business/referral-code'){if(!store.limit('referral-code-change:'+user.id,5,86400000))throw new HttpError(429,'You can change your code five times per day');return json(200,store.growth.renameCode(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/business/wallet-cancel')return json(200,store.growth.cancelWallet(user,body));
      if(req.method==='POST'&&url.pathname==='/api/business/referral-attach')return json(200,store.growth.attach(user,body));
      if(req.method==='POST'&&url.pathname==='/api/business/referral-config'){admin(session);return json(200,store.growth.configure(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/business/promotion'){admin(session);return json(200,store.growth.promotion(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/business/promo-preview'){if(user.role!=='customer')throw new HttpError(403,'Customer account required');if(!Array.isArray(body.lines)||!body.lines.length||body.lines.length>100)throw new HttpError(400,'Select cart products first');const lines=body.lines.map(l=>business.line(l));const alias=typeof body.promoCode==='string'&&store.db.prepare('SELECT user_id FROM referral_code_aliases WHERE code=?').get(body.promoCode.trim().toUpperCase());if(alias&&!store.growth.get(body.promoCode.trim().toUpperCase())){const linked=store.db.prepare('SELECT referrer_id FROM referrals WHERE buyer_id=?').get(user.id);if(linked&&linked.referrer_id!==alias.user_id)throw new HttpError(409,'An invitation code is already attached to your account');if(!linked)store.growth.attach(user,{code:body.promoCode});return json(200,{referral:true});}const address=business.address(body.address||business.profile(user).address);return json(200,store.growth.discounts(user,body.promoCode,lines,business.route(address,lines.reduce((n,l)=>n+l.chargeableKg,0))));}
      if(req.method==='POST'&&url.pathname==='/api/business/location'){if(!google.public().locationEnabled)throw new HttpError(403,'Device location is disabled by the administrator');return json(200,business.location(user,body));}
      if(req.method==='GET'&&url.pathname==='/api/business/location-ready'){const p=business.read('staff_profiles','user_id',user.id);if(user.role!=='worker'||!p?.shift||!p.consentAt||!google.public().locationEnabled)throw new HttpError(403,'Enable location and start your shift with consent first');return json(200,{ok:true});}
      if(req.method==='POST'&&url.pathname.startsWith('/api/business/')){
        if(url.pathname==='/api/business/worker-create'){
          admin(session);if(!emailValid(body.email)||!passwordValid(body.password)||!['Catalog','Procurement','Delivery','Fieldworker'].includes(body.role)||typeof body.name!=='string'||!body.name.trim()||body.name.length>120)throw new HttpError(400,'Check worker name, email, role and password (12–128 characters)');
          if(authBusy>=4)throw new HttpError(429,'Account service busy');authBusy++;hashing=true;
          if(store.db.prepare('SELECT id FROM users WHERE email=?').get(body.email.toLowerCase()))throw new HttpError(409,'Email already exists');
          const worker=await auth.create(body.email,body.password,'worker',true);business.staff(user,{id:worker.id,name:body.name,role:body.role});store.audit(user.id,'worker.created',worker.id);return json(201,{user:auth.public(worker)});
        }
        const action=url.pathname.slice('/api/business/'.length);
        const actions={cart:()=>business.cartAction(user,body),address:()=>business.addressAction(user,body),saved:()=>business.saved(user,body),quote:()=>business.quote(user,body),'quote-approve':()=>business.quoteApprove(user,body),checkout:()=>publicOrder(business.checkout(user,body)),supplier:()=>business.supplier(user,body),staff:()=>business.staff(user,body),task:()=>business.taskCreate(user,body),'task-action':()=>business.taskAction(user,body),rate:()=>business.rate(user,body),'catalog-draft':()=>business.catalogDraft(user,body),'catalog-review':()=>business.catalogReview(user,body),'catalog-arrange':()=>business.catalogMedia(user,body),'catalog-remove':()=>business.catalogMedia(user,body,true),'support-message':()=>business.support(user,body),shift:()=>business.shift(user,body),checkin:()=>business.checkin(user,body)};
        if(productUpload){const p=catalog.get(productUpload[1]);if(!p||!business.canCatalog(user,p))throw new HttpError(403,'Catalog draft access required');if(!settings.scanner)throw new HttpError(503,'Configure the malware scanner before uploading images');return json(201,await catalog.addImage(user,p,await read(req,5242880)));}
        if(!Object.hasOwn(actions,action))throw new HttpError(404,'Unknown business operation');return json(200,actions[action]());
      }
      if(req.method==='GET'&&url.pathname==='/api/notifications')return json(200,notifications.inbox(user,Object.fromEntries(url.searchParams)));
      if(req.method==='POST'&&url.pathname==='/api/notifications/read')return json(200,notifications.read(user,body));
      if(req.method==='POST'&&url.pathname==='/api/notifications/preferences')return json(200,notifications.savePreferences(user,body));
      if(req.method==='GET'&&url.pathname==='/api/notifications/push')return json(200,{enabled:notifications.pushConfig().enabled,publicKey:notifications.pushConfig().enabled?notifications.pushConfig().publicKey:null});
      if(req.method==='POST'&&url.pathname==='/api/notifications/subscribe')return json(200,notifications.subscribe(user,body));
      if(req.method==='POST'&&url.pathname==='/api/notifications/unsubscribe')return json(200,notifications.unsubscribe(user,body));
      if(req.method==='GET'&&url.pathname==='/api/admin/notifications'){admin(session);return json(200,notifications.pushPublic());}
      if(req.method==='POST'&&url.pathname==='/api/admin/notifications/delivery'){admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many delivery review attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,notifications.reviewDelivery(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/admin/notifications'){admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many settings attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,notifications.configure(user,body));}
      if(req.method==='GET'&&url.pathname==='/api/messages')return json(200,messages.inbox(user,url.searchParams.get('before')));
      if(req.method==='POST'&&url.pathname==='/api/messages/read')return json(200,messages.read(user,body.id));
      if(req.method==='POST'&&url.pathname==='/api/admin/messages/preview'){admin(session);return json(200,messages.preview(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/admin/messages/send'){admin(session);if(!store.limit('announcements:'+user.id,20,3600000))throw new HttpError(429,'Announcement limit reached');return json(201,messages.publish(user,body));}
      if(req.method==='GET'&&url.pathname==='/api/admin/messages') {admin(session);return json(200,messages.history());}
      if(req.method==='POST'&&url.pathname==='/api/admin/messages/deliver'){admin(session);if(!store.limit('email-batches:'+user.id,12,60000))throw new HttpError(429,'Email batch limit reached');return json(200,await messages.deliver(user));}
      if(req.method==='GET'&&url.pathname==='/api/admin/openai'){admin(session);return json(200,ai.public());}
      if(req.method==='GET'&&url.pathname==='/api/admin/whatsapp/automation'){admin(session);return json(200,automation.public());}
      if(req.method==='POST'&&url.pathname==='/api/admin/whatsapp/automation'){admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many settings attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,automation.save(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/admin/whatsapp'){admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many settings attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,whatsapp.save(user,body));}
      if(req.method==='GET'&&url.pathname==='/api/admin/google'){admin(session);return json(200,google.public());}
      if(req.method==='GET'&&url.pathname==='/api/admin/paystack'){admin(session);return json(200,payments.settings.public());}
      if(req.method==='POST'&&url.pathname==='/api/admin/paystack'){admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many configuration attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,payments.settings.save(user,body,payments.locks.size>0));}
      if(req.method==='POST'&&url.pathname==='/api/worker/catalog/analyze'){if(user.role!=='worker'||!business.canCatalog(user))throw new HttpError(403,'Catalog worker required');if(body.image&&body.consent!==true)throw new HttpError(400,'Photo sharing consent required');return json(200,await ai.response(user,'worker-extract',{text:'Suggest a JSON object with title, description and specs (plain string values) from this product description/photo. Mark unknown details unknown. Never infer certification or prices. Product notes: '+String(body.text||'').slice(0,2000),image:imageInput(body.image),language:body.language||'en',web:false}));}
      if(req.method==='POST'&&url.pathname==='/api/admin/paystack/test'){admin(session);if(!store.limit('paystack-test:'+user.id,3,60000))throw new HttpError(429,'Too many connection tests');await payments.api('/balance');return json(200,{ok:true,mode:'test',message:'Paystack authenticated the saved secret key. No payment was created.'});}
      if(req.method==='POST'&&url.pathname==='/api/admin/paystack/verify'){admin(session);const order=typeof body.orderId==='string'&&store.byId(body.orderId);if(!order)throw new HttpError(404,'Order not found');if(!store.limit('payment:'+order.id,10,60000))throw new HttpError(429,'Too many payment requests');return json(200,await payments.verify(order));}
      if(req.method==='POST'&&url.pathname==='/api/admin/google'){admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many configuration attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,google.save(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/admin/openai') {admin(session);if(!store.limit('integration-password:'+user.id,5,900000))throw new HttpError(429,'Too many configuration attempts');if(!await passwordMatches(body.password,user.password))throw new HttpError(403,'Current administrator password required');return json(200,ai.save(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/admin/openai/test'){admin(session);return json(200,await ai.response(user,'test',{text:'Reply with the word Ready.',language:'en'}));}
      if(req.method==='GET'&&url.pathname==='/api/catalog')return json(200,{products:catalog.list()});
      if(req.method==='GET'&&url.pathname==='/api/admin/catalog'){admin(session);return json(200,{products:catalog.list(true)});}
      if(req.method==='POST'&&url.pathname==='/api/admin/catalog/manual'){admin(session);return json(201,catalog.draft(user,{title:body.title}));}
      if(req.method==='POST'&&url.pathname==='/api/admin/catalog/discover'){admin(session);const image=imageInput(body.image);if(image&&body.photoConsent!==true)throw new HttpError(400,'Confirm permission to send the photo to OpenAI');const {images,...draft}=await catalog.discover(user,{text:body.text,image,language:body.language||'en'});Object.assign(draft,{workflow:'prototype',version:0,editedBy:user.id});catalog.save(draft);return json(201,{...draft,images});}
      if(req.method==='POST'&&url.pathname==='/api/admin/catalog/review'){admin(session);return json(200,catalog.review(user,body));}
      if(req.method==='POST'&&url.pathname==='/api/admin/catalog/arrange'){admin(session);return json(200,catalog.arrange(user,body.id,body.imageIds));}
      if(req.method==='POST'&&url.pathname==='/api/admin/catalog/remove-image'){admin(session);return json(200,catalog.removeImage(user,body.id,body.imageId));}
      if(req.method==='POST'&&productUpload){admin(session);const product=catalog.get(productUpload[1]);if(!product)throw new HttpError(404,'Product draft not found');if(!store.limit('catalog-images:'+user.id,50,3600000))throw new HttpError(429,'Image upload limit reached');return json(201,await catalog.addImage(user,product,await read(req,5242880)));}
      const productMedia=url.pathname.match(/^\/api\/catalog\/media\/([a-f0-9]{48})$/);
      if(req.method==='GET'&&productMedia){const media=catalog.media(user,productMedia[1]);res.writeHead(200,{'Content-Type':media.mime});fs.createReadStream(media.path).on('error',()=>res.destroy()).pipe(res);return;}
      if(req.method==='POST'&&url.pathname==='/api/ai/chat'){const image=imageInput(body.image);if(image&&body.photoConsent!==true)throw new HttpError(400,'Confirm permission to send the photo to OpenAI');const products=catalog.list();const context=products.map(p=>({sku:p.sku,title:p.title,description:p.description.slice(0,200),retailKobo:p.retailKobo,wholesaleKobo:p.wholesaleKobo,currency:'NGN',moq:p.moq,stockStatus:p.stockStatus}));const result=await ai.response(user,'chat',{text:body.text,image,language:body.language||'en',history:body.history,catalog:context,web:body.web===true});const words=typeof body.text==='string'?body.text.toLowerCase().split(/\s+/).filter(w=>w.length>2):[];const matches=products.filter(p=>result.answer.toLowerCase().includes(p.sku.toLowerCase())||words.some(w=>(p.title+' '+p.description).toLowerCase().includes(w))).slice(0,12);return json(200,{...result,products:matches});}
      if(req.method==='GET'&&url.pathname==='/api/config'){admin(session);return json(200,{paymentProvider:'paystack',...payments.settings.public(),emailConfigured:!!mailer,uploadsConfigured:!!settings.scanner});}
      if(req.method==='GET'&&url.pathname==='/api/orders'){const orders=user.role==='worker'?store.db.prepare('SELECT o.record FROM orders o JOIN assignments a ON a.order_id=o.id WHERE a.worker_id=? LIMIT 200').all(user.id).map(r=>JSON.parse(r.record)):store.orders(user);return json(200,{orders:orders.map(publicOrder)});}
      if(req.method==='GET'&&url.pathname==='/api/admin/users'){admin(session);return json(200,{users:store.db.prepare('SELECT id,email,role,active,verified,mfa_enabled FROM users LIMIT 200').all()});}
      if(req.method==='GET'&&url.pathname==='/api/admin/audit'){admin(session);return json(200,{events:store.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()});}
      if(req.method==='GET'&&url.pathname==='/api/admin/ledger'){admin(session);return json(200,{entries:store.db.prepare('SELECT * FROM ledger ORDER BY at DESC LIMIT 200').all()});}
      if(req.method==='POST'&&url.pathname==='/api/admin/users'){admin(session);if(!['worker','customer'].includes(body.role)||!emailValid(body.email))throw new HttpError(400,'Valid email and customer/worker role required');if(!mailer)throw new HttpError(503,'Email is not configured');const invited=await auth.create(body.email,randomBytes(32).toString('hex'),body.role);await sendLink(invited,'invite');store.audit(user.id,'account.invited',invited.id);return json(201,{user:auth.public(invited)});}
      if(req.method==='POST'&&url.pathname==='/api/admin/users/status'){admin(session);const target=auth.user(body.userId);if(!target||target.role==='admin'||typeof body.active!=='boolean')throw new HttpError(400,'Select a customer/worker and valid status');store.transaction(()=>{store.db.prepare('UPDATE users SET active=? WHERE id=?').run(body.active?1:0,target.id);store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);store.db.prepare('DELETE FROM challenges WHERE user_id=?').run(target.id);store.audit(user.id,body.active?'account.activated':'account.suspended',target.id);});return json(200,{ok:true});}
      if(req.method==='POST'&&url.pathname==='/api/admin/orders'){admin(session);const customer=auth.user(body.customerId);if(customer?.role!=='customer'||!customer.active||!customer.verified)throw new HttpError(400,'Select a verified active customer');let order;try{order=store.approve({id:body.id,email:customer.email,amountKobo:body.amountKobo,customerId:customer.id});}catch{throw new HttpError(400,'Invalid or duplicate order');}store.audit(user.id,'order.approved_by_admin',order.id);return json(201,{order:publicOrder(order)});}
      if(req.method==='POST'&&url.pathname==='/api/admin/orders/revoke'){admin(session);if(!store.byId(body.orderId))throw new HttpError(404,'Order not found');store.revoke(body.orderId);store.audit(user.id,'checkout.revoked',body.orderId);return json(200,{ok:true});}
      if(req.method==='POST'&&url.pathname==='/api/admin/assign'){admin(session);const worker=auth.user(body.workerId),order=store.byId(body.orderId);if(!order||worker?.role!=='worker'||!worker.active||!worker.verified)throw new HttpError(400,'Select a valid order and active worker');store.db.prepare('INSERT OR IGNORE INTO assignments VALUES(?,?)').run(order.id,worker.id);store.audit(user.id,'worker.assigned',order.id);return json(200,{ok:true});}
      if(req.method==='POST'&&['/api/paystack/initialize','/api/paystack/verify'].includes(url.pathname)){
        const order=typeof body.orderId==='string'?store.byId(body.orderId):typeof body.token==='string'&&store.byToken(body.token);
        if(!order||order.customerId!==user.id||order.revoked)throw new HttpError(404,'Checkout not found');
        if(!store.limit('payment:'+order.id,10,60000))throw new HttpError(429,'Too many payment requests');
        return json(200,url.pathname.endsWith('/initialize')?await payments.initialize(order):await payments.verify(order));
      }
      if(req.method==='POST'&&uploadMatch){const order=store.byId(uploadMatch[1]);if(!store.allowed(user,order,true))throw new HttpError(404,'Order not found');if(!store.limit('upload:'+user.id,10,3600000))throw new HttpError(429,'Upload limit reached');if(!settings.scanner)throw new HttpError(503,'Uploads require a configured malware scanner');return json(201,await files.upload(user,order,await read(req,5242880)));}
      if(req.method==='GET'&&uploadMatch){const order=store.byId(uploadMatch[1]);if(!store.allowed(user,order,true))throw new HttpError(404,'Order not found');return json(200,{files:store.db.prepare('SELECT id,mime,status,created FROM files WHERE order_id=? ORDER BY created DESC LIMIT 100').all(order.id)});}
      const downloadMatch=url.pathname.match(/^\/api\/files\/([a-f0-9]{48})$/);
      if(req.method==='GET'&&downloadMatch){const file=files.download(user,downloadMatch[1]);store.audit(user.id,'file.downloaded',file.row.id);res.writeHead(200,{'Content-Type':file.row.mime,'Content-Disposition':'attachment; filename="evidence.'+(file.row.mime==='application/pdf'?'pdf':file.row.mime==='image/png'?'png':'jpg')+'"'});fs.createReadStream(file.path).on('error',()=>res.destroy()).pipe(res);return;}
      throw new HttpError(404,'Not found');
    } catch (error) {
      if(!res.headersSent)json(error.status|| (error instanceof SyntaxError?400:502),{error:error.status?error.message:error instanceof SyntaxError?'Invalid JSON':'Service unavailable. Retry or contact support.'});
    } finally {if(hashing)authBusy--;}
  });
  server.requestTimeout=30000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=40;
  server.on('close',()=>{automation.close();notifications.close();const finish=()=>{if(ai.busy||automation.busy||notifications.busy){const timer=setTimeout(finish,50);timer.unref();}else store.close();};finish();});return server;
}
if(require.main===module){const settings=config(),server=createServer(settings);server.listen(settings.port,settings.host,()=>console.log('ChinaLowCost application: '+settings.appUrl));let stopping=false;const stop=()=>{if(stopping)return;stopping=true;server.close();server.closeIdleConnections();const deadline=setTimeout(()=>process.exit(1),55000);deadline.unref();};process.on('SIGTERM',stop);process.on('SIGINT',stop);}
module.exports = { createServer };
