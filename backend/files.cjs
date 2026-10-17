const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {HttpError}=require('./security.cjs');
const execute=promisify(execFile);
function fileMime(bytes){if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if(bytes.subarray(0,5).toString()==='%PDF-')return 'application/pdf';return null;}
class Files {
  constructor(store,settings,scan){this.store=store;this.settings=settings;this.scan=scan|| (async file=>{try{await execute(settings.scanner,['--no-summary',file],{timeout:30000,windowsHide:true,maxBuffer:8192});return true;}catch(e){if(e.code===1)return false;throw Error('Scanner unavailable');}});}
  async upload(user,order,bytes){if(!this.settings.scanner)throw new HttpError(503,'Uploads require a configured malware scanner');const mime=fileMime(bytes);if(!mime)throw new HttpError(400,'Only JPEG, PNG and PDF files are supported');const id=randomBytes(24).toString('hex'),directory=this.settings.uploadDirectory;fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,id);fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});this.store.db.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,order.id,user.id,mime,'quarantined',Date.now());let clean;try{clean=await this.scan(file);}catch{this.store.audit(user.id,'upload.quarantined',id);throw new HttpError(503,'File quarantined; scanning failed');}if(!clean){fs.unlinkSync(file);this.store.db.prepare('UPDATE files SET status=? WHERE id=?').run('rejected',id);this.store.audit(user.id,'upload.rejected',id);throw new HttpError(400,'File rejected by malware scanner');}this.store.db.prepare('UPDATE files SET status=? WHERE id=?').run('clean',id);this.store.audit(user.id,'upload.accepted',id);return {id,mime,status:'clean'};}
  download(user,id){if(!/^[a-f0-9]{48}$/.test(id))throw new HttpError(404,'File not found');const row=this.store.db.prepare('SELECT * FROM files WHERE id=?').get(id),order=row&&this.store.byId(row.order_id);if(!row||row.status!=='clean'||!this.store.allowed(user,order,true))throw new HttpError(404,'File not found');return {row,path:path.join(this.settings.uploadDirectory,id)};}
}
module.exports={Files,fileMime};
