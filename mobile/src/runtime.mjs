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
let paymentPending=false,cameraBusy=false;
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
 async google(){post({channel:'clc-mobile-notice',text:'Google sign-in for the native app needs mobile OAuth configuration. Please sign in with your email and password for this test version.'});},
 async enablePush(){throw Error('Native push notification setup is pending. In-app notifications remain available.');},
 async location(){if(!native)throw Error('Native location is available in the installed app.');return Geolocation.getCurrentPosition({enableHighAccuracy:true,timeout:15000,maximumAge:0});}
};
document.getElementById('retry-connection').addEventListener('click',()=>{frame.src='frame.html'+(location.hash||'#C02');});
window.addEventListener('message',async event=>{
 if(event.source!==frame.contentWindow||event.origin!=='null')return;
 if(event.data?.channel==='clc-mobile-minimize'){if(Capacitor.getPlatform()==='android')await App.minimizeApp();return;}
 if(event.data?.channel!=='clc-mobile-camera')return;
 const target=event.data.target;if(!/^[A-Za-z][A-Za-z0-9_-]{0,100}$/.test(target||'')||cameraBusy)return;
 cameraBusy=true;
 try{if(!native)throw Error('Camera capture is available in the installed Android/iOS app.');const photo=await Camera.getPhoto({quality:80,width:1200,height:1200,allowEditing:false,resultType:CameraResultType.DataUrl,source:CameraSource.Prompt,saveToGallery:false});post({channel:'clc-mobile-photo',target,dataUrl:photo.dataUrl});}
 catch{post({channel:'clc-mobile-notice',text:'No photo was attached. You can try again or select an existing file.'});}
 finally{cameraBusy=false;}
});
