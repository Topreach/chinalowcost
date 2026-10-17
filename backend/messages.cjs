const {mailAvailable}=require('./email.cjs');
const {emailTemplate}=require('./email-templates.cjs');
const {randomBytes}=require('node:crypto');
const {HttpError}=require('./security.cjs');
const LANGUAGES={en:'English',yo:'Yorùbá',ha:'Hausa',ig:'Igbo'};
class Messages {
  constructor(store,settings,mailer){this.store=store;this.db=store.db;this.settings=settings;this.mailer=mailer;
    this.db.exec(`CREATE TABLE IF NOT EXISTS message_previews(id TEXT PRIMARY KEY,actor TEXT NOT NULL,record TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS broadcasts(id INTEGER PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,actor TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,language TEXT NOT NULL,audience TEXT NOT NULL,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS message_recipients(message_id INTEGER NOT NULL REFERENCES broadcasts(id),user_id TEXT NOT NULL REFERENCES users(id),read_at INTEGER,email_state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(message_id,user_id));
      CREATE INDEX IF NOT EXISTS inbox_user ON message_recipients(user_id,message_id);`);
    if(!this.db.prepare('PRAGMA table_info(broadcasts)').all().some(c=>c.name==='template'))this.db.exec("ALTER TABLE broadcasts ADD COLUMN template TEXT NOT NULL DEFAULT 'announcement'");
  }
  recipients(input){
    if(!['workers','customers','both','selected'].includes(input.audience))throw new HttpError(400,'Choose workers, customers, both or selected recipients');
    if(input.audience==='selected'){
      if(!Array.isArray(input.userIds)||!input.userIds.length||input.userIds.length>200||input.userIds.some(id=>typeof id!=='string'))throw new HttpError(400,'Select 1–200 recipients');
      const ids=[...new Set(input.userIds)],users=ids.map(id=>this.db.prepare("SELECT id FROM users WHERE id=? AND role IN ('worker','customer') AND active=1 AND verified=1").get(id));
      if(users.some(u=>!u))throw new HttpError(400,'Recipients must be active verified workers/customers');return ids.sort();
    }
    const role=input.audience==='workers'?'worker':input.audience==='customers'?'customer':null;
    return this.db.prepare("SELECT id FROM users WHERE active=1 AND verified=1 AND role IN ('worker','customer') AND (? IS NULL OR role=?) ORDER BY id LIMIT 5001").all(role,role).map(u=>u.id);
  }
  preview(actor,input){
    if(typeof input.subject!=='string'||!input.subject.trim()||input.subject.length>160||typeof input.body!=='string'||!input.body.trim()||input.body.length>5000||typeof input.language!=='string'||!Object.hasOwn(LANGUAGES,input.language)||typeof input.email!=='boolean')throw new HttpError(400,'Provide a subject (160 characters), message (5000 characters) and language');
    if(input.email&&!mailAvailable(this.mailer))throw new HttpError(503,'SMTP must be configured before requesting email delivery');
    const template=input.template||'announcement';if(!['announcement','update','promotion'].includes(template))throw new HttpError(400,'Choose an email template');
    const ids=this.recipients(input);if(!ids.length)throw new HttpError(400,'No eligible recipients');if(ids.length>5000)throw new HttpError(400,'Use smaller recipient groups (maximum 5000)');
    const record={template,subject:input.subject.trim(),body:input.body.trim(),language:input.language,audience:input.audience,ids,email:input.email};const id=randomBytes(24).toString('hex');
    this.db.prepare('DELETE FROM message_previews WHERE expires<?').run(Date.now());this.db.prepare('INSERT INTO message_previews VALUES(?,?,?,?)').run(id,actor.id,JSON.stringify(record),Date.now()+600000);
    return {previewId:id,subject:record.subject,body:record.body,language:record.language,recipientCount:ids.length,email:record.email,template,emailPreview:emailTemplate(this.settings,{subject:record.subject,body:record.body,template,language:record.language}).previewHtml};
  }
  publish(actor,input){
    if(typeof input.previewId!=='string'||typeof input.requestId!=='string'||!/^[A-Za-z0-9-]{16,80}$/.test(input.requestId))throw new HttpError(400,'Preview and request identifier required');
    return this.store.transaction(()=>{
      const previous=this.db.prepare('SELECT id,actor FROM broadcasts WHERE request_id=?').get(input.requestId);
      if(previous){if(previous.actor!==actor.id)throw new HttpError(409,'Request identifier already used');return {id:previous.id,recipientCount:this.db.prepare('SELECT count(*) AS n FROM message_recipients WHERE message_id=?').get(previous.id).n,reused:true};}
      const draft=this.db.prepare('SELECT * FROM message_previews WHERE id=? AND actor=? AND expires>?').get(input.previewId,actor.id,Date.now());if(!draft)throw new HttpError(400,'Preview expired; review the message again');
      const record=JSON.parse(draft.record);for(const id of record.ids){if(!this.db.prepare("SELECT id FROM users WHERE id=? AND active=1 AND verified=1 AND role IN ('worker','customer')").get(id))throw new HttpError(409,'Recipient eligibility changed. Create a new preview.');}
      const id=Number(this.db.prepare('INSERT INTO broadcasts(request_id,actor,subject,body,language,audience,created,template) VALUES(?,?,?,?,?,?,?,?)').run(input.requestId,actor.id,record.subject,record.body,record.language,record.audience,Date.now(),record.template||'announcement').lastInsertRowid);
      const insert=this.db.prepare('INSERT INTO message_recipients(message_id,user_id,email_state) VALUES(?,?,?)');for(const userId of record.ids){const wantsEmail=this.store.notifications?this.store.notifications.preferences({id:userId}).email:true;insert.run(id,userId,record.email&&wantsEmail?'pending':'disabled');if(this.store.notifications){const role=this.db.prepare('SELECT role FROM users WHERE id=?').get(userId).role;this.store.notifications.add(userId,'announcement:'+id,record.subject,record.body,role==='worker'?'W01':'C18',{announcementId:id,email:false});}}
      this.db.prepare('DELETE FROM message_previews WHERE id=?').run(draft.id);this.store.audit(actor.id,'announcement.published',String(id));return {id,recipientCount:record.ids.length,reused:false};
    });
  }
  inbox(user,before){const cursor=Number(before)||Number.MAX_SAFE_INTEGER;if(!Number.isSafeInteger(cursor)||cursor<1)throw new HttpError(400,'Invalid inbox cursor');const messages=this.db.prepare('SELECT b.id,b.subject,b.body,b.language,b.created,r.read_at FROM broadcasts b JOIN message_recipients r ON r.message_id=b.id WHERE r.user_id=? AND b.id<? ORDER BY b.id DESC LIMIT 50').all(user.id,cursor);return {messages,nextBefore:messages.length===50?messages.at(-1).id:null};}
  read(user,id){if(!Number.isSafeInteger(id)||id<1)throw new HttpError(400,'Invalid message');const result=this.db.prepare('UPDATE message_recipients SET read_at=COALESCE(read_at,?) WHERE message_id=? AND user_id=?').run(Date.now(),id,user.id);if(!result.changes)throw new HttpError(404,'Message not found');return {ok:true};}
  history(){return {messages:this.db.prepare(`SELECT b.id,b.subject,b.language,b.audience,b.created,count(r.user_id) AS recipients,sum(r.read_at IS NOT NULL) AS read_count,sum(r.email_state='pending') AS email_pending,sum(r.email_state='sent') AS email_sent,sum(r.email_state IN ('uncertain','sending')) AS email_uncertain,sum(r.email_state='failed') AS email_failed FROM broadcasts b JOIN message_recipients r ON r.message_id=b.id GROUP BY b.id ORDER BY b.id DESC LIMIT 50`).all()};}
  async deliver(actor){if(!mailAvailable(this.mailer))throw new HttpError(503,'SMTP is not configured');const rows=this.db.prepare("SELECT r.*,b.subject,b.body,b.template,b.language,u.email,u.active,u.verified FROM message_recipients r JOIN broadcasts b ON b.id=r.message_id JOIN users u ON u.id=r.user_id WHERE r.email_state IN ('pending','failed') AND r.attempts<3 ORDER BY r.message_id LIMIT 5").all();const counts={sent:0,failed:0,uncertain:0,cancelled:0};for(const row of rows){
      const claimed=this.db.prepare("UPDATE message_recipients SET email_state='sending',attempts=attempts+1 WHERE message_id=? AND user_id=? AND email_state IN ('pending','failed') AND attempts<3").run(row.message_id,row.user_id);if(!claimed.changes)continue;
      if(this.closed)break;if(!row.active||!row.verified||this.store.notifications&&!this.store.notifications.preferences({id:row.user_id}).email){this.db.prepare("UPDATE message_recipients SET email_state='cancelled' WHERE message_id=? AND user_id=?").run(row.message_id,row.user_id);counts.cancelled++;continue;}
      let state='sent';try{const result=await this.mailer.send({from:this.settings.emailFrom,to:row.email,...emailTemplate(this.settings,{subject:row.subject,body:row.body,template:row.template,language:row.language}),messageId:'<announcement-'+row.message_id+'-'+row.user_id+'@'+new URL(this.settings.appUrl).hostname+'>'});if(!result.accepted?.length)throw Error('Acceptance unknown');}catch(error){state=error.responseCode>=400&&error.responseCode<=599?'failed':'uncertain';}
      if(this.closed)break;this.db.prepare('UPDATE message_recipients SET email_state=? WHERE message_id=? AND user_id=?').run(state,row.message_id,row.user_id);counts[state]++;
    }this.store.audit(actor.id,'announcement.email_batch');return counts;}
}
module.exports={Messages,LANGUAGES};
