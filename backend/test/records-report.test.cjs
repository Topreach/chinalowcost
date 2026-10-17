const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../store.cjs'),{Operations}=require('../operations.cjs');
test('admin reports count customers, paid quantities, dates and supplier origin without exposing credentials',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clc-records-')),store=new Store(path.join(dir,'app.sqlite')),ops=new Operations(store);
 t.after(()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});});
 for(const [id,role]of [['customer','customer'],['idle','customer'],['worker','worker']])store.db.prepare('INSERT INTO users(id,email,role,password,verified) VALUES(?,?,?,?,1)').run(id,id+'@example.test',role,'PRIVATE-PASSWORD');
 store.audit('customer','account.created','customer');
 const order=store.approve({id:'PAID',email:'customer@example.test',customerId:'customer',amountKobo:2500});
 Object.assign(order,{status:'paid',paidAt:new Date().toISOString(),lines:[{sku:'SKU',name:'Product',qty:2,unitKobo:1000,subtotalKobo:2000}]});store.save(order);
 const unpaid=store.approve({id:'UNPAID',email:'customer@example.test',customerId:'customer',amountKobo:9999});unpaid.lines=[{sku:'SKU',qty:100}];store.save(unpaid);

 store.db.prepare('INSERT INTO purchase_orders VALUES(?,?)').run('PO',JSON.stringify({id:'PO',supplierId:'SUP',supplierSnapshot:{name:'Original supplier',contact:'Contact',town:'Lagos'},terms:'Agreed terms'}));
 store.db.prepare('INSERT INTO purchase_receipts VALUES(?,?,?)').run('INSPECTION','PO',JSON.stringify({id:'INSPECTION',poId:'PO',qty:3,sku:'SKU',amountKobo:1500,created:Date.now(),createdBy:'admin'}));
 const report=ops.report({id:'admin',role:'admin'});
 assert.equal(report.registeredCustomers,2);assert.equal(report.newCustomers,1);assert.equal(report.buyingCustomers,1);assert.equal(report.unitsSold,2);assert.equal(report.customers[0].spentKobo,2500);assert.equal(report.productsSold[0].goodsKobo,2000);assert.equal(report.collections[0].supplierName,'Original supplier');assert.equal(report.collections[0].supplierSnapshot,true);assert(!JSON.stringify(report).includes('PRIVATE-PASSWORD'));
 const future=ops.report({id:'admin',role:'admin'},{start:'2099-01-01',end:'2099-12-31'});assert.equal(future.unitsSold,0);assert.equal(future.registeredCustomers,2);assert.equal(future.buyingCustomers,0);
 assert.throws(()=>ops.report({id:'worker',role:'worker'}),/Administrator/);assert.throws(()=>ops.report({id:'admin',role:'admin'},{start:'invalid'}),/dates/);
});
