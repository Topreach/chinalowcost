const {HttpError}=require('./security.cjs');
class AccountDeletion {
 constructor(store){this.store=store;this.db=store.db;this.db.exec("CREATE TABLE IF NOT EXISTS account_deletion_requests(user_id TEXT PRIMARY KEY REFERENCES users(id),requested_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending')");}
 request(user,body){if(body.confirmation!=='REQUEST ACCOUNT DELETION')throw new HttpError(400,'Confirm your account deletion request');return this.store.transaction(()=>{this.db.prepare("INSERT INTO account_deletion_requests(user_id,requested_at) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING").run(user.id,new Date().toISOString());this.store.audit(user.id,'account.deletion_requested',user.id);return {request:this.get(user),message:'Your account deletion request has been recorded. Contact support@chinalowcost.com for assistance. Support will verify ownership and explain any records that must be retained before deletion.'};});}
 get(user){return this.db.prepare('SELECT requested_at AS requestedAt,status FROM account_deletion_requests WHERE user_id=?').get(user.id)||null;}
 list(){return this.db.prepare('SELECT r.user_id AS userId,u.email,u.role,r.requested_at AS requestedAt,r.status FROM account_deletion_requests r JOIN users u ON u.id=r.user_id ORDER BY r.requested_at DESC LIMIT 200').all();}
}
module.exports={AccountDeletion};
