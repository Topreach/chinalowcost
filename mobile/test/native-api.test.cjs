const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const load=()=>import('../src/native-api.mjs');
test('native API pins the server, preserves CSRF, keeps cookies out of replies and fixes public image URLs',async()=>{
 const {createNativeFetch}=await load(),calls=[],api=createNativeFetch({origin:'https://chinalowcost.com',request:async options=>{calls.push(options);return {status:200,headers:{'Set-Cookie':'private-session','Content-Type':'application/json'},data:{user:{id:'one'},products:[{images:[{url:'/api/storefront/media/abc'}]}]}};}});
 const response=await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':'csrf-value',Origin:'https://evil.example',Cookie:'forged'},body:'{"email":"a@example.test"}'});
 assert.equal(calls[0].url,'https://chinalowcost.com/api/auth/login');assert.equal(calls[0].headers.Origin,'https://chinalowcost.com');assert.equal(calls[0].headers['x-csrf-token'],'csrf-value');assert.equal(calls[0].headers.Cookie,undefined);assert.equal(calls[0].disableRedirects,true);assert.equal(response.headers.get('set-cookie'),null);assert.equal((await response.json()).products[0].images[0].url,'https://chinalowcost.com/api/storefront/media/abc');
 await assert.rejects(api('https://evil.example/api/auth/login'),/restricted/);await assert.rejects(api('/google-login'),/restricted/);assert.equal(calls.length,1);
});
test('native media upload sends bytes as base64 without corrupting binary, and downloads decode correctly',async()=>{
 const {createNativeFetch}=await load(),calls=[],api=createNativeFetch({origin:'https://chinalowcost.com',request:async options=>{calls.push(options);return options.method==='POST'?{status:201,headers:{'Content-Type':'application/json'},data:{ok:true}}:{status:200,headers:{'Content-Type':'image/png'},data:Buffer.from([0,255,1,128]).toString('base64')};}});
 await api('/api/business/catalog/draft/images',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:new Uint8Array([0,255,1,128]).buffer});assert.equal(calls[0].dataType,'file');assert.deepEqual([...Buffer.from(calls[0].data,'base64')],[0,255,1,128]);assert.deepEqual([...new Uint8Array(await(await api('/api/catalog/media/image')).arrayBuffer())],[0,255,1,128]);await assert.rejects(api('/api/upload',{method:'POST',body:new Uint8Array(5242881)}),/5 MB/);
});
test('mobile config bundles local assets, does not allow cleartext, and excludes production secrets',()=>{
 const dir=path.resolve(__dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(dir,'capacitor.config.json')));assert.equal(cfg.server.url,undefined);assert.equal(cfg.server.cleartext,false);assert.equal(cfg.appId,'com.chinalowcost.app');
 const www=path.join(dir,'www'),html=fs.readFileSync(path.join(www,'index.html'),'utf8'),host=fs.readFileSync(path.join(www,'host.js'),'utf8');assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));assert(host.includes("frame.src='frame.html'"));assert(!host.includes('googlePopup=window.open'));assert(host.includes('window.clcMobile.location()'));
 for(const name of fs.readdirSync(www))assert(!/\.env|sqlite|\.pem|\.key$/.test(name));
});
