const path = require('node:path');
function config(env = process.env) {
  const appUrl = new URL(env.APP_URL || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(appUrl.protocol) || appUrl.username || appUrl.password || appUrl.search || appUrl.hash || appUrl.pathname !== '/') throw Error('APP_URL must be an HTTP(S) origin');
  if(appUrl.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(appUrl.hostname))throw Error('HTTPS is required outside localhost');
  if(env.NODE_ENV==='production'&&(appUrl.protocol!=='https:'||!env.APP_ENCRYPTION_KEY))throw Error('Production requires HTTPS and APP_ENCRYPTION_KEY');
  const port=Number(env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
  const paymentMode=env.PAYMENT_MODE||'test';if(!['test','live'].includes(paymentMode))throw Error('PAYMENT_MODE must be test or live');if(paymentMode==='live'&&(env.NODE_ENV!=='production'||appUrl.protocol!=='https:'||env.LIVE_PAYMENTS_ENABLED!=='true'||!String(env.DATABASE_FILE||'').endsWith('.live.sqlite')))throw Error('Live mode requires production HTTPS, LIVE_PAYMENTS_ENABLED=true and a separate .live.sqlite database');const key = env.PAYSTACK_SECRET_KEY || '';
  if(key&&!key.startsWith('sk_'+paymentMode+'_'))throw Error(paymentMode==='test'?'Only Paystack test keys are supported unless live mode is explicitly configured':'Paystack key must match live PAYMENT_MODE');
  const emailProvider = env.EMAIL_PROVIDER || 'disabled';
  if (!['disabled', 'smtp'].includes(emailProvider)) throw Error('EMAIL_PROVIDER must be disabled or smtp');
  if (emailProvider === 'smtp' && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.EMAIL_FROM)) throw Error('SMTP requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM');
  const smtpPort = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw Error('Invalid SMTP_PORT');
  if (env.SMTP_SECURE && !['true','false'].includes(env.SMTP_SECURE)) throw Error('SMTP_SECURE must be true or false');
  const file=path.resolve(env.DATABASE_FILE || env.DATA_FILE || './data/app.sqlite');
  return { mobileApkFile:path.resolve(env.MOBILE_APK_FILE||path.join(path.dirname(file),'..','public-downloads','ChinaLowCost-android.apk')),maintenanceFile:env.MAINTENANCE_FILE||'',paymentMode,trustedProxyCIDRs:env.TRUSTED_PROXY_CIDRS||'',host: env.HOST || '127.0.0.1', port, appUrl: appUrl.origin,secure:appUrl.protocol==='https:',encryptionKeyHex:env.APP_ENCRYPTION_KEY,scanner:env.CLAMSCAN_PATH||'',uploadDirectory:path.resolve(env.UPLOAD_DIRECTORY||'./data/private-files'), key, emailProvider, smtp: { host: env.SMTP_HOST, port: smtpPort, secure: env.SMTP_SECURE === 'true' || (!env.SMTP_SECURE && smtpPort === 465), requireTLS: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true }, emailFrom: env.EMAIL_FROM, supportEmail: env.SUPPORT_EMAIL || 'support@chinalowcost.com', file };
}
module.exports = { config };
