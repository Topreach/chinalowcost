const { createHmac, timingSafeEqual } = require('node:crypto');
const { createMailer } = require('./email.cjs');
const {HttpError}=require('./security.cjs');
class Payments {
  constructor(config, store, request = fetch, mailer = createMailer(config),auth=null) { this.config = config; this.store = store; this.request = request; this.mailer = mailer; this.locks = new Map();this.settings=auth?new (require('./payment-settings.cjs').PaymentSettings)(store,auth,config):null; }
  key(){return this.settings?this.settings.key():this.config.key;}
  enabled(){return this.settings?this.settings.public().enabled:!!this.config.key;}
  async locked(id, action) {
    const previous = this.locks.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(action); this.locks.set(id, next);
    try { return await next; } finally { if (this.locks.get(id) === next) this.locks.delete(id); }
  }
  async api(route, body) {
    const key=this.key();if (!key) throw new HttpError(503,'Paystack is not configured');
    let response;try{response = await this.request('https://api.paystack.co' + route, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal:AbortSignal.timeout(15000) });}catch{this.store.audit(null,'payment.provider_failed');throw new HttpError(502,'Payment provider is unavailable. Check payment status before retrying');}
    const result = await response.json();
    if (!response.ok || !result.status){this.store.audit(null,'payment.provider_failed');const error=new HttpError(response.status===401||response.status===403?503:502,'Paystack request failed; contact the administrator');error.paymentRejected=[401,403].includes(response.status);throw error;}
    return result.data;
  }
  initialize(order) {
    return this.locked(order.id, async () => {
      Object.assign(order,this.store.byId(order.id));
      if(order.revoked)throw Error('Checkout revoked');if((order.paymentEnvironment||'test')!==(this.config.paymentMode||'test'))throw new HttpError(409,'Payment environment mismatch');
      if (order.status === 'paid') return { paid: true };
      if(order.paymentMethod==='cod')throw new HttpError(409,'This order uses cash on delivery; do not pay through Paystack');
      if(!this.enabled())throw new HttpError(503,'New payment checkouts are disabled');
      if (order.expiresAt < Date.now()) throw Error('Approved checkout expired; request a new order');
      if (order.authorizationUrl) return { authorizationUrl: order.authorizationUrl };
      // Persist the reference before contacting the provider. Retries never create another reference.
      const previouslyAttempted=order.paymentAttempted===true;order.paymentAttempted=true;this.store.save(order);
      let data;try{data = await this.api('/transaction/initialize', { email: order.email, amount: String(order.payableKobo??order.amountKobo), currency: order.currency, reference: order.reference, callback_url: this.config.appUrl + '/application?payment_reference='+encodeURIComponent(order.reference), metadata: JSON.stringify({ orderId: order.id }) });}catch(error){if(error.paymentRejected&&!previouslyAttempted){order.paymentAttempted=false;this.store.save(order);}throw error;}
      const url = new URL(data.authorization_url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com' ||url.username||url.password||url.port|| data.reference !== order.reference) throw Error('Invalid Paystack checkout response');
      order.authorizationUrl = url.href; order.status = 'pending'; this.store.save(order);
      return { authorizationUrl: url.href };
    });
  }
  verify(order) {
    return this.locked(order.id, async () => {
      Object.assign(order,this.store.byId(order.id));
      if((order.paymentEnvironment||'test')!==(this.config.paymentMode||'test'))throw new HttpError(409,'Payment environment mismatch');if(order.paymentMethod==='cod'&&order.status!=='paid')throw new HttpError(409,'Cash on delivery requires independent cash handover confirmation');
      if (order.status !== 'paid') {
        const data = await this.api('/transaction/verify/' + encodeURIComponent(order.reference));
        if (data.status !== 'success') return { status: 'pending', orderId: order.id };
        if (data.reference !== order.reference || data.amount !== (order.payableKobo??order.amountKobo) || data.currency !== order.currency || data.customer?.email?.toLowerCase() !== order.email.toLowerCase() || data.domain !== (this.config.paymentMode||'test')) throw Error('Payment does not match approved order');
        order.paidAt = new Date().toISOString(); order.transactionId = String(data.id); this.store.markPaid(order);this.store.audit(null,'payment.verified',order.id);
      }
      await this.receipt(order);
      return { status: 'paid', orderId: order.id, amountKobo: order.amountKobo, currency: order.currency, receipt: order.receipt };
    });
  }
  validSignature(raw, signature) {
    const key=this.key();if (!key || !/^[a-f0-9]{128}$/i.test(signature || '')) return false;
    return timingSafeEqual(createHmac('sha512', key).update(raw).digest(), Buffer.from(signature, 'hex'));
  }
  async receipt(order) {
    if (['sent', 'sending', 'uncertain'].includes(order.receipt) || this.config.emailProvider === 'disabled') return;
    const claimed=this.store.claimReceipt(order.id);if(!claimed){Object.assign(order,this.store.byId(order.id));return;}Object.assign(order,claimed);
    try {
      const result = await this.mailer.send({ from: this.config.emailFrom, to: order.email, ...(this.config.supportEmail ? { replyTo: this.config.supportEmail } : {}), messageId: '<receipt-' + order.reference + '@' + new URL(this.config.appUrl).hostname + '>', subject: 'ChinaLowCost '+(order.paymentEnvironment==='live'?'':'test ')+'payment receipt — ' + order.id, text: `${order.paymentEnvironment==='live'?'Order':'Test order'} payment confirmed for ${order.id}.\nOrder total: NGN ${(order.amountKobo / 100).toFixed(2)}\nStore credit: NGN ${((order.walletKobo||0)/100).toFixed(2)}\n${order.paymentMethod==='cod'?'Cash on delivery':'Paystack'} portion: NGN ${((order.payableKobo??order.amountKobo)/100).toFixed(2)}\nReference: ${order.reference}\n${order.paymentEnvironment==='live'?'Payment confirmed. Keep this receipt for your records.':'This is a test transaction; no real funds were collected.'}` });
      if (!result.accepted?.length) throw Error('Email acceptance unknown');
      order.receipt = 'sent'; order.emailId = result.messageId;
    } catch (error) { order.receipt = error.responseCode >= 400 && error.responseCode <= 599 ? 'pending' : 'uncertain'; }
    this.store.save(order);
  }
}
module.exports = { Payments };
