const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const {webcrypto}=require('crypto');
(async()=>{
const csv=fs.readFileSync('outputs/Screen-Inventory.csv','utf8').trim().split(/\r?\n/),headers=csv.shift().split(',');
const pages=csv.map(row=>Object.fromEntries(row.split(',').map((value,i)=>[headers[i],value])));
const modules=['prototype.js','commerce.js','catalog.js','navigation.js','operations.js','accounts.js','payments.js'];
const source=modules.map(file=>fs.readFileSync('outputs/'+file,'utf8')).join('\n');new vm.Script(source);
const elements={};const get=id=>elements[id]||(elements[id]={innerHTML:'',textContent:'',value:'',style:{},checked:false,open:false,type:'password',showModal(){this.open=true},close(){this.open=false},focus(){},setAttribute(){}});
const store={},sessions={};let hash='#W07';const location={get hash(){return hash},set hash(v){hash=v.startsWith('#')?v:'#'+v}};
const context=vm.createContext({PAGES:pages,crypto:webcrypto,TextEncoder,document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){},title:'',body:{appendChild(){}},createElement(){return {click(){},remove(){}};}},window:{addEventListener(){},scrollTo(){}},location,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},sessionStorage:{getItem:k=>sessions[k]||null,setItem:(k,v)=>sessions[k]=v},URL:{createObjectURL:()=> 'blob:demo',revokeObjectURL(){}},Blob,console,setTimeout:()=>1,clearTimeout(){}});
const run=s=>vm.runInContext(s,context);run(source);await run('authReady');run('render()');assert.equal(location.hash,'#W01');assert(get('app').innerHTML.includes('Sign in to Worker'));
assert.equal(run('authDatabase.users.length'),5);assert.equal(run('authDatabase.users.every(u=>u.hash&&u.salt&&!u.password)'),true);
assert.equal((await run('authLoginValues("admin","customer@demo.chinalowcost.local","DemoCustomer!26")')).ok,false);assert.equal(run('authSession("admin")'),null);
assert.equal((await run('authLoginValues("worker","worker@demo.chinalowcost.local","DemoWorker!26")')).ok,false);
assert.equal((await run('authLoginValues("admin","admin@demo.chinalowcost.local","DemoAdmin!26")')).ok,true);
location.hash='#A02';run('render();opsStaffStatus("ST-01","Active")');
assert.equal((await run('authLoginValues("worker","worker@demo.chinalowcost.local","DemoWorker!26")')).ok,true);
assert.equal((await run('authLoginValues("customer","customer@demo.chinalowcost.local","DemoCustomer!26")')).ok,true);

// Job lifecycle, evidence, review, revocation and assignment concurrency.
run("function testJobAction(id,action,data={}){route=['approve','correction','revoke','reassign'].includes(action)?'A06':'W02';if(action==='submit'){const t=state.ops.tasks.find(t=>t.id===id);t.checks=Object.fromEntries((ENH_CHECKS[t.type]||[]).map((_,i)=>[i,true]));}return jobsTransition(id,action,data);}");
location.hash='#A06';run('render()');assert(get('app').innerHTML.includes('Product photos / video'));
run('state.ops.tasks.push({id:"JOB-TEST",type:"Supplier visit",staffId:"ST-01",reference:"Supplier test",sku:"FAN-01",qty:1,region:"Lagos",town:"Ikeja",due:Date.now()+3600000,status:"Assigned"});jobsInit()');
assert.equal(run('testJobAction("JOB-TEST","submit",{note:"Visit evidence recorded",evidence:"VIS-TEST",units:1}).ok'),false);
assert.equal(run('testJobAction("JOB-TEST","accept").ok'),true);assert.equal(run('testJobAction("JOB-TEST","start").ok'),true);
assert.equal(run('testJobAction("JOB-TEST","submit",{note:"Visit evidence recorded",evidence:"VIS-TEST",units:1}).ok'),true);
assert.equal(run('state.ops.tasks.find(t=>t.id==="JOB-TEST").status'),'Submitted for review');
assert.equal(run('testJobAction("JOB-TEST","correction",{note:"Please provide product label"}).ok'),true);
assert.equal(run('testJobAction("JOB-TEST","start").ok'),true);assert.equal(run('testJobAction("JOB-TEST","submit",{note:"Label evidence added",evidence:"LABEL-TEST",units:1}).ok'),true);
assert.equal(run('testJobAction("JOB-TEST","approve").ok'),true);assert.equal(run('state.ops.tasks.find(t=>t.id==="JOB-TEST").status'),'Completed');assert.equal(run('testJobAction("JOB-TEST","start").ok'),false);
run('state.ops.tasks.push({id:"JOB-REASSIGN",type:"Supplier visit",staffId:"ST-01",reference:"Test",sku:"FAN-01",qty:1,region:"Lagos",town:"Ikeja",due:Date.now()+3600000,status:"Assigned"});jobsInit()');
const stale=run('state.ops.tasks.find(t=>t.id==="JOB-REASSIGN").revision');context.stale=stale;
assert.equal(run('testJobAction("JOB-REASSIGN","reassign",{staffId:"ST-02",note:"Wrong role"}).ok'),false);
assert.equal(run('testJobAction("JOB-REASSIGN","reassign",{staffId:"ST-03",note:"Workload balance"}).ok'),true);
assert.equal(run('testJobAction("JOB-REASSIGN","accept").ok'),false);
assert.equal(run('testJobAction("JOB-REASSIGN","revoke",{revision:stale,note:"Stale screen"}).ok'),false);
assert.equal(run('testJobAction("JOB-REASSIGN","revoke",{note:"Supplier cancelled"}).ok'),true);
assert.equal(run('state.ops.tasks.find(t=>t.id==="JOB-REASSIGN").history.length'),2);
assert.equal(run('testJobAction("JOB-REASSIGN","accept").ok'),false);

for(const type of ['Product photos / video','Catalog entry','Supplier pickup','Inspection','Packing','Delivery','Return collection']){
context.jobType=type;run('state.ops.tasks.push({id:"TYPE-"+jobType,type:jobType,staffId:"ST-01",reference:"LIFECYCLE",sku:"FAN-01",qty:1,region:"Lagos",town:"Ikeja",due:Date.now()+3600000,status:"Assigned"});jobsInit()');
assert.equal(run('testJobAction("TYPE-"+jobType,"accept").ok'),true,type);assert.equal(run('testJobAction("TYPE-"+jobType,"start").ok'),true,type);
if(type==='Supplier pickup')run('state.ops.receipts.push({taskId:"TYPE-"+jobType,sku:"FAN-01",expected:1,accepted:1,rejected:0,note:"Verified receipt",actor:"Chidi",at:Date.now()})');
if(type==='Delivery')run('state.ops.tasks.find(t=>t.id==="TYPE-"+jobType).deliveryVerified=true');
if(type==='Catalog entry')run('state.ops.drafts.push({id:"JOB-DRAFT",staffId:"ST-01",sku:"FAN-01",status:"Pending review",title:"Test",category:"Fans",gallery:[]})');
assert.equal(run('testJobAction("TYPE-"+jobType,"submit",{note:"Evidence recorded for task",evidence:"REPORT-001",units:1}).ok'),true,type);
assert.equal(run('testJobAction("TYPE-"+jobType,"approve").ok'),true,type);
}
run('state.ops.drafts=state.ops.drafts.filter(d=>d.id!=="JOB-DRAFT")');
run('state.ops.tasks.push({id:"LEGACY-DONE",type:"Supplier visit",staffId:"ST-01",reference:"Legacy",sku:"FAN-01",qty:1,region:"Lagos",town:"Ikeja",due:Date.now()+10000,status:"Completed"});jobsInit()');assert.equal(run('state.ops.tasks.find(t=>t.id==="LEGACY-DONE").status'),'Needs correction');assert.equal(run('testJobAction("LEGACY-DONE","start").ok'),true);
location.hash='#A23';run('render()');assert.equal(run('waSettings().number'),'2340000000000');assert.equal(run('waChatData("product").url'),null);run('waOpen("product")');assert(!get('modal').innerHTML.includes('href="https://wa.me/'));assert(get('modal').innerHTML.includes('SKU:'));
assert.equal(run('waSaveValues({number:"2340000000000",mode:"Live chat link",enabled:true}).ok'),false);
assert.equal(run('waSaveValues({number:"+1 (202) 555-0143",mode:"Live chat link",enabled:true}).ok'),true);assert(run('waChatData("support").url').startsWith('https://wa.me/12025550143?text='));
assert.equal(run('waSaveValues({number:"2340000000000",mode:"Demo preview",enabled:false}).ok'),true);assert.equal(run('waChatData("support").url'),null);
run('route="W01"');assert.equal(run('waSaveValues({number:"2340000000000",mode:"Demo preview",enabled:true}).ok'),false);run('route="A23"');assert.equal(run('waSaveValues({number:"2340000000000",mode:"Demo preview",enabled:true}).ok'),true);
const fixtures=[];
for(const p of pages){location.hash='#'+p.ID;run('scenario="normal";render()');const html=get('app').innerHTML;assert(html.includes(p.ID+' ·'),p.ID+' screen marker');assert(!html.includes('undefined'),p.ID+' undefined');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,p.ID+' duplicate IDs');for(const m of html.matchAll(/href="#([A-Z]\d{2})"/g))assert(pages.some(x=>x.ID===m[1]),p.ID+' route');for(const m of html.matchAll(/(?:onclick|onsubmit|onchange|oninput)="([^"]*)"/g)){const h=m[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');new vm.Script('(function(event){'+h+'})');}fixtures.push({id:p.ID+'-account-session',html});for(const s of ['empty','error','offline'])run(`scenario='${s}';render()`);}
location.hash='#C10';run('scenario="normal";render();state.cart=[{sku:"FAN-01",qty:55,mode:"wholesale"}];state.address.street="CUSTOMER A PRIVATE ADDRESS";authInitializeRooms()');
const signup=await run('authSignupValues("customer",{name:"Second demo customer",email:"second@example.test",password:"SecondCustomer!26",confirm:"SecondCustomer!26"})');assert.equal(signup.ok,true);assert.equal(run('state.cart.length'),0);assert.notEqual(run('state.address.street'),'CUSTOMER A PRIVATE ADDRESS');
run('state.cart=[{sku:"BTL-03",qty:10,mode:"wholesale"}];authInitializeRooms()');
assert.equal((await run('authLoginValues("customer","customer@demo.chinalowcost.local","DemoCustomer!26")')).ok,true);assert.equal(run('state.cart[0].sku'),'FAN-01');assert.equal(run('state.address.street'),'CUSTOMER A PRIVATE ADDRESS');
assert.equal((await run('authLoginValues("customer","second@example.test","SecondCustomer!26")')).ok,true);assert.equal(run('state.cart[0].sku'),'BTL-03');
assert.equal(run('JSON.stringify(authDatabase).includes("SecondCustomer!26")'),false);assert(!store['clc-accounts-v1'].includes(signup.recovery));
location.hash='#W02';run('render()');assert.equal(run('state.ops.workerId'),'ST-01');run('opsOpenTask("DEL-008")');assert.equal(run('state.ops.workerId'),'ST-01');
run('authLogout("customer")');assert.equal(run('authSession("customer")'),null);assert(run('!!authSession("admin")'));assert(run('!!authSession("worker")'));location.hash='#C10';run('render()');assert.equal(location.hash,'#C01');
assert.equal((await run('authSignupValues("worker",{name:"Blocked",email:"blocked@example.test",password:"NewWorker!26",confirm:"NewWorker!26",requestedRole:"Catalog"})')).ok,false);
const pending=await run('authProvisionWorker({name:"New staff",email:"newstaff@example.test",password:"NewWorker!26",confirm:"NewWorker!26",requestedRole:"Catalog"})');assert(pending.ok);assert.equal((await run('authLoginValues("worker","newstaff@example.test","NewWorker!26")')).ok,true);context.newWorkerId=pending.user.workerId;location.hash='#A02';run('render();opsStaffStatus(newWorkerId,"Active")');assert.equal((await run('authLoginValues("worker","newstaff@example.test","NewWorker!26")')).ok,true);
location.hash='#W21';run('render()');const oldWorkerSession=run('JSON.parse(JSON.stringify(authSessions.worker))');assert.equal((await run('authChangePassword("worker","WrongPassword!26","ChangedWorker!27","ChangedWorker!27")')).ok,false);assert.equal((await run('authChangePassword("worker","NewWorker!26","ChangedWorker!27","ChangedWorker!27")')).ok,true);context.oldWorkerSession=oldWorkerSession;run('authSessions.worker=oldWorkerSession');assert.equal(run('authSession("worker")'),null);assert.equal((await run('authLoginValues("worker","newstaff@example.test","NewWorker!26")')).ok,false);assert.equal((await run('authLoginValues("worker","newstaff@example.test","ChangedWorker!27")')).ok,true);
location.hash='#A02';run('render();authRemoveWorkerAccess(authDatabase.users.find(u=>u.workerId===newWorkerId).id)');assert.equal(run('authSession("worker")'),null);assert.equal((await run('authLoginValues("worker","newstaff@example.test","ChangedWorker!27")')).ok,false);
const invalidAdmin=await run('authSignupValues("admin",{name:"Uninvited",email:"uninvited@example.test",password:"AdminPassword!26",confirm:"AdminPassword!26",invite:"WRONG"})');assert.equal(invalidAdmin.ok,false);
assert.equal((await run('authSignupValues("admin",{name:"Invited reviewer",email:"newadmin@demo.chinalowcost.local",password:"InvitedAdmin!26",confirm:"InvitedAdmin!26",invite:"CLC-ADMIN-DEMO"})')).ok,false);
assert.equal((await run('authLoginValues("admin","reviewer@demo.chinalowcost.local","DemoReview!26")')).ok,true);location.hash='#A02';run('render()');assert.equal(location.hash,'#A08');assert.equal((await run('authProvisionWorker({name:"Unauthorized",email:"denied@example.test",password:"DeniedWorker!26",confirm:"DeniedWorker!26",requestedRole:"Catalog"})')).ok,false);
assert.equal((await run('authLoginValues("admin","admin@demo.chinalowcost.local","DemoAdmin!26")')).ok,true);location.hash='#A35';run('render();opsNewDraft("FAN-01",true)');run('opsReviewCatalog(opsDraft().id,true)');assert.match(get('toast').textContent,/Self-approval/);
assert.equal((await run('authLoginValues("customer","customer@demo.chinalowcost.local","DemoCustomer!26")')).ok,true);
context.secondRecovery=signup.recovery;const recovered=await run('authResetValues("customer","second@example.test",secondRecovery,"ResetCustomer!28","ResetCustomer!28")');assert(recovered.ok);assert.equal(run('authSession("customer").id'),'CUSTOMER-DEMO');assert.equal((await run('authResetValues("customer","second@example.test",secondRecovery,"AnotherReset!29","AnotherReset!29")')).ok,false);assert.equal((await run('authLoginValues("customer","second@example.test","ResetCustomer!28")')).ok,true);
assert.equal((await run('authResetValues("admin","second@example.test",secondRecovery,"AnotherReset!29","AnotherReset!29")')).ok,false);

// Local improvements: customer isolation, repeat orders, order/job linkage, import validation.
location.hash='#C20';run('render()');const firstCustomer=run('authSession("customer").id');run('state.address.street="SECOND SAVED ADDRESS"');get('enh-address-label').value='Shop';run('enhSaveAddress()');assert.equal(run('enhCustomer().addresses.length'),1);run('enhSaveProduct()');assert.equal(run('enhCustomer().saved.length'),1);
assert.equal((await run('authLoginValues("customer","customer@demo.chinalowcost.local","DemoCustomer!26")')).ok,true);assert.equal(run('enhCustomer().addresses.length'),0);assert.equal(run('enhCustomer().saved.length'),0);
assert.equal((await run('authLoginValues("customer","second@example.test","ResetCustomer!28")')).ok,true);assert.equal(run('enhCustomer().addresses[0].value.street'),'SECOND SAVED ADDRESS');
run('state.cart=[{sku:"FAN-01",qty:1,mode:"retail"}];state.paid=false;state.order=false;state.orderSnapshot=null;state.promoCode="";state.address.state="Lagos";state.address.town="Ikeja";simulatePayment()');
const orderId=run('state.orderSnapshot.id');assert(orderId.startsWith('CLC-'));context.testOrderId=orderId;assert.equal(run('enhInit().orders[testOrderId].customerId'),firstCustomer);assert.equal(run('enhNotices().length'),1);
run('enhReorder(testOrderId);enhConfirmReorder(testOrderId)');assert.equal(run('state.paid'),false);assert.equal(run('state.orderSnapshot'),null);assert.equal(run('state.cart[0].sku'),'FAN-01');assert(run('!!enhInit().orders[testOrderId]'));
assert.equal((await run('authLoginValues("admin","admin@demo.chinalowcost.local","DemoAdmin!26")')).ok,true);location.hash='#A12';run('render();enhSelectOrder(testOrderId);opsSyncOrder()');assert(run('state.ops.tasks.some(t=>t.orderId===testOrderId)'));const taskCount=run('state.ops.tasks.length');run('opsSyncOrder()');assert.equal(run('state.ops.tasks.length'),taskCount);
assert.equal((await run('authLoginValues("worker","worker@demo.chinalowcost.local","DemoWorker!26")')).ok,true);location.hash='#W02';run('render();opsOpenTask(state.ops.tasks.find(t=>t.orderId===testOrderId&&t.staffId==="ST-01").id)');assert.equal(run('opsOrder().id'),orderId);assert(get('modal').innerHTML.includes('Work checklist'));assert(run('enhNotices().length')>0);
run('route="W02";state.ops.tasks.push({id:"UNCHECKED",type:"Supplier visit",staffId:"ST-01",qty:1,status:"In progress",due:Date.now()})');assert.equal(run('jobsTransition("UNCHECKED","submit",{note:"Work report submitted",evidence:"EV-1",units:1}).ok'),false);
location.hash='#A07';run('render()');context.importCSV="template_sku,sku,title,retail,bulk,volume,moq,pack,threshold"+String.fromCharCode(10)+"FAN-01,IMPORT-TEST,Imported fan,6000,5000,4500,10,5,50";assert.equal(run('enhImportValidate(importCSV).length'),1);assert.throws(()=>run("enhImportValidate(\"template_sku,sku,title,retail,bulk,volume,moq,pack,threshold\\nFAN-01,FAN-01,Duplicate,6000,5000,4500,10,5,50\")"));
get('enh-import-text').value='template_sku,sku,title,retail,bulk,volume,moq,pack,threshold\nFAN-01,IMPORT-TEST,Imported fan,6000,5000,4500,10,5,50';run('enhImportPreviewForm();enhImportCommit()');assert.equal(run('state.ops.drafts.find(d=>d.sku==="IMPORT-TEST").status'),'Draft');assert.equal(run('products.some(p=>p.id==="IMPORT-TEST")'),false);


location.hash='#W02';run('render();Object.assign(state.ops.tasks.find(t=>t.id==="UNCHECKED"),{reference:"Visit",sku:"FAN-01",region:"Lagos",town:"Ikeja"});enhAttachEvidence("UNCHECKED",{files:[{name:"visit.png",type:"image/png",size:1024}]})');assert.equal(run('state.ops.tasks.find(t=>t.id==="UNCHECKED").attachments.length'),1);assert(get('modal').innerHTML.includes('Preview'));
run('enhAttachEvidence("UNCHECKED",{files:[{name:"bad.exe",type:"application/octet-stream",size:10}]})');assert.equal(run('state.ops.tasks.find(t=>t.id==="UNCHECKED").attachments.length'),1);
run('ENH_CHECKS["Supplier visit"].forEach((_,i)=>enhChecklist("UNCHECKED",i,true))');assert.equal(run('jobsTransition("UNCHECKED","submit",{note:"Visit report complete",evidence:"LOCAL-VISIT",units:1}).ok'),true);assert.equal(run('state.ops.tasks.find(t=>t.id==="UNCHECKED").submissions[0].attachments.length'),1);
location.hash='#A06';run('render();state.ops.tasks.push({id:"PACK-SCOPE",orderId:testOrderId,type:"Packing",staffId:"ST-01",reference:testOrderId,sku:"FAN-01",qty:1,region:"Lagos",town:"Ikeja",due:Date.now(),status:"Submitted for review",submissions:[{id:"PACK-SUB",workerId:"WORKER-DEMO",summary:"Packing evidence",units:1,evidence:"BOX-1"}]});state.ops.tasks.push({id:"WRONG-RECEIPT",orderId:"ANOTHER-ORDER",type:"Supplier pickup",staffId:"ST-01",sku:"FAN-01",qty:1,status:"Completed",reviewedBy:"ADMIN-DEMO"});state.ops.receipts.push({taskId:"WRONG-RECEIPT",sku:"FAN-01",accepted:1});jobsInit()');assert.equal(run('jobsTransition("PACK-SCOPE","approve").ok'),false);
run('const linkedPickup=state.ops.tasks.find(t=>t.orderId===testOrderId&&t.type==="Supplier pickup");linkedPickup.status="Completed";linkedPickup.reviewedBy="ADMIN-DEMO";state.ops.receipts.push({taskId:linkedPickup.id,sku:"FAN-01",accepted:1})');assert.equal(run('jobsTransition("PACK-SCOPE","approve").ok'),true);assert.equal(run('enhInit().orders[testOrderId].shipment.dispatched'),true);

location.hash='#C13';run('render()');assert(get('app').innerHTML.includes('Open server accounts and checkout'));assert(!get('app').innerHTML.includes('paystack-token'));
const html=fs.readFileSync('outputs/Screen-Blueprint.html','utf8');for(const file of [...modules,'prototype.css'])assert(html.includes(fs.readFileSync('outputs/'+file,'utf8').trim()),'Embedded '+file);
const existing=JSON.parse(fs.readFileSync('work/rendered-routes.json','utf8'));fs.writeFileSync('work/rendered-routes.json',JSON.stringify([...existing,...fixtures]));
console.log('PASS: 86 authenticated/public routes and 258 alternate states; role-specific credentials; pending-worker approval and suspension; disabled staff signup and admin-created worker logins with access removal; customer data isolation; password change and recovery; old-session invalidation; separate sign-out; worker identity and admin scope guards.');
})().catch(e=>{console.error(e);process.exitCode=1});
