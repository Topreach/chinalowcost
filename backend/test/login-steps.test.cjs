const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../store.cjs'),{Auth,totp}=require('../auth.cjs');
test('two-step login issues no session before MFA and rejects reused, expired and password-invalidated challenges',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clc-login-')),store=new Store(path.join(dir,'app.sqlite')),auth=new Auth(store,{file:store.file,encryptionKeyHex:'ab'.repeat(32)});t.after(()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});});
 const user=await auth.create('login@example.test','SafeLongPassword2026','worker',true);
 assert.equal(await auth.beginLogin(user.email,'incorrect'),null);
 assert((await auth.beginLogin(user.email,'SafeLongPassword2026')).token);
 const secret=auth.enroll(user);store.db.prepare('UPDATE users SET mfa_enabled=1 WHERE id=?').run(user.id);store.db.prepare('DELETE FROM sessions').run();
 const first=await auth.beginLogin(user.email,'SafeLongPassword2026');assert(first.factorRequired);assert(!first.token);assert.equal(store.db.prepare('SELECT count(*) n FROM sessions').get().n,0);
 assert.equal(auth.finishLogin(first.challenge,'bad'),null);assert(auth.finishLogin(first.challenge,totp(secret)).token);assert.equal(auth.finishLogin(first.challenge,totp(secret)),null);
 const expired=await auth.beginLogin(user.email,'SafeLongPassword2026');store.db.prepare('UPDATE login_factors SET expires=0').run();assert.equal(auth.finishLogin(expired.challenge,totp(secret)),null);
 const limited=await auth.beginLogin(user.email,'SafeLongPassword2026');for(let i=0;i<5;i++)assert.equal(auth.finishLogin(limited.challenge,'bad'),null);assert.equal(auth.finishLogin(limited.challenge,totp(secret)),null);
 const changed=await auth.beginLogin(user.email,'SafeLongPassword2026');store.db.prepare('UPDATE users SET password=? WHERE id=?').run('changed',user.id);assert.equal(auth.finishLogin(changed.challenge,totp(secret)),null);
});
