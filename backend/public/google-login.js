window.addEventListener('DOMContentLoaded',()=>{
  const status=document.getElementById('google-status'),form=document.getElementById('google-factor');let challenge='',busy=false;
  function complete(){status.textContent='Signed in. Returning to ChinaLowCost…';if(window.opener){window.opener.postMessage({channel:'clc-google-complete'},location.origin);window.close();}else location.assign('/application#C02');}
  async function submit(path,body){const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Sign-in failed. Please try again.');return data;}
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;try{await submit('/api/auth/login-factor',{challenge,otp:document.getElementById('google-otp').value});challenge='';complete();}catch(error){status.textContent=error.message;}finally{busy=false;button.disabled=false;}});
  if(!window.google?.accounts?.id){status.textContent='Google could not load. Check your connection, then reload this page.';return;}
  google.accounts.id.initialize({client_id:document.querySelector('meta[name="google-client"]').content,nonce:document.querySelector('meta[name="google-nonce"]').content,auto_select:false,callback:async value=>{
    if(busy)return;busy=true;status.textContent='Verifying your Google account…';
    try{const data=await submit('/api/auth/google',{credential:value.credential,referralCode:document.getElementById('google-referral').value,stepwise:true});if(data.factorRequired){challenge=data.challenge;document.getElementById('google-start').hidden=true;form.hidden=false;status.textContent='Your account has two-factor authentication enabled.';document.getElementById('google-otp').focus();}else complete();}catch(error){status.textContent=error.message;}finally{busy=false;}
  }});
  google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',text:'continue_with',width:320});status.textContent='';
});
