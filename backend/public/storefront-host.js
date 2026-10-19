/* The designed UI runs in an opaque sandbox. Only this host owns server cookies/CSRF. */
(() => {
  const frame=document.getElementById('storefront');
  const allowed=new Set(['deletion-request','me','login','login-factor','logout','register','forgot','resend','consume','password','mfa/enroll','mfa/confirm','mfa/disable','mfa/recovery','sessions/revoke-others','profile']);
  const reads={'delivery-location':'/api/orders','deletion-queue':'/api/admin/account-deletions','email-config':'/api/admin/email','email-inbox':'/api/admin/email/inbox','email-message':'/api/admin/email/message','email-public':'/api/email/public','operations-config':'/api/admin/operations','operations-report':'/api/admin/reports','whatsapp-automation':'/api/admin/whatsapp/automation','whatsapp-public':'/api/whatsapp/config','account-profile':'/api/auth/profile',catalog:'/api/storefront/catalog',snapshot:'/api/business/snapshot',orders:'/api/orders',messages:'/api/notifications','notifications-page':'/api/notifications','notifications-push':'/api/notifications/push','notifications-admin':'/api/admin/notifications',users:'/api/admin/users',audit:'/api/admin/audit','paystack-config':'/api/admin/paystack','google-config':'/api/admin/google','google-public':'/api/google/public','openai-config':'/api/admin/openai','announcement-history':'/api/admin/messages'};
  const writes=new Set(['customer-location','cart','address','saved','quote','quote-approve','checkout','supplier','staff','task','task-action','rate','catalog-draft','catalog-review','catalog-arrange','catalog-remove','support-message','shift','checkin','video-remove','referral-code','wallet-cancel','referral-attach','referral-config','promotion','promo-preview']);
  let captchaLoading;
  function loadCaptcha(key){if(!captchaLoading)captchaLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://www.google.com/recaptcha/api.js?render='+encodeURIComponent(key);script.onload=()=>window.grecaptcha.ready(resolve);script.onerror=()=>{captchaLoading=null;reject(Error('Security check could not load'));};document.head.appendChild(script);});return captchaLoading;}
  let googlePopup;
  function googlePopupHelp(url){
    document.getElementById('google-popup-help')?.remove();
    const dialog=document.createElement('dialog');dialog.id='google-popup-help';dialog.setAttribute('aria-labelledby','google-popup-title');
    const title=document.createElement('h2');title.id='google-popup-title';title.textContent='Open Google sign-in';
    const text=document.createElement('p');text.textContent='Your browser blocked the sign-in window. Select Open sign-in window, then allow pop-ups for this website if your browser asks. You can also continue in this tab.';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Open sign-in window';retry.addEventListener('click',()=>{googlePopup=window.open(url,'clc-google-login','popup,width=500,height=650');if(googlePopup)dialog.close();else text.textContent='The window is still blocked. Use the blocked-pop-up icon in your browser address bar to allow it, or continue in this tab.';});
    const sameTab=document.createElement('a');sameTab.href=url;sameTab.textContent='Continue in this tab';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>dialog.close());
    dialog.append(title,text,retry,sameTab,cancel);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
  }
  window.addEventListener('message',event=>{
    if(event.origin===location.origin&&event.source===googlePopup&&event.data?.channel==='clc-google-complete'){location.hash='#C02';location.reload();return;}
    if(event.source===frame.contentWindow&&event.origin==='null'&&event.data?.channel==='clc-google-start'){const googleUrl='/google-login'+(/^[A-Za-z0-9_-]{3,24}$/.test(event.data.referralCode||'')?'?referral_code='+encodeURIComponent(event.data.referralCode):'');googlePopup=window.open(googleUrl,'clc-google-login','popup,width=500,height=650');if(!googlePopup)googlePopupHelp(googleUrl);}
    if(event.source===frame.contentWindow&&event.origin==='null'&&event.data?.channel==='clc-worker-map'){
      const workerId=event.data.workerId;
      fetch('/api/business/snapshot',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{const p=data.staff?.find(w=>w.id===workerId)?.position;if(p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))location.assign('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.latitude+','+p.longitude));}).catch(()=>{});
    }
  });
  let whatsappDraftUrl='';
  let supportEmail='';let currentUser=null;let csrf='',busy=0;const sourceUrls=new Set();
  const paymentReference=new URL(location.href||'http://localhost/').searchParams.get('payment_reference');
  frame.src='/application/frame'+(paymentReference?'#C13':location.hash||'#C02');
  if(typeof frame.addEventListener==='function')frame.addEventListener('load',()=>{if(typeof paymentReference==='string'&&/^CLC-[a-f0-9]{32}$/.test(paymentReference))frame.contentWindow.postMessage({channel:'clc-payment-return',reference:paymentReference},'*');});
  window.addEventListener('message',async event=>{
    if(event.source!==frame.contentWindow||event.origin!=='null')return;
    const message=event.data;
    if(message?.channel==='clc-delivery-map'){try{if(!/^[A-Za-z0-9-]{1,80}$/.test(message.orderId||'')||!['address','pin'].includes(message.kind))throw Error();const response=await fetch('/api/orders/'+encodeURIComponent(message.orderId)+'/delivery-location',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const data=await response.json(),target=new URL(data.mapUrls[message.kind]);if(target.origin!=='https://www.google.com'||target.pathname!=='/maps/search/'||target.username||target.password)throw Error();location.assign(target.href);}catch{frame.contentWindow.postMessage({channel:'clc-delivery-error',text:'Delivery map is unavailable or this order is no longer assigned. Refresh the order.'},'*');}return;}
    if(message?.channel==='clc-language-setting'&&['en','yo','ha','ig'].includes(message.language)){try{localStorage.setItem('clc-application-language',message.language);}catch{}return;}
    if(message?.channel==='clc-support-email'){if(supportEmail)location.assign('mailto:'+encodeURIComponent(supportEmail)+'?subject=ChinaLowCost%20support%20request');return;}
    if(message?.channel==='clc-whatsapp-open'){if(whatsappDraftUrl)location.assign(whatsappDraftUrl);return;}
    if(message?.channel==='clc-evidence'&&/^[a-f0-9]{48}$/.test(message.id||'')){window.open('/api/files/'+message.id,'_blank','noopener,noreferrer');return;}
    if(message?.channel==='clc-open-source'){try{const target=new URL(message.url);if(sourceUrls.has(target.href)&&target.protocol==='https:'&&!target.username&&!target.password)window.open(target.href,'_blank','noopener,noreferrer');}catch{}return;}
    if(message?.channel==='clc-route-navigation'&&/^[CAW]\d{2}$/.test(message.route)){history.replaceState(null,'','#'+message.route);return;}
    if(message?.channel==='clc-payment-navigation'){
      try{const target=new URL(message.url);if(target.protocol==='https:'&&target.hostname==='checkout.paystack.com'&&!target.username&&!target.password&&!target.port)location.assign(target.href);}catch{}return;
    }
    if(!message||message.channel!=='clc-server-auth'||!Number.isSafeInteger(message.id)||!allowed.has(message.action)&&!Object.hasOwn(reads,message.action)&&!writes.has(message.action)&&!['email-save','email-verify','email-test','email-sync','email-reply','email-status','offline-list','offline-save','offline-replay','offline-delete','import-preview','import-commit','operations-action','order-cancel','notifications-delivery','notifications-device','notifications-disable-device','notifications-preferences','notifications-admin-save','notifications-read','whatsapp-automation-save','whatsapp-save','whatsapp-link','video','draft-video','fulfillment','order-evidence','worker-ai','paystack-save','paystack-test','paystack-admin-verify','google-save','device-location','image','pay','verify-payment','worker-create','worker-status','message-read','draft-media','ai-chat','openai-save','openai-test','ai-discover','announcement-preview','announcement-send','announcement-deliver'].includes(message.action))return;
    const reply=data=>frame.contentWindow.postMessage({channel:'clc-server-auth-reply',id:message.id,...data},'*');
    if(busy>=6){reply({error:'Please wait for your previous request.'});return;}
    busy++;
    try{
      if(message.action.startsWith('offline-')){if(!currentUser||currentUser.role!=='worker')throw Error('Worker sign-in required');const owner=currentUser.id;let data;if(message.action==='offline-list')data=await clcOfflineQueue.list(currentUser);if(message.action==='offline-save')data=await clcOfflineQueue.save(currentUser,message.body);if(message.action==='offline-delete')data=await clcOfflineQueue.remove(currentUser,message.body?.id);if(message.action==='offline-replay')data=await clcOfflineQueue.replay(currentUser,async body=>{if(currentUser?.id!==owner)throw Object.assign(Error('Session changed'),{status:401});const r=await fetch('/api/business/task-action',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});if(!r.ok)throw Object.assign(Error('Task action was not accepted'),{status:r.status});});reply({data});return;}
      if(message.action==='notifications-device'){await enableNotificationDevice();reply({data:{ok:true}});return;}if(message.action==='notifications-disable-device'){await disableNotificationDevice();reply({data:{ok:true}});return;}
      const method=message.action==='me'||['draft-media','draft-video'].includes(message.action)||Object.hasOwn(reads,message.action)?'GET':'POST';
      let route=reads[message.action]||(writes.has(message.action)?'/api/business/'+message.action:'/api/auth/'+message.action);
      const aliases={'customer-location':'/api/customer/location','email-save':'/api/admin/email','email-verify':'/api/admin/email/verify','email-test':'/api/admin/email/test','email-sync':'/api/admin/email/sync','email-reply':'/api/admin/email/reply','email-status':'/api/admin/email/status','import-preview':'/api/admin/import/preview','import-commit':'/api/admin/import/commit','notifications-delivery':'/api/admin/notifications/delivery','notifications-read':'/api/notifications/read','notifications-preferences':'/api/notifications/preferences','notifications-admin-save':'/api/admin/notifications','whatsapp-automation-save':'/api/admin/whatsapp/automation','whatsapp-save':'/api/admin/whatsapp','whatsapp-link':'/api/whatsapp/link','worker-ai':'/api/worker/catalog/analyze','paystack-admin-verify':'/api/admin/paystack/verify','paystack-save':'/api/admin/paystack','paystack-test':'/api/admin/paystack/test','google-save':'/api/admin/google','device-location':'/api/business/location',pay:'/api/paystack/initialize','verify-payment':'/api/paystack/verify','worker-create':'/api/business/worker-create','worker-status':'/api/admin/users/status','message-read':'/api/notifications/read','ai-chat':'/api/ai/chat','openai-save':'/api/admin/openai','openai-test':'/api/admin/openai/test','ai-discover':'/api/admin/catalog/discover','announcement-preview':'/api/admin/messages/preview','announcement-send':'/api/admin/messages/send','announcement-deliver':'/api/admin/messages/deliver'};
      if(Object.hasOwn(aliases,message.action))route=aliases[message.action];if(message.action==='order-cancel')route='/api/orders/cancel';if(message.action==='operations-action'){if(!['stock','po-create','po-review','po-receive','policy','scopes','category','refund-request','refund-review','refund-execute','refund-verify','settlement-create','settlement-review','settlement-execute','settlement-verify'].includes(message.body?.operation))throw Error('Unknown business operation');route='/api/admin/operations/'+message.body.operation;}
      if(message.action==='fulfillment'){if(!['visit-consent','renew-code','availability','submit','review','dispatch','transit','return-request','return-review','cash','cash-review','settings'].includes(message.body?.operation))throw Error('Unknown fulfillment operation');route='/api/fulfillment/'+message.body.operation;}
      if(message.action==='draft-video'){if(!/^[a-f0-9]{48}$/.test(message.body?.id))throw Error('Invalid video');route='/api/catalog/video/'+message.body.id;}
      if(message.action==='draft-media'){if(!/^[a-f0-9]{48}$/.test(message.body?.id))throw Error('Invalid image');route='/api/catalog/media/'+message.body.id;}
      if(message.action==='email-message'){const id=Number(message.body?.id);if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid email identifier');route+='?id='+id;}
      if(message.action==='email-inbox'&&message.body?.before){const before=Number(message.body.before);if(!Number.isSafeInteger(before)||before<1)throw Error('Invalid email cursor');route+='?before='+before;}
      if(message.action==='operations-report'){const q=new URLSearchParams();for(const key of ['start','end'])if(typeof message.body?.[key]==='string'&&message.body[key])q.set(key,message.body[key]);route+='?'+q.toString();}
      if(message.action==='notifications-page'&&message.body?.before){const before=Number(message.body.before);if(!Number.isSafeInteger(before)||before<1)throw Error('Invalid cursor');route+='?before='+before;}
      if(message.action==='delivery-location'){if(!/^[A-Za-z0-9-]{1,80}$/.test(message.body?.orderId||''))throw Error('Invalid order');route='/api/orders/'+encodeURIComponent(message.body.orderId)+'/delivery-location';}
      let body={...message.body};
      if(['logout','password','mfa/disable'].includes(message.action))await disableNotificationDevice().catch(()=>{});
      if(message.action==='customer-location'){
        if(currentUser?.role!=='customer'||body.consent!==true)throw Error('Sign in as a customer and allow location access first.');
        if(!navigator.geolocation)throw Error('Device location is unavailable. Enter your address manually.');
        const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,()=>reject(Error('Location permission denied or unavailable. Enter your address manually.')),{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
        body={consent:true,useGoogle:body.useGoogle===true,position:{latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:p.timestamp}};
      }
      if(message.action==='device-location'){
        const ready=await fetch('/api/business/location-ready',{credentials:'same-origin'});if(!ready.ok)throw Error('Enable location and start your shift with consent first.');
        if(body.consent!==true)throw Error('Explicit location consent required');
        if(!navigator.geolocation)throw Error('Device location is unavailable');
        const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,()=>reject(Error('Location permission denied or location unavailable')),{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
        body={consent:true,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp};
      }
      if(['login','register','forgot','resend'].includes(message.action)){
        const cfg=await (await fetch('/api/google/public',{credentials:'same-origin'})).json();
        if(cfg.captchaEnabled){await loadCaptcha(cfg.siteKey);body.captchaToken=await grecaptcha.execute(cfg.siteKey,{action:message.action});}
      }
      let payload=JSON.stringify(body),type='application/json';
      if(message.action==='order-evidence'){if(!/^[A-Za-z0-9-]{1,80}$/.test(body.orderId||'')||!(body.bytes instanceof ArrayBuffer)||body.bytes.byteLength>5242880)throw Error('Use an evidence file under 5 MB');route='/api/orders/'+body.orderId+'/files';payload=body.bytes;type='application/octet-stream';}
      if(message.action==='video'){if(!/^[a-f0-9]{32}$/.test(body.id)||!(body.bytes instanceof ArrayBuffer)||body.bytes.byteLength>5242880)throw Error('Use an MP4 under 5 MB');route='/api/business/catalog/'+body.id+'/videos';payload=body.bytes;type='application/octet-stream';}
      if(message.action==='image'){
        if(!/^[a-f0-9]{32}$/.test(message.body?.id)||!(message.body.bytes instanceof ArrayBuffer)||message.body.bytes.byteLength>5242880)throw Error('Use a JPEG or PNG image under 5 MB');
        route='/api/business/catalog/'+message.body.id+'/images';payload=message.body.bytes;type='application/octet-stream';
      }
      const response=await fetch(route,{method,credentials:'same-origin',headers:{'Content-Type':type,'X-CSRF-Token':csrf},...(method==='POST'?{body:payload}:{})});
      if(['draft-media','draft-video'].includes(message.action)&&response.ok){
        const mime=response.headers.get('content-type');if(!(message.action==='draft-video'?['video/mp4']:['image/jpeg','image/png']).includes(mime))throw Error('Invalid product image');
        const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>5242880)throw Error('Image too large');
        let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));reply({data:{url:'data:'+mime+';base64,'+btoa(raw)}});return;
      }
      const data=await response.json();
      if(response.status===401&&!allowed.has(message.action)){csrf='';frame.contentWindow.postMessage({channel:'clc-session-expired'},'*');}
      if(!response.ok)throw Error(data.error||'Account request failed');
      for(const item of [data,...(Array.isArray(data.drafts)?data.drafts:[])])for(const source of [...(Array.isArray(item.sources)?item.sources:[]),...(Array.isArray(item.candidates)?item.candidates:[])])for(const value of [source.url,source.sourceUrl]){if(typeof value==='string'){try{const target=new URL(value);if(target.protocol==='https:'&&!target.username&&!target.password&&sourceUrls.size<1000)sourceUrls.add(target.href);}catch{}}}
      if(message.action==='email-public')supportEmail=typeof data.supportEmail==='string'&&/^[^\s<>:,;?]+@[^\s<>:,;?]+\.[^\s<>:,;?]+$/.test(data.supportEmail)?data.supportEmail:'';
      if(typeof data.csrf==='string')csrf=data.csrf;if(['me','login','login-factor','mfa/confirm','profile'].includes(message.action))currentUser=data.user||null;
      if(message.action==='logout'||message.action==='password'||message.action==='mfa/disable'){csrf='';currentUser=null;sourceUrls.clear();whatsappDraftUrl='';}
      if(message.action==='whatsapp-link'){const target=new URL(data.url);if(target.origin!=='https://wa.me'||!/^\/[1-9][0-9]{7,14}$/.test(target.pathname)||target.username||target.password||target.port)throw Error('Invalid WhatsApp link');whatsappDraftUrl=target.href;}
      // The child does not receive CSRF/session tokens.
      delete data.csrf;
      reply({data});
    }catch(error){reply({error:error.message});}finally{busy--;}
  });
  window.addEventListener('hashchange',()=>{if(/^#[CAW]\d{2}$/.test(location.hash))frame.contentWindow.postMessage({channel:'clc-route',route:location.hash.slice(1)},'*');});
  if(typeof frame.addEventListener==='function')frame.addEventListener('load',()=>{let language='en';try{const saved=localStorage.getItem('clc-application-language');if(['en','yo','ha','ig'].includes(saved))language=saved;}catch{}frame.contentWindow.postMessage({channel:'clc-language',language},'*');});

  async function notificationPost(route,body){const r=await fetch(route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Notification setup failed');return data;}
  async function enableNotificationDevice(){if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Push is unavailable on this browser. Use a supported HTTPS browser; on iPhone/iPad, open the installed Home Screen app.');const r=await fetch('/api/notifications/push',{credentials:'same-origin'}),cfg=await r.json();if(!r.ok||!cfg.enabled||!cfg.publicKey)throw Error('Admin must enable browser push first');const permission=await new Promise((resolve,reject)=>{const dialog=document.createElement('dialog'),text=document.createElement('p'),yes=document.createElement('button'),no=document.createElement('button');text.textContent='Allow ChinaLowCost to send device notifications? Only a generic account alert appears on your lock screen.';yes.textContent='Enable notifications';no.textContent='Cancel';dialog.append(text,yes,no);document.body.appendChild(dialog);const finish=v=>{dialog.close();dialog.remove();resolve(v);};yes.onclick=()=>Notification.requestPermission().then(finish,reject);no.onclick=()=>finish('denied');dialog.oncancel=()=>finish('denied');dialog.showModal();});if(permission!=='granted')throw Error('Notification permission was not granted');const registration=await navigator.serviceWorker.register('/notification-sw.js',{scope:'/'});await navigator.serviceWorker.ready;const existing=await registration.pushManager.getSubscription();const key=Uint8Array.from(atob(cfg.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),sub=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await notificationPost('/api/notifications/subscribe',sub.toJSON());}
  async function disableNotificationDevice(){if(!('serviceWorker' in navigator))return;const reg=await navigator.serviceWorker.getRegistration('/');const sub=reg&&await reg.pushManager.getSubscription();if(!sub)return;await notificationPost('/api/notifications/unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}
})();
