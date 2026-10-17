/* Server authentication adapter for the original designed screens. No local credentials. */
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
  const timer=setTimeout(()=>{connectedPending.delete(id);reject(Error('Server request timed out. Please try again.'));},action==='ai-discover'?180000:['ai-chat','openai-test'].includes(action)?90000:30000);
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
    const result=await connectedRequest('login',{email,password,otp:$('auth-otp')?.value||''});
    connectedSetSession(result);
    if(connectedUser.role!==role){const actualRole=connectedUser.role;await connectedRequest('logout');connectedSetSession({});return {ok:false,message:'Use the '+actualRole+' account sign-in page.'};}
    return {ok:true,user:connectedUser};
  }catch(error){return {ok:false,message:error.message};}
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
const connectedAccessBase=authAccessPage;
authAccessPage=(role,mode='login')=>{
  let html=connectedAccessBase(role,mode)
    .replace(/<details class="auth-demo">[\s\S]*?<\/details>/,'')
    .replace(/<p class="auth-local-note">[\s\S]*?<\/p>/,'<p class="auth-local-note">Accounts are verified by the server. Email verification is required.</p>')
    .replace('At least 10 characters, uppercase, lowercase and a number.','Use 12–128 characters.')
    .replace('<small>At least 10 characters, uppercase, lowercase and a number.</small>','<small>Use 12–128 characters.</small>');
  if(mode==='login')html=html.replace('<div class="auth-form-links">',field('auth-otp','Authenticator or recovery code (if enabled)','','text','autocomplete="one-time-code"')+'<div class="auth-form-links">');
  if(mode==='reset'){
    html=html.replace(/<form[\s\S]*?<\/form>/,`<form onsubmit="event.preventDefault();authResetForm('${role}')">${field('auth-email','Account email','','email','required')}<button type="submit" class="auth-submit">Send reset email</button><p id="auth-status" role="status"></p></form>`);
  }
  return html;
};
authFillDemo=()=>toast('Demo accounts do not grant server access.');
authCreateInvitation=()=>toast('Server staff invitations are managed by an authorized administrator.');
const connectedSecurityBase=authSecurityPage;
authSecurityPage=role=>connectedSecurityBase(role).replace(/Up to 8 hours[^<]*/,'Server-managed session').replace(/<form[^>]*>[\s\S]*?Create local invitation[\s\S]*?<\/form>/,'');
async function connectedEnroll(){try{const result=await connectedRequest('mfa/enroll',{password:$('connected-password').value});$('connected-password').value='';$('connected-secret').textContent=result.secret;$('connected-uri').textContent=result.uri;}catch(error){toast(error.message);}}
async function connectedConfirm(){try{connectedSetSession(await connectedRequest('mfa/confirm',{otp:$('connected-otp').value}));render();}catch(error){toast(error.message);}}
const connectedRenderBase=render;
render=()=>{
  if(connectedMfa&&connectedUser?.role==='admin'){
    const page=PAGES.find(p=>p.ID==='A41');
    $('app').innerHTML=authPublicShell(heading('Secure your administrator account','Add the secret to your authenticator, then enter its current code.')+card('Authenticator setup',field('connected-password','Current password','','password')+button('Generate authenticator secret','connectedEnroll()')+'<p id="connected-secret"></p><p id="connected-uri"></p>'+field('connected-otp','Authenticator code','','text')+button('Confirm authenticator','connectedConfirm()')),page);return;
  }
  connectedRenderBase();
};
