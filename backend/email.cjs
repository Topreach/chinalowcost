function createMailer(settings, createTransport) {
  if (settings.emailProvider === 'disabled') return null;
  const transport = (createTransport || require('nodemailer').createTransport)(settings.smtp);
  return { send: message => { const {previewHtml,...content}=require('./email-templates.cjs').emailTemplate(settings,{subject:message.subject,text:message.text,template:'update'}); return transport.sendMail({...content,...message}); } };
}
const mailAvailable=mailer=>!!mailer&&mailer.enabled!==false;
module.exports = { createMailer,mailAvailable };
