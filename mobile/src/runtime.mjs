import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import {Camera,CameraResultType,CameraSource} from '@capacitor/camera';
import {Geolocation} from '@capacitor/geolocation';
import {Network} from '@capacitor/network';
import {createNativeFetch,validateApiOrigin} from './native-api.mjs';
const origin=validateApiOrigin(__CLC_API_ORIGIN__);
const frame=document.getElementById('storefront'),notice=document.getElementById('connection-notice');
const post=message=>frame.contentWindow?.postMessage(message,'*');
let paymentPending=false,cameraBusy=false,mobileSignInBusy=false;
const native=Capacitor.isNativePlatform();
const networkMessage=connected=>{notice.hidden=connected;};
if(native){
 const localFetch=window.fetch.bind(window),apiFetch=createNativeFetch({origin,request:options=>CapacitorHttp.request(options)});
 window.fetch=(input,options)=>{
  const url=new URL(String(input),location.href);
  if(url.pathname.startsWith('/api/')&&(url.origin===location.origin||url.origin===origin))return apiFetch(origin+url.pathname+url.search,options);
  return localFetch(input,options);
 };
 Network.getStatus().then(status=>networkMessage(status.connected));Network.addListener('networkStatusChange',status=>networkMessage(status.connected));
 const resumed=()=>{if(paymentPending){paymentPending=false;post({channel:'clc-mobile-payment-check'});}};
 App.addListener('appStateChange',state=>{if(state.isActive)resumed();});Browser.addListener('browserFinished',resumed);
 App.addListener('backButton',()=>post({channel:'clc-mobile-back'}));
 App.addListener('appUrlOpen',event=>{
  try{const url=new URL(event.url);if(url.protocol==='chinalowcost:'&&url.hostname==='payment-return'){resumed();Browser.close().catch(()=>{});}}catch{}
 });
}
window.clcMobile={
 native,origin,
 async open(value){
  const url=new URL(value,origin);if(url.username||url.password)throw Error('Invalid external destination');
  if(url.protocol==='mailto:'){location.assign(url.href);return;}
  if(url.protocol!=='https:')throw Error('Only HTTPS destinations can be opened');
  if(url.hostname==='checkout.paystack.com')paymentPending=true;
  if(native)await Browser.open({url:url.href});else window.open(url.href,'_blank','noopener,noreferrer');
 },
 async google(){return this.signIn('customer');},
 async signIn(role='customer',mode='login'){
  if(!native||mobileSignInBusy||!['customer','worker','admin'].includes(role))return;
  mobileSignInBusy=true;
  try{
   const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   const challenge=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))),b=>b.toString(16).padStart(2,'0')).join('');
   const call=async(path,body)=>{const response=await window.fetch('/api/mobile-auth/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Mobile sign-in failed');return data;};
   const request=await call('start',{challenge,role});post({channel:'clc-mobile-auth-code',code:request.code});
   const pages={customer:{login:'C01',signup:'C23',reset:'C24'},worker:{login:'W01',signup:'W19',reset:'W20'},admin:{login:'A38',signup:'A39',reset:'A40'}};const page=pages[role][mode]||pages[role].login;
   await Browser.open({url:origin+'/application?mobile_signin='+encodeURIComponent(request.id)+'#'+page});
   while(Date.now()<request.expires){await new Promise(resolve=>setTimeout(resolve,2500));const result=await call('consume',{id:request.id,verifier});if(result.pending)continue;if(result.user?.role!==role)throw Error('The selected account role did not match');await Browser.close().catch(()=>{});location.hash=role==='admin'?'#A01':role==='worker'?'#W02':'#C02';location.reload();return;}
   throw Error('Mobile sign-in expired. Please start again.');
  }catch(error){post({channel:'clc-mobile-notice',text:error.message||'Mobile sign-in could not finish. Please try again.'});}
  finally{mobileSignInBusy=false;}
 },
 async enablePush(){throw Error('Native push notification setup is pending. In-app notifications remain available.');},
 async location(){if(!native)throw Error('Native location is available in the installed app.');return Geolocation.getCurrentPosition({enableHighAccuracy:true,timeout:15000,maximumAge:0});}
};
document.getElementById('retry-connection').addEventListener('click',()=>{frame.src='frame.html'+(location.hash||'#C02');});
window.addEventListener('message',async event=>{
 if(event.source!==frame.contentWindow||event.origin!=='null')return;
 if(event.data?.channel==='clc-mobile-signin'){await window.clcMobile.signIn(event.data.role,event.data.mode);return;}
 if(event.data?.channel==='clc-mobile-minimize'){if(Capacitor.getPlatform()==='android')await App.minimizeApp();return;}
 if(event.data?.channel!=='clc-mobile-camera')return;
 const target=event.data.target;if(!/^[A-Za-z][A-Za-z0-9_-]{0,100}$/.test(target||'')||cameraBusy)return;
 cameraBusy=true;
 try{if(!native)throw Error('Camera capture is available in the installed Android/iOS app.');const photo=await Camera.getPhoto({quality:80,width:1200,height:1200,allowEditing:false,resultType:CameraResultType.DataUrl,source:CameraSource.Prompt,saveToGallery:false});post({channel:'clc-mobile-photo',target,dataUrl:photo.dataUrl});}
 catch{post({channel:'clc-mobile-notice',text:'No photo was attached. You can try again or select an existing file.'});}
 finally{cameraBusy=false;}
});
