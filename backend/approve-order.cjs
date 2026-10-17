// Local operator tool. Run with the server stopped; never expose this as a public API.
const fs = require('node:fs');
const { config } = require('./config.cjs');
const { Store } = require('./store.cjs');
const settings = config();
const file = process.argv[2];
if (!file) throw Error('Usage: npm run order:approve -- approved-order.json');
const store=new Store(settings.file);
try{const input=JSON.parse(fs.readFileSync(file,'utf8'));const customer=store.db.prepare('SELECT id FROM users WHERE email=? AND role=? AND active=1 AND verified=1').get(String(input.email).toLowerCase(),'customer');if(!customer)throw Error('Create and verify the customer account before approving an order');const order=store.approve({...input,customerId:customer.id});console.log('Approved test order: '+order.id+'. The customer can pay after signing in.');}finally{store.close();}
