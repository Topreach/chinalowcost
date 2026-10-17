const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const {webcrypto}=require('node:crypto');
(async()=>{
const html=fs.readFileSync('outputs/Connected-Storefront.html','utf8'),original=fs.readFileSync('outputs/Screen-Blueprint.html','utf8');
assert.equal(html.match(/<style>([\s\S]*?)<\/style>/)[1],original.match(/<style>([\s\S]*?)<\/style>/)[1],'Original CSS is unchanged');
const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const elements={},get=id=>elements[id]||(elements[id]={innerHTML:'',textContent:'',value:'',style:{},checked:false,open:false,showModal(){this.open=true;},close(){this.open=false;},focus(){},setAttribute(){},querySelector(){return null;}});
let listener,hash='#C02';const requests=[],parent={postMessage(message){requests.push(message);let data;if(message.action==='me')data={user:null};else if(message.action==='catalog')data={products:[]};else throw Error('Unexpected boot request '+message.action);queueMicrotask(()=>listener({source:parent,data:{channel:'clc-server-auth-reply',id:message.id,data}}));}};
const messageListeners=[];
const context=vm.createContext({crypto:webcrypto,TextEncoder,parent,document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){},title:'',body:{appendChild(){}},createElement(){return {click(){},remove(){}};}},window:{addEventListener(type,fn){if(type==='message'){messageListeners.push(fn);listener=event=>messageListeners.forEach(f=>f(event));}},scrollTo(){}},location:{get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}},localStorage:{getItem(){throw Error('sandbox');},setItem(){throw Error('No browser data writes allowed');}},sessionStorage:{getItem(){throw Error('sandbox');},setItem(){throw Error('No browser credentials allowed');}},URL,Blob,ArrayBuffer,console,setTimeout:()=>1,clearTimeout(){}});
const run=s=>vm.runInContext(s,context);run(source);for(let i=0;i<8;i++)await new Promise(setImmediate);
assert.equal(run('authBooted'),true);assert.equal(run('authDatabase.users.length'),0);assert.equal(run('products.length'),0);assert(get('app').innerHTML.includes('A world of goods.'));
assert(!get('app').innerHTML.includes('INTERACTIVE PROTOTYPE'));
assert(!get('app').innerHTML.includes('No live transactions'));
assert(!get('app').innerHTML.includes('Preview screen state'));
assert(!get('app').innerHTML.includes('openPageMap()'));
assert(!get('app').innerHTML.includes('resetDemo()'));
assert(get('app').innerHTML.includes('Preview application'));
assert(get('app').innerHTML.includes('id="clc-chat-launcher"'));
run('connectedOpenChatWidget()');assert(get('app').innerHTML.includes('Sign in to chat'));run('connectedCloseChatWidget()');assert(!get('app').innerHTML.includes('id="clc-chat-panel"'));
run(`connectedSetSession({user:{id:'worker',email:'worker@example.test',role:'worker'}});connectedHydrate({profile:null,staff:[{id:'worker',name:'Worker',role:'Fieldworker',status:'Active',verified:true}],tasks:[],quotes:[],drafts:[],rates:[],suppliers:[]},[]);`);
const pages=run('PAGES');let checked=0;
for(const role of ['customer','worker','admin']){
 run(`connectedSetSession({user:{id:'${role}',email:'${role}@example.test',role:'${role}'}});connectedHydrate({profile:{address:{name:'',phone:'',state:'Lagos',town:'Ikeja',street:''},addresses:[],saved:[]},cart:{revision:0,lines:[],priced:[],issues:[],goodsKobo:0},staff:[{id:'worker',name:'Worker',role:'Fieldworker',status:'Active',verified:true}],tasks:[],quotes:[],drafts:[],rates:[],suppliers:[]},[]);`);
 for(const page of pages.filter(p=>p.Application.toLowerCase()===role)){hash='#'+page.ID;try{run('render()');checked++;}catch(e){throw Error(page.ID+': '+e.stack);}}
}
assert.equal(checked,86);
run("enterpriseReport={environment:'test',registeredCustomers:2,paidOrders:0,grossKobo:0,walletKobo:0,refundedKobo:0,ledger:[],customers:[{id:'C',email:'<unsafe>@example.test',orders:0,units:0,spentKobo:0}],productsSold:[],sales:[],collections:[],movements:[]}");
const records=run('enterpriseReporting()');assert(records.includes('Customer purchase history'));assert(records.includes('Goods received and supplier origin'));assert(!records.includes('<unsafe>'));run('enterpriseReport=null');
run('connectedSetSession({});connectedGooglePublic={signInEnabled:false}');
for(const [page,mode,label]of [['C01','login','Sign in with Google'],['C23','signup','Sign up with Google']]){hash='#'+page;const disabled=run('authAccessPage("customer","'+mode+'")');assert(disabled.includes(label));assert(/id="customer-google-auth"[^>]*disabled/.test(disabled));assert(disabled.indexOf('id="customer-google-auth"')>disabled.indexOf('<form'));assert(disabled.indexOf('id="customer-google-auth"')<disabled.indexOf('</form>'));run('connectedGooglePublic={signInEnabled:true}');const enabled=run('authAccessPage("customer","'+mode+'")');assert(!/id="customer-google-auth"[^>]*disabled/.test(enabled));assert(enabled.includes('type="button" id="customer-google-auth"'));run('connectedGooglePublic={signInEnabled:false}');}
assert(!run('authAccessPage("worker")').includes('customer-google-auth'));assert(!run('authAccessPage("admin")').includes('customer-google-auth'));assert(!run('authAccessPage("customer","reset")').includes('customer-google-auth'));
// Exercise the actual connected form handlers rather than only their rendered markup.
for(const role of ['customer','worker','admin'])assert(!run(`authAccessPage('${role}')`).includes('id="auth-otp"'),'Initial login only asks for email/password');
run(`connectedRequest=async()=>({factorRequired:true,challenge:'a'.repeat(64)});`);
get('auth-email').value='factor@example.test';get('auth-password').value='LongPassword123';await run(`authLoginForm('worker')`);
assert(get('app').innerHTML.includes('Verify and sign in'));assert(!get('app').innerHTML.includes('id="auth-password"'));assert.equal(run('connectedUser'),null);
run('connectedLoginChallenge=null');
run(`globalThis.authTestCalls=0;globalThis.authTestError='Invalid credentials, verification or authenticator code';connectedRequest=async action=>{authTestCalls++;throw Error(authTestError);};`);
for(const role of ['customer','worker','admin']){
 get('auth-email').value='wrong@example.test';get('auth-password').value='WrongPassword123';
 await run(`authLoginForm('${role}')`);
 assert.match(get('auth-status').textContent,/Check your email and password/);
 assert.equal(get('auth-password').value,'');assert.equal(run('connectedAuthBusy'),false);
}
get('auth-name').value='Customer';get('auth-email').value='customer@example.test';get('auth-password').value='short';get('auth-confirm').value='short';
const prior=run('authTestCalls');await run(`authSignupForm('customer')`);assert.match(get('auth-status').textContent,/12–128/);assert.equal(run('authTestCalls'),prior);
get('auth-password').value='LongPassword123';get('auth-confirm').value='DifferentPassword123';await run(`authSignupForm('customer')`);assert.match(get('auth-status').textContent,/do not match/);
get('auth-confirm').value='LongPassword123';run(`authTestError='Email is not configured'`);await run(`authSignupForm('customer')`);assert.equal(get('auth-status').textContent,'Email is not configured');assert.equal(run('connectedAuthBusy'),false);

run(`connectedSetSession({user:{id:'customer',email:'customer@example.test',role:'customer'}});connectedHydrate({profile:{address:{state:'Lagos',town:'Ikeja'},addresses:[],saved:[]},cart:{revision:0,lines:[],priced:[],issues:[],goodsKobo:0},staff:[],tasks:[],quotes:[],drafts:[]},[]);`);
hash='#C02';run('connectedOpenChatWidget()');assert(get('app').innerHTML.includes('id="clc-chat-panel"'));hash='#C18';run('render()');assert.equal([...get('app').innerHTML.matchAll(/id="message-input"/g)].length,1);assert(!get('app').innerHTML.includes('id="clc-chat-panel"'));run('connectedCloseChatWidget()');
run(`products.push({...connectedBlankProduct,id:'SAFE-SKU',name:'<img src=x onerror=alert(1)>',category:'Electronics',images:[],specs:{}});state.selected='SAFE-SKU';`);
for(const page of ['C02','C03','C07','C17','A07']){hash='#'+page;run('render()');assert(!get('app').innerHTML.includes('<img src=x onerror='),page+' escapes database product titles');}
hash='#C05';run('render()');assert(get('app').innerHTML.includes('connectedPhotoSearch()'));assert(!get('app').innerHTML.includes('Use sample photo'));
assert(!html.includes('href="http://localhost:3000/"'));
console.log('PASS: all 86 original screens render with server adapters and an empty database; original CSS unchanged; no demo account bootstrap or browser authority storage.');
})().catch(e=>{console.error(e);process.exitCode=1;});
