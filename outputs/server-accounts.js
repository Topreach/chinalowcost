/* Server authentication adapter for the original designed screens. No local credentials. */
// The opaque frame deliberately disallows native form submission. Dispatch only
// the existing JavaScript submit handler after native validation, without navigation.
function connectedSubmitForm(form){
  if(!form||!form.hasAttribute('onsubmit')||!form.reportValidity())return;
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
}
document.addEventListener('click',event=>{
  const control=event.target.closest?.('button,input[type="submit"]');
  if(!control?.form||control.type!=='submit'||control.disabled)return;
  event.preventDefault();connectedSubmitForm(control.form);
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||event.isComposing||!event.target.matches?.('input')||['button','submit','checkbox','radio','file'].includes(event.target.type))return;
  if(event.target.form?.hasAttribute('onsubmit')){event.preventDefault();connectedSubmitForm(event.target.form);}
});
let connectedUser=null,connectedMfa=false,connectedSequence=0;
const connectedPending=new Map();
window.addEventListener('message',event=>{
  if(event.source!==parent||!event.data||event.data.channel!=='clc-server-auth-reply')return;
  const pending=connectedPending.get(event.data.id);if(!pending)return;
  connectedPending.delete(event.data.id);clearTimeout(pending.timer);
  if(event.data.error)pending.reject(Error(event.data.error));else pending.resolve(event.data.data);
});
function connectedRequest(action,body={}){return new Promise((resolve,reject)=>{
  const id=++connectedSequence;
  const timer=setTimeout(()=>{connectedPending.delete(id);reject(Error('Server request timed out. Please try again.'));},action==='ai-discover'?180000:['ai-chat','openai-test','email-sync'].includes(action)?90000:30000);
  connectedPending.set(id,{resolve,reject,timer});
  parent.postMessage({channel:'clc-server-auth',id,action,body},'*');
});}
function connectedSetSession(result){
  if(connectedUser?.id!==result.user?.id){opsAssets.clear();opsDevicePositions.clear();enhEvidenceFiles.clear();}
  connectedUser=result.user?{...result.user,name:result.user.name||result.user.email,workerId:result.user.role==='worker'?result.user.id:undefined,scope:result.user.role==='admin'?'Manager':result.user.role==='worker'?'Fieldworker':'Customer'}:null;
  connectedMfa=!!result.mfaRequired;
  authDatabase={users:connectedUser?[connectedUser]:[],invitations:[]};authSessions={};
}
authSession=role=>connectedUser?.role===role?connectedUser:null;
authInitialize=async()=>{try{connectedSetSession(await connectedRequest('me'));authBooted=true;render();}catch(error){authBootError=error.message;authBooted=true;render();}};
authLoginValues=async(role,email,password)=>{
  try{
    const result=await connectedRequest('login',{email,password,stepwise:true});
    if(result.factorRequired){connectedLoginChallenge={token:result.challenge,role};return {ok:false,factorRequired:true};}
    connectedSetSession(result);
    if(connectedUser.role!==role){const actualRole=connectedUser.role;await connectedRequest('logout');connectedSetSession({});return {ok:false,message:'Use the '+actualRole+' account sign-in page.'};}
    return {ok:true,user:connectedUser};
  }catch(error){return {ok:false,message:error.message==='Invalid credentials, verification or authenticator code'?'Unable to sign in. Check your email and password, verify your email, and enter a valid authenticator or recovery code if two-factor authentication is enabled.':error.message};}
};
authLogout=async role=>{try{await connectedRequest('logout');connectedSetSession({});go(AUTH_ROUTES[role].login);}catch(error){toast(error.message);}};
authSignupForm=async role=>{
  const status=$('auth-status');
  if(role!=='customer'){status.textContent='Staff accounts are issued by an administrator.';return;}
  if($('auth-password').value!==$('auth-confirm').value){status.textContent='Passwords do not match.';return;}
  try{const result=await connectedRequest('register',{email:$('auth-email').value,password:$('auth-password').value,name:$('auth-name')?.value||'',referralCode:$('signup-referral-code')?.value||''});$('auth-password').value='';$('auth-confirm').value='';status.textContent=result.message;}catch(error){status.textContent=error.message;}
};
authResetForm=async()=>{try{const result=await connectedRequest('forgot',{email:$('auth-email').value});$('auth-status').textContent=result.message;}catch(error){$('auth-status').textContent=error.message;}};
authPasswordForm=async role=>{
  const status=$('auth-status');
  if($('auth-new').value!==$('auth-confirm').value){status.textContent='Passwords do not match.';return;}
  try{await connectedRequest('password',{current:$('auth-current').value,password:$('auth-new').value});connectedSetSession({});go(AUTH_ROUTES[role].login);toast('Password changed. Sign in again.');}catch(error){status.textContent=error.message;}
};
// Keep authentication feedback visible and prevent duplicate requests.
let connectedAuthBusy=false,connectedLoginChallenge=null;
function connectedShowFactor(){
  const role=connectedLoginChallenge.role;
  $('app').innerHTML=authPublicShell(heading('Two-factor authentication','Enter the code from your authenticator or a recovery code.')+card('Verify your sign-in',`<form onsubmit="event.preventDefault();connectedVerifyLogin()">${field('auth-otp','Authenticator or recovery code','','text','required autocomplete="one-time-code"')}<button type="submit" class="auth-submit">Verify and sign in</button><p id="auth-status" tabindex="-1" role="status" aria-live="polite"></p></form>`+button('Back to sign in',"connectedLoginChallenge=null;render()",'secondary')),PAGES.find(p=>p.ID===AUTH_ROUTES[role].login));
}
async function connectedVerifyLogin(){return connectedAuthSubmit(async()=>{
  if(!connectedLoginChallenge)return;const {token,role}=connectedLoginChallenge;
  const result=await connectedRequest('login-factor',{challenge:token,otp:$('auth-otp').value.trim()});
  connectedLoginChallenge=null;connectedSetSession(result);
  if(connectedUser.role!==role){await connectedRequest('logout');connectedSetSession({});render();toast('Use the correct account sign-in page.');return;}
  await connectedRefresh();go(authReturnTo[role]||authScopeHome(role));delete authReturnTo[role];
});}

function connectedAuthStatus(message,error=false){
  const status=$('auth-status');if(!status)return;
  status.textContent=message;status.setAttribute('role',error?'alert':'status');
  status.setAttribute('aria-live',error?'assertive':'polite');
  if(error){status.focus();toast(message);}
}
async function connectedAuthSubmit(work){
  if(connectedAuthBusy)return;
  connectedAuthBusy=true;
  const submit=document.querySelectorAll('.auth-submit[type="submit"]');
  submit.forEach(button=>{button.disabled=true;});
  try{await work();}catch(error){connectedAuthStatus(error.message||'Request failed. Please try again.',true);}
  finally{connectedAuthBusy=false;submit.forEach(button=>{button.disabled=false;});}
}
authLoginForm=async role=>connectedAuthSubmit(async()=>{
  const email=$('auth-email').value.trim(),password=$('auth-password').value;
  if(!/^\S+@\S+\.\S+$/.test(email)||!password){connectedAuthStatus('Enter a valid email address and your password.',true);return;}
  connectedAuthStatus('Signing in…');
  const result=await authLoginValues(role,email,password);
  $('auth-password').value='';
  if(result.factorRequired){connectedShowFactor();return;}
  if(!result.ok){connectedAuthStatus(result.message,true);return;}
  const target=authReturnTo[role]||authScopeHome(role);
  if(role==='customer')authRestoreSelection();delete authReturnTo[role];go(target);
});
authSignupForm=async role=>connectedAuthSubmit(async()=>{
  if(role!=='customer'){connectedAuthStatus('Staff accounts are issued by an administrator.',true);return;}
  const name=$('auth-name').value.trim(),email=$('auth-email').value.trim(),password=$('auth-password').value;
  if(!name||!/^\S+@\S+\.\S+$/.test(email)){connectedAuthStatus('Enter your name and a valid email address.',true);return;}
  if(password.length<12||password.length>128){connectedAuthStatus('Use a password with 12–128 characters.',true);return;}
  if(password!==$('auth-confirm').value){connectedAuthStatus('Passwords do not match.',true);return;}
  connectedAuthStatus('Creating your account…');
  const result=await connectedRequest('register',{name,email,password,referralCode:$('signup-referral-code')?.value||''});
  $('auth-password').value='';$('auth-confirm').value='';
  connectedAuthStatus(result.message+' Check your inbox and spam folder for the verification link before signing in.');
});
const connectedAccessBase=authAccessPage;
authAccessPage=(role,mode='login')=>{
  let html=connectedAccessBase(role,mode)
    .replace(/<details class="auth-demo">[\s\S]*?<\/details>/,'')
    .replace(/<p class="auth-local-note">[\s\S]*?<\/p>/,'<p class="auth-local-note">Accounts are verified by the server. Email verification is required.</p>')
    .replace('At least 10 characters, uppercase, lowercase and a number.','Use 12–128 characters.')
    .replace('<small>At least 10 characters, uppercase, lowercase and a number.</small>','<small>Use 12–128 characters.</small>');

  if(mode==='reset'){
    html=html.replace(/<form[\s\S]*?<\/form>/,`<form onsubmit="event.preventDefault();authResetForm('${role}')">${field('auth-email','Account email','','email','required')}<button type="submit" class="auth-submit">Send reset email</button><p id="auth-status" role="status"></p></form>`);
  }
  return html.replace('id="auth-status"','id="auth-status" tabindex="-1" aria-live="polite" aria-atomic="true"');
};
authFillDemo=()=>toast('Demo accounts do not grant server access.');
authCreateInvitation=()=>toast('Server staff invitations are managed by an authorized administrator.');
const connectedSecurityBase=authSecurityPage;
authSecurityPage=role=>connectedSecurityBase(role).replace(/Up to 8 hours[^<]*/,'Server-managed session').replace(/<form[^>]*>[\s\S]*?Create local invitation[\s\S]*?<\/form>/,'');
async function connectedEnroll(){try{const result=await connectedRequest('mfa/enroll',{password:$('connected-password').value});$('connected-password').value='';$('connected-secret').textContent=result.secret;$('connected-uri').textContent=result.uri;}catch(error){toast(error.message);}}
async function connectedConfirm(){try{connectedSetSession(await connectedRequest('mfa/confirm',{otp:$('connected-otp').value}));render();}catch(error){toast(error.message);}}
const connectedRenderBase=render;
render=()=>{
  if(connectedLoginChallenge){connectedShowFactor();return;}
  if(connectedMfa&&connectedUser?.role==='admin'){
    const page=PAGES.find(p=>p.ID==='A41');
    $('app').innerHTML=authPublicShell(heading('Secure your administrator account','Add the secret to your authenticator, then enter its current code.')+card('Authenticator setup',field('connected-password','Current password','','password')+button('Generate authenticator secret','connectedEnroll()')+'<p id="connected-secret"></p><p id="connected-uri"></p>'+field('connected-otp','Authenticator code','','text')+button('Confirm authenticator','connectedConfirm()')),page);return;
  }
  connectedRenderBase();
};
