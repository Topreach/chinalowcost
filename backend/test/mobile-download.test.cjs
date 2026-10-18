const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {androidDownload}=require('../mobile-download.cjs');
test('public Android endpoint serves a fixed package, supports HEAD and fails safely before upload',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clc-apk-')),file=path.join(dir,'test.apk'),server=http.createServer((req,res)=>{try{androidDownload(req,res,file);}catch(e){res.writeHead(e.status||500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});const url='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(url)).status,404);fs.writeFileSync(file,'not an apk');assert.equal((await fetch(url)).status,503);
 const data=Buffer.from([80,75,3,4,1,2,3,4]);fs.writeFileSync(file,data);const response=await fetch(url+'?file=private.sqlite');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/vnd.android.package-archive');assert.equal(response.headers.get('cache-control'),'no-store');assert(response.headers.get('content-disposition').includes('ChinaLowCost-android.apk'));assert.deepEqual(Buffer.from(await response.arrayBuffer()),data);
 const head=await fetch(url,{method:'HEAD'});assert.equal(head.headers.get('content-length'),'8');assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal((await fetch(url,{method:'POST'})).status,405);
});
