const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const digest = value => createHash('sha256').update(value).digest('hex');
class Store {
  constructor(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file) && fs.readFileSync(file).subarray(0,1).toString()==='{') throw Error('Legacy JSON found; preserve it and set DATABASE_FILE to a new SQLite path');
    this.file = file; this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL CHECK(role IN ('customer','worker','admin')),password TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,mfa_secret TEXT,mfa_enabled INTEGER NOT NULL DEFAULT 0,mfa_step INTEGER NOT NULL DEFAULT -1);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,created INTEGER NOT NULL,seen INTEGER NOT NULL,mfa INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS challenges(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,reference TEXT UNIQUE NOT NULL,token_hash TEXT UNIQUE,customer_id TEXT REFERENCES users(id),record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT,action TEXT NOT NULL,object_id TEXT);
      CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until_time INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS assignments(order_id TEXT NOT NULL REFERENCES orders(id),worker_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(order_id,worker_id));
      CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),owner_id TEXT NOT NULL REFERENCES users(id),mime TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ledger(reference TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),amount_kobo INTEGER NOT NULL,currency TEXT NOT NULL,at TEXT NOT NULL);`);
    this.db.exec('CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(until_time); CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);');
    this.growth=new (require('./growth.cjs').Growth)(this);this.inventory=new (require('./inventory.cjs').Inventory)(this);
  }
  close() { if(!this.closed){this.db.close();this.closed=true;} }
  transaction(action) { this.db.exec('BEGIN IMMEDIATE'); try { const result=action();this.db.exec('COMMIT');return result; } catch(e){this.db.exec('ROLLBACK');throw e;} }
  audit(actor,action,id=null) {const event=this.db.prepare('INSERT INTO audit(at,actor,action,object_id) VALUES(?,?,?,?)').run(new Date().toISOString(),actor||null,action,id);if(this.notifications)this.notifications.event(Number(event.lastInsertRowid),actor,action,id);if(['order.cancelled','wallet.checkout_cancelled'].includes(action))this.supplierPortal?.cancelOrder(id);}
  save(order) {
    const {token,...record}=order;
    this.transaction(()=>{const current=this.byId(order.id);const next={...record,...(current?.revoked?{revoked:true}:{})};this.db.prepare('UPDATE orders SET record=? WHERE id=?').run(JSON.stringify(next),order.id);if(order.status==='paid')this.db.prepare('INSERT OR IGNORE INTO ledger VALUES(?,?,?,?,?)').run(order.reference,order.id,order.amountKobo,order.currency,order.paidAt);});
  }
  markPaid(order){this.transaction(()=>this.markPaidInside(order));}
  markPaidInside(order){const current=this.byId(order.id);if(current.status==='paid'){Object.assign(order,current);return;}const {token,...next}={...current,status:'paid',paidAt:order.paidAt,transactionId:order.transactionId};this.db.prepare('UPDATE orders SET record=? WHERE id=?').run(JSON.stringify(next),order.id);this.db.prepare('INSERT INTO ledger VALUES(?,?,?,?,?)').run(next.reference,next.id,next.amountKobo,next.currency,next.paidAt);this.growth.paid(next);this.inventory.paidInside(next);this.audit(null,'order.paid',next.id);Object.assign(order,next);}
  claimReceipt(id){return this.transaction(()=>{const order=this.byId(id);if(order.receipt!=='pending')return null;order.receipt='sending';this.db.prepare('UPDATE orders SET record=? WHERE id=?').run(JSON.stringify(order),id);return order;});}
  approve({ id, email, amountKobo, customerId }) {
    if (typeof id!=='string'||typeof email!=='string'||email.length>254||!/^[A-Za-z0-9-]{1,80}$/.test(id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isSafeInteger(amountKobo) || amountKobo <= 0) throw Error('Expected order id, valid email and positive integer amountKobo');
    if(amountKobo>10000000000)throw Error('Order amount exceeds allowed maximum');
    if (this.byId(id)) throw Error('Order already exists; approved amounts are immutable');
    const user=this.db.prepare('SELECT id FROM users WHERE email=? AND role=? AND active=1 AND verified=1').get(email.toLowerCase(),'customer');
    const token=randomBytes(32).toString('hex');
    const order = { id, email:email.toLowerCase(),customerId:customerId||user?.id||null, amountKobo, currency: 'NGN', reference: 'CLC-' + randomBytes(16).toString('hex'), status: 'approved', paymentEnvironment:this.paymentMode||'test',createdAt: new Date().toISOString(), expiresAt: Date.now() + 86400000, receipt: 'pending' };
    this.db.prepare('INSERT INTO orders VALUES(?,?,?,?,?)').run(id,order.reference,digest(token),order.customerId,JSON.stringify(order));this.audit(null,'order.approved',id);return {...order,token};
  }
  parse(row){return row?JSON.parse(row.record):undefined;}
  byId(id){return this.parse(this.db.prepare('SELECT record FROM orders WHERE id=?').get(id));}
  byToken(token) { return this.parse(this.db.prepare('SELECT record FROM orders WHERE token_hash=?').get(digest(token))); }
  byReference(reference) { return this.parse(this.db.prepare('SELECT record FROM orders WHERE reference=?').get(reference)); }
  orders(user){return this.db.prepare(user.role==='admin'?'SELECT record FROM orders ORDER BY rowid DESC LIMIT 200':'SELECT record FROM orders WHERE customer_id=? ORDER BY rowid DESC LIMIT 200').all(...(user.role==='admin'?[]:[user.id])).map(row=>this.parse(row));}
  allowed(user,order,worker=false){return !!order&&(user.role==='admin'||order.customerId===user.id||(worker&&user.role==='worker'&&!!this.db.prepare('SELECT 1 FROM assignments WHERE order_id=? AND worker_id=?').get(order.id,user.id)));}
  revoke(id){this.transaction(()=>{const order=this.byId(id);if(!order)throw Error('Unknown order');order.revoked=true;this.db.prepare('UPDATE orders SET token_hash=NULL,record=? WHERE id=?').run(JSON.stringify(order),id);this.supplierPortal?.cancelOrder(id);});}
  limit(key,max,windowMs){const now=Date.now();return this.transaction(()=>{this.db.prepare('DELETE FROM rate_limits WHERE until_time<?').run(now);const row=this.db.prepare('SELECT count FROM rate_limits WHERE key=?').get(key);if(row&&row.count>=max)return false;this.db.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+windowMs);return true;});}
}
module.exports = { Store,digest };
