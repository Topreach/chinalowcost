/* Approval happens in the trusted website, after its ordinary CAPTCHA, Google/password and 2FA flows. */
(()=>{
 const query=new URL(location.href).searchParams;let pending=query.get('mobile_signin');
 try{if(pending&&/^[a-f0-9]{48}$/.test(pending))sessionStorage.setItem('clc-mobile-approval',pending);else pending=sessionStorage.getItem('clc-mobile-approval');}catch{}
 if(!/^[a-f0-9]{48}$/.test(pending||''))return;
 let stopped=false,shown=false,attempts=0;const clear=()=>{stopped=true;try{sessionStorage.removeItem('clc-mobile-approval');}catch{}};
 async function check(){if(stopped||shown)return;if(++attempts>100){clear();return;}
  try{const infoResponse=await fetch('/api/mobile-auth/info?id='+pending,{cache:'no-store',credentials:'same-origin'});if(!infoResponse.ok){clear();return;}const info=await infoResponse.json(),session=await (await fetch('/api/auth/me',{cache:'no-store',credentials:'same-origin'})).json();if(!session.user)return;
   shown=true;const dialog=document.createElement('dialog');dialog.id='google-popup-help';const title=document.createElement('h2');title.textContent='Approve Android sign-in';const text=document.createElement('p');text.textContent='Sign in as '+session.user.email+' ('+session.user.role+'). Only approve if you started this in your ChinaLowCost app and its code is '+info.code+'. Requested account: '+info.role+'.';const approve=document.createElement('button');approve.textContent='Codes match — approve';const cancel=document.createElement('button');cancel.textContent='Cancel';
   approve.addEventListener('click',async()=>{approve.disabled=true;try{const response=await fetch('/api/mobile-auth/approve',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({id:pending,code:info.code,confirm:true})});const data=await response.json();if(!response.ok)throw Error(data.error);clear();text.textContent='Approved. Return to the ChinaLowCost app to finish signing in.';approve.remove();cancel.textContent='Close';}catch(error){text.textContent=error.message;approve.disabled=false;}});cancel.addEventListener('click',()=>{clear();dialog.close();});dialog.append(title,text,approve,cancel);document.body.append(dialog);dialog.addEventListener('close',()=>{clear();dialog.remove();});dialog.showModal();
  }catch{}finally{if(!stopped&&!shown)setTimeout(check,3000);}
 }
 check();
})();
