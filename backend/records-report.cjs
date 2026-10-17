// Admin-only report extension; called after Operations requires finance/owner scope.
module.exports=function recordsReport(store,start,end){
 const db=store.db,exists=t=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
 const records=t=>exists(t)?db.prepare('SELECT record FROM '+t).all().map(r=>JSON.parse(r.record)):[];
 const within=value=>{const at=typeof value==='number'?value:Date.parse(value);return at>=start&&at<=end;};
 const mode=store.paymentMode||'test';
 const paid=records('orders').filter(o=>o.status==='paid'&&(o.paymentEnvironment||'test')===mode&&within(o.paidAt));
 const registrations=new Map(db.prepare("SELECT object_id,MIN(at) at FROM audit WHERE action='account.created' GROUP BY object_id").all().map(r=>[r.object_id,r.at]));
 const profiles=new Map(exists('account_profiles')?db.prepare('SELECT user_id,record FROM account_profiles').all().map(r=>[r.user_id,JSON.parse(r.record)]):[]);
 const customers=db.prepare("SELECT id,email,active,verified FROM users WHERE role='customer'").all().map(u=>({...u,name:profiles.get(u.id)?.name||'',registeredAt:registrations.get(u.id)||null,orders:0,units:0,spentKobo:0,lastPurchase:null}));
 const customerMap=new Map(customers.map(u=>[u.id,u])),productMap=new Map();let unitsSold=0;
 const sales=[];
 for(const o of paid){const customer=customerMap.get(o.customerId);if(customer){customer.orders++;customer.spentKobo+=o.amountKobo;if(!customer.lastPurchase||o.paidAt>customer.lastPurchase)customer.lastPurchase=o.paidAt;}
  for(const l of o.lines||[]){const qty=Number.isSafeInteger(l.qty)?l.qty:0,subtotal=Number.isSafeInteger(l.subtotalKobo)?l.subtotalKobo:(l.unitKobo||0)*qty;
   unitsSold+=qty;if(customer)customer.units+=qty;
   const p=productMap.get(l.sku)||{sku:l.sku,name:l.name||l.sku,units:0,goodsKobo:0};p.units+=qty;p.goodsKobo+=subtotal;productMap.set(l.sku,p);
   sales.push({orderId:o.id,customerId:o.customerId,email:o.email,sku:l.sku,name:l.name||l.sku,qty,unitKobo:l.unitKobo||0,subtotalKobo:subtotal,paidAt:o.paidAt});
  }
 }
 customers.sort((a,b)=>b.spentKobo-a.spentKobo||a.email.localeCompare(b.email));
 const suppliers=new Map(records('business_suppliers').map(s=>[s.id,s])),pos=new Map(records('purchase_orders').map(p=>[p.id,p]));
 const collections=records('purchase_receipts').filter(r=>within(r.created)).map(r=>{const po=pos.get(r.poId),supplier=po?.supplierSnapshot||suppliers.get(po?.supplierId);return {...r,supplierId:po?.supplierId||null,supplierName:supplier?.name||'Unknown supplier',contact:supplier?.contact||'',town:supplier?.town||'',supplierSnapshot:!!po?.supplierSnapshot,terms:po?.terms||'',workerId:null};});
 if(exists('fulfillment_records')){const evidence=new Map(records('fulfillment_records').map(r=>[r.id,r]));for(const r of collections){const e=evidence.get(r.id);r.workerId=e?.workerId||null;r.orderId=e?.orderId||null;r.fileId=e?.fileId||null;}}
 const movements=exists('inventory_movements')?db.prepare('SELECT * FROM inventory_movements WHERE created>=? AND created<=? ORDER BY id DESC LIMIT 500').all(start,end):[];
 const refunds=records('finance_refunds').filter(r=>r.status==='Refunded'&&within(r.completed));
 return {registeredCustomers:customers.length,verifiedCustomers:customers.filter(c=>c.verified).length,newCustomers:customers.filter(c=>within(c.registeredAt)).length,buyingCustomers:customers.filter(c=>c.orders>0).length,unitsSold,customers:customers.slice(0,500),customerRows:customers.length,productsSold:[...productMap.values()].sort((a,b)=>b.units-a.units).slice(0,500),sales:sales.slice(0,500),saleRows:sales.length,collections:collections.slice(0,500),collectionRows:collections.length,movements,completedRefunds:refunds.map(r=>({id:r.id,orderId:r.orderId,amountKobo:r.amountKobo,completed:r.completed})).slice(0,500)};
};
