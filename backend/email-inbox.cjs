const {randomBytes}=require('node:crypto');
const {HttpError}=require('./security.cjs');
const {emailValid}=require('./auth.cjs');
const {digest}=require('./store.cjs');
class EmailInbox {
 constructor(store,auth,email,deps={}){
  Object.assign(this,{store,db:store.db,auth,email,deps});this.busy=false;this.closed=false;this.lastSync=null;this.lastError='';
  this.db.exec(`CREATE TABLE IF NOT EXISTS email_inbox(id INTEGER PRIMARY KEY,source_key TEXT UNIQUE NOT NULL,record TEXT NOT NULL,created INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'Open');
   CREATE TABLE IF NOT EXISTS email_cursors(account TEXT PRIMARY KEY,validity TEXT NOT NULL,last_uid INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS email_replies(id INTEGER PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,email_id INTEGER NOT NULL REFERENCES email_inbox(id),actor TEXT NOT NULL,record TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL);`);
  this.db.prepare("UPDATE email_replies SET state='uncertain' WHERE state='sending'").run();
 }
 start(){this.timer=setInterval(()=>this.tick().catch(()=>{}),60000);this.timer.unref();}
 close(){this.closed=true;clearInterval(this.timer);this.client?.close();}
 async tick(){if(this.closed||this.busy||!this.email.current()?.inboundEnabled||this.email.settings.maintenanceFile&&require('node:fs').existsSync(this.email.settings.maintenanceFile))return;return this.sync();}
 status(){return {busy:this.busy,lastSync:this.lastSync,lastError:this.lastError};}
 list(before){const cursor=before?Number(before):Number.MAX_SAFE_INTEGER;if(!Number.isSafeInteger(cursor)||cursor<1)throw new HttpError(400,'Invalid email cursor');const rows=this.db.prepare('SELECT * FROM email_inbox WHERE id<? ORDER BY id DESC LIMIT 50').all(cursor);return {messages:rows.map(r=>{const m=JSON.parse(this.auth.decrypt(r.record));return {id:r.id,status:r.status,created:r.created,from:m.from,subject:m.subject,preview:m.text.slice(0,180),attachmentCount:m.attachmentCount};}),nextBefore:rows.length===50?rows.at(-1).id:null,openCount:this.db.prepare("SELECT count(*) n FROM email_inbox WHERE status='Open'").get().n,...this.status()};}
 detail(id){const row=this.db.prepare('SELECT * FROM email_inbox WHERE id=?').get(Number(id));if(!row)throw new HttpError(404,'Email not found');return {id:row.id,status:row.status,created:row.created,...JSON.parse(this.auth.decrypt(row.record)),replies:this.db.prepare('SELECT * FROM email_replies WHERE email_id=? ORDER BY id').all(row.id).map(r=>({id:r.id,state:r.state,created:r.created,...JSON.parse(this.auth.decrypt(r.record))}))};}
 import(key,mail){
  const from=mail.from?.value;if(!Array.isArray(from)||from.length!==1||!emailValid(from[0].address)||/[<>,;:\s]/.test(from[0].address))return false;
  const messageId=typeof mail.messageId==='string'&&/^<[^<>\s]{1,250}>$/.test(mail.messageId)?mail.messageId:null;
  const record={from:from[0].address.toLowerCase(),senderName:String(from[0].name||'').slice(0,160),subject:String(mail.subject||'(No subject)').replace(/[\r\n]/g,' ').slice(0,240),text:String(mail.text||'(No plain-text body. Open this email in your provider webmail.)').slice(0,16000),messageId,attachmentCount:mail.attachments?.length||0};
  const result=this.db.prepare('INSERT OR IGNORE INTO email_inbox(source_key,record,created) VALUES(?,?,?)').run(key,this.auth.encrypt(JSON.stringify(record)),Date.now());
  if(result.changes){const id=Number(result.lastInsertRowid);this.store.audit(null,'email.received',String(id));
   if(this.store.notifications)for(const user of this.db.prepare("SELECT id,role FROM users WHERE role='admin' AND active=1 AND verified=1").all())if(this.store.operations?.scopes(user).some(scope=>['owner','support'].includes(scope)))this.store.notifications.add(user.id,'email-inbox:'+id,'Customer email received','A new message is waiting in the customer email inbox.','A22',{email:false});
   return true;}return false;
 }
 async sync(){
  if(this.busy)throw new HttpError(409,'Mailbox sync is already running');const c=this.email.current();if(!c?.inboundEnabled)throw new HttpError(503,'Incoming email is not configured');
  this.busy=true;let client,imported=0,skipped=0;
  try{
   const address=await this.email.address(c.imapHost);
   const options={host:address,servername:c.imapHost,port:993,secure:true,tls:{servername:c.imapHost,rejectUnauthorized:true,minVersion:'TLSv1.2'},auth:{user:c.imapUser,pass:this.auth.decrypt(c.imapPassword)},logger:false,disableAutoIdle:true,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000};
   client=this.deps.client?this.deps.client(options):new (require('imapflow').ImapFlow)(options);this.client=client;client.on('error',()=>{});await client.connect();
   const lock=await client.getMailboxLock('INBOX',{readOnly:true});
   try{
    const account=digest(c.imapHost+'|'+c.imapUser+'|INBOX'),validity=String(client.mailbox.uidValidity),next=Number(client.mailbox.uidNext),count=Number(client.mailbox.exists);
    const cursor=this.db.prepare('SELECT * FROM email_cursors WHERE account=?').get(account);
    let metadata=[],scannedThrough=0;
    if(count>0){if(cursor?.validity===validity){if(cursor.last_uid+1<next){scannedThrough=Math.min(next-1,cursor.last_uid+50);metadata=await client.fetchAll((cursor.last_uid+1)+':'+scannedThrough,{size:true},{uid:true});}}
     else metadata=await client.fetchAll(Math.max(1,count-49)+':'+count,{size:true});}
    let last=cursor?.validity===validity?cursor.last_uid:0;
    for(const meta of metadata.sort((a,b)=>a.uid-b.uid)){
     if(this.closed)break;const key=digest(account+'|'+validity+'|'+meta.uid);
     if(!this.db.prepare('SELECT 1 FROM email_inbox WHERE source_key=?').get(key)){
      if(!Number.isFinite(meta.size)||meta.size>1048576){skipped++;}
      else {const item=await client.fetchOne(meta.uid,{source:true},{uid:true});
       if(item?.source&&item.source.length<=1048576){const mail=await (this.deps.parse||require('mailparser').simpleParser)(item.source,{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true,maxHtmlLengthToParse:0});if(this.import(key,mail))imported++;else skipped++;}
       else skipped++;
      }
     }
     last=Math.max(last,meta.uid);
     this.db.prepare('INSERT INTO email_cursors VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET validity=excluded.validity,last_uid=excluded.last_uid').run(account,validity,last);
    }
    if(!this.closed){last=Math.max(last,scannedThrough);if(count===0)last=Math.max(0,next-1);this.db.prepare('INSERT INTO email_cursors VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET validity=excluded.validity,last_uid=excluded.last_uid').run(account,validity,last);}
   }finally{lock.release();}
   this.lastSync=Date.now();this.lastError='';return {ok:true,imported,skipped,...this.status(),busy:false};
  }catch{this.lastError='Mailbox sync failed. Check IMAP settings and provider access.';throw new HttpError(502,this.lastError);}
  finally{client?.close();this.client=null;this.busy=false;}
 }
 async reply(actor,b){
  if(typeof b.text!=='string'||!b.text.trim()||b.text.length>12000||typeof b.requestId!=='string'||!/^[a-f0-9]{32}$/.test(b.requestId))throw new HttpError(400,'Provide a reply and request identifier');
  const previous=this.db.prepare('SELECT * FROM email_replies WHERE request_id=?').get(b.requestId);
  if(previous){if(previous.email_id!==Number(b.id)||previous.actor!==actor.id||JSON.parse(this.auth.decrypt(previous.record)).text!==b.text.trim())throw new HttpError(409,'Reply identifier already used');return {id:previous.id,state:previous.state,reused:true};}
  if(!this.email.enabled())throw new HttpError(503,'Configure outgoing email before replying');
  const message=this.detail(b.id),record={to:message.from,text:b.text.trim()},id=Number(this.db.prepare("INSERT INTO email_replies(request_id,email_id,actor,record,state,created) VALUES(?,?,?,?,'sending',?)").run(b.requestId,message.id,actor.id,this.auth.encrypt(JSON.stringify(record)),Date.now()).lastInsertRowid);
  let state='accepted';try{const result=await this.email.send({to:message.from,subject:('Re: '+message.subject).slice(0,240),text:record.text,...(message.messageId?{inReplyTo:message.messageId,references:message.messageId}:{}),messageId:'<support-'+randomBytes(16).toString('hex')+'@'+new URL(this.email.settings.appUrl).hostname+'>'});if(!result.accepted?.length)throw Error();}catch(error){state=error.responseCode>=400&&error.responseCode<600?'failed':'uncertain';}
  this.db.prepare('UPDATE email_replies SET state=? WHERE id=?').run(state,id);this.store.audit(actor.id,'email.reply_'+state,String(message.id));return {id,state};
 }
 setStatus(actor,b){if(!['Open','Resolved'].includes(b.status))throw new HttpError(400,'Choose Open or Resolved');if(!this.db.prepare('UPDATE email_inbox SET status=? WHERE id=?').run(b.status,Number(b.id)).changes)throw new HttpError(404,'Email not found');this.store.audit(actor.id,'email.status_changed',String(b.id));return {ok:true};}
}
module.exports={EmailInbox};
