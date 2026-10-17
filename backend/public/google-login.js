window.addEventListener('DOMContentLoaded',()=>{
  const status=document.getElementById('google-status');
  if(!window.google?.accounts?.id){status.textContent='Google could not load. Close this window and try again.';return;}
  google.accounts.id.initialize({client_id:document.querySelector('meta[name="google-client"]').content,nonce:document.querySelector('meta[name="google-nonce"]').content,auto_select:false,callback:async value=>{
    status.textContent='Verifying your account…';
    try{const response=await fetch('/api/auth/google',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:value.credential,referralCode:document.getElementById('google-referral').value,otp:document.getElementById('google-otp').value})}),data=await response.json();if(!response.ok)throw Error(data.error);status.textContent='Signed in. Return to the application.';if(window.opener){window.opener.postMessage({channel:'clc-google-complete'},location.origin);window.close();}else location.assign('/application#C02');}catch(error){status.textContent=error.message;}
  }});
  google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large'});
});
