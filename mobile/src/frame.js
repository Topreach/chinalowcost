/* Runs only in the bundled opaque frame; native plugins stay in its parent. */
let mobileFileSequence=0;const mobilePhotoTargets=new Map();
function mobilePhotoButtons(){for(const input of document.querySelectorAll('input[type="file"]')){
 if(!input.accept.includes('image/')||input.dataset.mobilePhoto)continue;
 if(!input.id)input.id='mobile-photo-'+(++mobileFileSequence);input.dataset.mobilePhoto='1';
 const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Take photo';button.onclick=()=>{mobilePhotoTargets.clear();mobilePhotoTargets.set(input.id,{input,owner:connectedUser?.id});parent.postMessage({channel:'clc-mobile-camera',target:input.id},'*');};input.insertAdjacentElement('afterend',button);
}}
new MutationObserver(mobilePhotoButtons).observe(document.getElementById('app'),{subtree:true,childList:true});mobilePhotoButtons();
window.addEventListener('message',async event=>{
 if(event.source!==parent)return;const message=event.data;
 if(message?.channel==='clc-mobile-notice')toast(String(message.text||'').slice(0,300));
 if(message?.channel==='clc-mobile-back'){if($('modal')?.open)$('modal').close();else if(route===(connectedUser?AUTH_ROUTES[connectedUser.role].home:'C02'))parent.postMessage({channel:'clc-mobile-minimize'},'*');else if(typeof goBack==='function')goBack();else if(route!=='C02')go('C02');}
 if(message?.channel==='clc-mobile-payment-check'){try{await connectedRefresh();render();toast('Order status refreshed. Confirm the payment status before paying again.');}catch(error){toast(error.message);}}
 if(message?.channel==='clc-mobile-photo'){
  const input=document.getElementById(message.target),pending=mobilePhotoTargets.get(message.target);mobilePhotoTargets.delete(message.target);if(!input||pending?.input!==input||pending.owner!==connectedUser?.id||input.type!=='file'||typeof message.dataUrl!=='string'||message.dataUrl.length>2000000||!/^data:image\/(jpeg|png);base64,/.test(message.dataUrl))return;
  try{const [prefix,encoded]=message.dataUrl.split(','),bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),type=prefix.includes('png')?'image/png':'image/jpeg',transfer=new DataTransfer();transfer.items.add(new File([bytes],'product-photo.'+(type==='image/png'?'png':'jpg'),{type}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));toast('Photo attached. Review it before submitting.');}catch{toast('Could not attach this photo. Use the file picker instead.');}
 }
});
// Google OAuth requires native client identifiers, not the website popup.
connectedStartGoogle=()=>parent.postMessage({channel:'clc-google-start'},'*');
opsDeviceCheckin=()=>openModal('Share worker location?',note('Share your current location for this on-shift check-in. Authorized administrators can view it for up to 15 minutes. This does not enable background tracking.')+button('Share location now','mobileWorkerCheckin()')+button('Cancel',"$('modal').close()",'secondary'));
async function mobileWorkerCheckin(){$('modal').close();try{await connectedRequest('device-location',{consent:true});await connectedRefresh();render();toast('Location check-in saved.');}catch(error){toast(error.message);}}
