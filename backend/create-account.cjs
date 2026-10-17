// Trusted local operator only. Password is generated, never accepted in shell arguments.
const {randomBytes}=require('node:crypto');
const {config}=require('./config.cjs');
const {Store}=require('./store.cjs');
const {Auth}=require('./auth.cjs');
(async()=>{const settings=config(),store=new Store(settings.file);try{const [email,role='admin']=process.argv.slice(2);const auth=new Auth(store,settings);const password=randomBytes(24).toString('base64url');const user=await auth.create(email,password,role,true);store.audit(null,'account.operator_provisioned',user.id);console.log('Account created: '+user.email+' ('+user.role+')\nInitial password (store privately): '+password+'\nSign in at '+settings.appUrl+'. Change this password and enroll an authenticator.');}finally{store.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
