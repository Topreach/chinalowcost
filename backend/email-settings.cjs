const {HttpError}=require('./security.cjs');
const {emailValid}=require('./auth.cjs');
const {publicIPv4}=require('./media-download.cjs');
class EmailSettings {
 constructor(store,auth,settings,deps={}){
  Object.assign(this,{store,db:store.db,auth,settings,deps});
  this.base={provider:settings.emailProvider,smtp:settings.smtp,from:settings.emailFrom,support:settings.supportEmail};
  this.db.exec('CREATE TABLE IF NOT EXISTS integration_settings(name TEXT PRIMARY KEY,record TEXT NOT NULL)');
  this.apply();const self=this;
  this.mailer={get enabled(){return self.enabled();},send:message=>self.send(message)};
 }
 current(){return JSON.parse(this.db.prepare("SELECT record FROM integration_settings WHERE name='email'").get()?.record||'null');}
 enabled(){const c=this.current();return c?c.enabled:this.base.provider==='smtp';}
 apply(){const c=this.current();this.settings.emailFrom=c?.from||this.base.from;this.settings.supportEmail=c?.support||this.base.support;this.settings.emailProvider=this.enabled()?'smtp':'disabled';}
 public(){const c=this.current();return {version:c?.version||0,enabled:this.enabled(),host:c?.host||this.base.smtp?.host||'',port:c?.port||this.base.smtp?.port||587,user:c?.user||this.base.smtp?.auth?.user||'',passwordConfigured:!!(c?.password||!c&&this.base.smtp?.auth?.pass),from:c?.from||this.base.from||'',support:c?.support||this.base.support||'',inboundEnabled:!!c?.inboundEnabled,imapHost:c?.imapHost||'',imapUser:c?.imapUser||'',imapPasswordConfigured:!!c?.imapPassword,webmail:c?.webmail||''};}
 save(actor,b){
  const old=this.current(),next={version:(old?.version||0)+1};
  if(b.version!==(old?.version||0))throw new HttpError(409,'Email settings changed; refresh first');
  for(const key of ['enabled','inboundEnabled']){if(typeof b[key]!=='boolean')throw new HttpError(400,'Choose email feature settings');next[key]=b[key];}
  for(const key of ['host','imapHost']){if(typeof b[key]!=='string'||b[key].length>253||b[key]&&!/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(b[key])||b[key]&&!b[key].includes('.'))throw new HttpError(400,'Use the provider mail server hostname');next[key]=b[key].toLowerCase();}
  for(const key of ['user','imapUser']){if(typeof b[key]!=='string'||b[key].length>254||/[\x00-\x1f]/.test(b[key]))throw new HttpError(400,'Invalid mailbox username');next[key]=b[key].trim();}
  for(const key of ['from','support']){if(!emailValid(b[key])||/[<>,;:\s]/.test(b[key]))throw new HttpError(400,'Enter valid sender and support mailbox email addresses');next[key]=b[key].toLowerCase();}
  if(![465,587].includes(b.port))throw new HttpError(400,'SMTP must use TLS port 465 or STARTTLS port 587');next.port=b.port;
  next.webmail='';if(b.webmail){let url;try{url=new URL(b.webmail);}catch{throw new HttpError(400,'Use the provider HTTPS webmail URL');}if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.port)throw new HttpError(400,'Use an HTTPS webmail URL without credentials or query parameters');next.webmail=url.href;}
  for(const key of ['password','imapPassword']){
   if(typeof b[key]!=='string'||b[key].length>1024||/[\x00\r\n]/.test(b[key]))throw new HttpError(400,'Invalid mail password');
   if(b[key])next[key]=this.auth.encrypt(b[key]);else if(!b['remove'+key]){
    if(old?.[key])next[key]=old[key];
    else if(!old&&key==='password'&&this.base.smtp?.auth?.pass)next[key]=this.auth.encrypt(this.base.smtp.auth.pass);
   }
  }
  if(next.enabled&&(!next.host||!next.user||!next.password))throw new HttpError(400,'Add SMTP host, username and password before enabling sending');
  if(next.inboundEnabled&&(!next.imapHost||!next.imapUser||!next.imapPassword))throw new HttpError(400,'Add IMAP host, username and password before enabling receiving');
  this.db.prepare("INSERT INTO integration_settings VALUES('email',?) ON CONFLICT(name) DO UPDATE SET record=excluded.record").run(JSON.stringify(next));this.apply();this.store.audit(actor.id,'email.configuration_saved');return this.public();
 }
 async address(host){
  const addresses=await (this.deps.lookup||require('node:dns').promises.lookup)(host,{family:4,all:true});
  if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))throw new HttpError(400,'Mail server must resolve to a public address');return addresses[0].address;
 }
 async transport(){
  const c=this.current();if(!this.enabled())throw new HttpError(503,'Outgoing email is disabled');
  const smtp=c?{host:c.host,port:c.port,secure:c.port===465,auth:{user:c.user,pass:this.auth.decrypt(c.password)}}:{...this.base.smtp};
  const servername=smtp.host,address=await this.address(servername);
  return (this.deps.createTransport||require('nodemailer').createTransport)({...smtp,host:address,requireTLS:true,tls:{servername,rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
 }
 async verify(){let transport;try{transport=await this.transport();await transport.verify();return {ok:true,message:'SMTP authentication succeeded. Send a test email to verify delivery.'};}catch{throw new HttpError(502,'SMTP connection failed. Check provider host, TLS port, credentials and server outbound access.');}finally{transport?.close?.();}}
 async send(message){let transport;try{transport=await this.transport();const {previewHtml,...content}=require('./email-templates.cjs').emailTemplate(this.settings,{subject:message.subject,text:message.text,template:'update'});return await transport.sendMail({...content,...message,from:this.settings.emailFrom,replyTo:this.settings.supportEmail||this.settings.emailFrom,disableFileAccess:true,disableUrlAccess:true});}finally{transport?.close?.();}}
 async test(actor){try{const result=await this.send({to:actor.email,subject:'ChinaLowCost email configuration test',text:'This test confirms that your configured SMTP service accepted a ChinaLowCost message. Check your inbox and spam folder.'});if(!result.accepted?.length)throw Error();this.store.audit(actor.id,'email.test_accepted');return {ok:true,message:'Test email accepted by SMTP for '+actor.email+'. Check inbox and spam; acceptance does not guarantee delivery.'};}catch{throw new HttpError(502,'Test email was not confirmed. Check the mailbox before trying again.');}}
}
module.exports={EmailSettings};
