const { randomBytes, scrypt: scryptCallback, timingSafeEqual, createHmac, createCipheriv, createDecipheriv } = require('node:crypto');
const { promisify } = require('node:util');
const { digest } = require('./store.cjs');
const scrypt = promisify(scryptCallback);
const random = () => randomBytes(32).toString('hex');
const emailValid = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function passwordValid(password) { return typeof password === 'string' && password.length >= 12 && password.length <= 128 && !['password123456','123456789012','Password123!'].includes(password); }
async function passwordHash(password) { if (!passwordValid(password)) throw Error('Use a password with 12–128 characters'); const salt = randomBytes(16).toString('hex'); return 'scrypt:3:' + salt + ':' + (await scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 })).toString('hex'); }
async function passwordMatches(password, stored) { if (typeof password !== 'string' || password.length > 128) return false; const parts=stored.split(':');const [salt,hash]=parts.length===4?parts.slice(2):parts;const p=parts.length===4?Number(parts[1]):1;if(![1,3].includes(p)||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(hash||''))return false;const result = await scrypt(password, salt, 64, { N: 32768, r: 8, p, maxmem: 64 * 1024 * 1024 }); return timingSafeEqual(result, Buffer.from(hash, 'hex')); }
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes) { let bits = ''; for (const b of bytes) bits += b.toString(2).padStart(8,'0'); let output = ''; for (let i=0;i<bits.length;i+=5) output += alphabet[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)]; return output; }
function fromBase32(text) { const bits = [...text].map(c => alphabet.indexOf(c).toString(2).padStart(5,'0')).join(''); return Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b,2))); }
function totp(secret, step = Math.floor(Date.now()/30000)) { const counter=Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); const hash=createHmac('sha1',fromBase32(secret)).update(counter).digest(); const offset=hash[19]&15; return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0'); }
class Auth {
  constructor(store, settings) { this.store=store; this.db=store.db; this.settings={...settings,encryptionKey:settings.encryptionKey||require('./security.cjs').encryptionKey(settings.file,settings.encryptionKeyHex)}; this.dummy=null;this.db.exec('CREATE TABLE IF NOT EXISTS account_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),record TEXT NOT NULL); CREATE TABLE IF NOT EXISTS mfa_recovery(user_id TEXT NOT NULL REFERENCES users(id),hash TEXT PRIMARY KEY);'); }
  profile(user){const r=this.db.prepare('SELECT record FROM account_profiles WHERE user_id=?').get(user.id);return r?JSON.parse(r.record):{name:'',phone:'',language:'en'};}
  saveProfile(user,b){if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120||/[\x00-\x1f]/.test(b.name)||typeof b.phone!=='string'||b.phone.length>40||! /^[+0-9 ()-]*$/.test(b.phone)||!['en','yo','ha','ig'].includes(b.language))throw new (require('./security.cjs').HttpError)(400,'Check display name, phone and language');const p={name:b.name.trim(),phone:b.phone.trim(),language:b.language};this.db.prepare('INSERT INTO account_profiles VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET record=excluded.record').run(user.id,JSON.stringify(p));this.store.audit(user.id,'profile.saved',user.id);return p;}
  recoveryCodes(user){this.db.prepare('DELETE FROM mfa_recovery WHERE user_id=?').run(user.id);const codes=Array.from({length:10},()=>randomBytes(12).toString('hex').toUpperCase());for(const code of codes)this.db.prepare('INSERT INTO mfa_recovery VALUES(?,?)').run(user.id,digest(code));return codes.map(c=>c.match(/.{4}/g).join('-'));}
  factor(user,code){if(this.consumeOtp(user,code))return true;if(typeof code!=='string')return false;const normalized=code.replace(/-/g,'').toUpperCase();if(!/^[A-F0-9]{24}$/.test(normalized))return false;return this.db.prepare('DELETE FROM mfa_recovery WHERE user_id=? AND hash=?').run(user.id,digest(normalized)).changes===1;}
  encrypt(text) { const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.settings.encryptionKey,iv); const data=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]); return [iv,cipher.getAuthTag(),data].map(x=>x.toString('hex')).join('.'); }
  decrypt(text) { const [iv,tag,data]=text.split('.').map(x=>Buffer.from(x,'hex')); const cipher=createDecipheriv('aes-256-gcm',this.settings.encryptionKey,iv); cipher.setAuthTag(tag); return Buffer.concat([cipher.update(data),cipher.final()]).toString(); }
  async create(email,password,role='customer',verified=false,afterCreate=null) {
    if (!emailValid(email) || !['customer','worker','admin'].includes(role)) throw Error('Invalid account details');
    const hash=await passwordHash(password),id=randomBytes(16).toString('hex');
    const save=()=>{this.db.prepare('INSERT INTO users(id,email,role,password,verified) VALUES(?,?,?,?,?)').run(id,email.toLowerCase(),role,hash,verified?1:0);this.store.audit(id,'account.created',id);const user=this.user(id);if(afterCreate)afterCreate(user);return user;};return afterCreate?this.store.transaction(save):save();
  }
  user(id) { return this.db.prepare('SELECT * FROM users WHERE id=?').get(id); }
  public(user) { return {id:user.id,email:user.email,name:this.profile(user).name||user.email,language:this.profile(user).language,role:user.role,verified:!!user.verified,mfaEnabled:!!user.mfa_enabled}; }
  issue(user,mfa=false) { const token=random(),csrf=random(),now=Date.now(); this.db.prepare('DELETE FROM sessions WHERE created<? OR seen<?').run(now-43200000,now-1800000); this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?)').run(digest(token),user.id,csrf,now,now,mfa?1:0); return {token,csrf,user:this.public(user),mfaRequired:false}; }
  cookie(token,maxAge=43200) { return `${this.settings.secure?'__Host-clc_session':'clc_session'}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.settings.secure?'; Secure':''}`; }
  session(req) { const name=this.settings.secure?'__Host-clc_session':'clc_session'; const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1); if(!token||!/^[a-f0-9]{64}$/.test(token))return null; const hash=digest(token),s=this.db.prepare('SELECT * FROM sessions WHERE hash=?').get(hash),now=Date.now(); if(!s)return null; const user=this.user(s.user_id); if(!user?.active||!user.verified||user.mfa_enabled&&!s.mfa||s.created<now-43200000||s.seen<now-1800000){this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash);return null;}this.db.prepare('UPDATE sessions SET seen=? WHERE hash=?').run(now,hash); return {...s,user}; }
  async login(email,password,otp) { const user=emailValid(email)?this.db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()):null; this.dummy ||= passwordHash(random()); const good=await passwordMatches(password,user?.password||await this.dummy); if(!good||!user?.active||!user.verified)return null; if(user.mfa_enabled&&!this.factor(user,otp))return null; this.store.audit(user.id,'session.login',user.id); return this.issue(user,!!user.mfa_enabled); }
  async beginLogin(email,password){
    const user=emailValid(email)?this.db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()):null;
    this.dummy ||= passwordHash(random());
    if(!await passwordMatches(password,user?.password||await this.dummy)||!user?.active||!user.verified)return null;
    if(!user.mfa_enabled){this.store.audit(user.id,'session.login',user.id);return this.issue(user,false);}
    this.db.exec('CREATE TABLE IF NOT EXISTS login_factors(hash TEXT PRIMARY KEY,user_id TEXT,password_hash TEXT,expires INTEGER,attempts INTEGER)');
    this.db.prepare('DELETE FROM login_factors WHERE expires<? OR user_id=?').run(Date.now(),user.id);
    const token=random();this.db.prepare('INSERT INTO login_factors VALUES(?,?,?,?,0)').run(digest(token),user.id,digest(user.password),Date.now()+300000);
    return {factorRequired:true,challenge:token};
  }
  finishLogin(token,otp){
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
    this.db.exec('CREATE TABLE IF NOT EXISTS login_factors(hash TEXT PRIMARY KEY,user_id TEXT,password_hash TEXT,expires INTEGER,attempts INTEGER)');
    return this.store.transaction(()=>{
      const hash=digest(token),challenge=this.db.prepare('SELECT * FROM login_factors WHERE hash=?').get(hash);
      if(!challenge)return null;
      const user=this.user(challenge.user_id);
      if(challenge.expires<Date.now()||challenge.attempts>=5||!user?.active||!user.verified||!user.mfa_enabled||digest(user.password)!==challenge.password_hash){this.db.prepare('DELETE FROM login_factors WHERE hash=?').run(hash);return null;}
      this.db.prepare('UPDATE login_factors SET attempts=attempts+1 WHERE hash=?').run(hash);
      if(!this.factor(user,otp))return null;
      this.db.prepare('DELETE FROM login_factors WHERE hash=?').run(hash);
      this.store.audit(user.id,'session.login',user.id);return this.issue(user,true);
    });
  }
  enroll(user) { if(user.mfa_enabled)throw Error('MFA already enabled');const secret=base32(randomBytes(20));this.db.prepare('UPDATE users SET mfa_secret=?,mfa_step=-1 WHERE id=?').run(this.encrypt(secret),user.id);return secret; }
  consumeOtp(user,code) { if(!/^\d{6}$/.test(code||'')||!user.mfa_secret)return false;const secret=this.decrypt(user.mfa_secret),now=Math.floor(Date.now()/30000);for(const step of [now-1,now,now+1])if(step>user.mfa_step&&totp(secret,step)===code){return this.db.prepare('UPDATE users SET mfa_step=? WHERE id=? AND mfa_step<?').run(step,user.id,step).changes===1;}return false; }
  confirmMfa(session,code) {return this.store.transaction(()=>{const user=this.user(session.user.id);if(user.mfa_enabled||!this.consumeOtp(user,code))return null;this.db.prepare('UPDATE users SET mfa_enabled=1 WHERE id=?').run(user.id);this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);const recoveryCodes=this.recoveryCodes(user);this.store.audit(user.id,'mfa.enabled',user.id);return {...this.issue(this.user(user.id),true),recoveryCodes};}); }
  challenge(user,kind) { const token=random();this.db.prepare('DELETE FROM challenges WHERE user_id=? AND kind=?').run(user.id,kind);this.db.prepare('INSERT INTO challenges VALUES(?,?,?,?)').run(digest(token),user.id,kind,Date.now()+1800000);return token; }
  async consumeChallenge(token,kind,password) { if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;const hash=digest(token),c=this.db.prepare('SELECT * FROM challenges WHERE hash=? AND kind=? AND expires>?').get(hash,kind,Date.now());if(!c)return false;const user=this.user(c.user_id);if(!user?.active)return false;const newHash=kind!=='verify'?await passwordHash(password):null;return this.store.transaction(()=>{if(!this.db.prepare('DELETE FROM challenges WHERE hash=?').run(hash).changes)return false;if(kind==='verify')this.db.prepare('UPDATE users SET verified=1 WHERE id=?').run(user.id);else {this.db.prepare('UPDATE users SET password=?,verified=? WHERE id=?').run(newHash,kind==='invite'?1:user.verified,user.id);this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);}this.store.audit(user.id,'account.'+kind,user.id);return true;}); }
  async changePassword(session,current,next) { if(!await passwordMatches(current,session.user.password))return false; const hash=await passwordHash(next); this.store.transaction(()=>{this.db.prepare('UPDATE users SET password=? WHERE id=?').run(hash,session.user.id);this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(session.user.id);this.db.prepare('DELETE FROM challenges WHERE user_id=?').run(session.user.id);this.store.audit(session.user.id,'password.changed',session.user.id);});return true; }
}
module.exports={Auth,passwordHash,passwordMatches,passwordValid,emailValid,totp};
