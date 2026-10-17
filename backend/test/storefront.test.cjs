const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function host(responseData){
  const replies=[],requests=[],opened=[],assigned=[],frame={contentWindow:{postMessage:data=>replies.push(data)}};let listener;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/storefront-host.js'),'utf8'),{
    document:{getElementById:()=>frame},location:{hash:'#A38',assign:url=>assigned.push(url)},window:{addEventListener:(kind,callback)=>{if(kind==='message')listener=callback;},open:(...args)=>opened.push(args)},
    fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>responseData?{...responseData}:{user:{id:'admin',role:'admin'},csrf:'private-csrf'}};},
    JSON,Set,Number,Error,URL
  });
  return {frame,replies,requests,opened,assigned,send:(action,extra={})=>listener({source:frame.contentWindow,origin:'null',data:{channel:'clc-server-auth',id:1,action,body:{},...extra}}),listener};
}

test('support email button opens only the server-configured address in an email draft',async()=>{
 const h=host({supportEmail:'support@chinalowcost.com'}),open=source=>h.listener({source,origin:'null',data:{channel:'clc-support-email',email:'attacker@example.test'}});
 await open(h.frame.contentWindow);assert.equal(h.assigned.length,0);await h.send('email-public');await open({});assert.equal(h.assigned.length,0);await open(h.frame.contentWindow);assert.equal(h.assigned[0],'mailto:support%40chinalowcost.com?subject=ChinaLowCost%20support%20request');
});
test('designed UI host authenticates the exact sandbox frame and rejects arbitrary endpoints',async()=>{
  const h=host();assert.equal(h.frame.src,'/application/frame#A38');
  await h.listener({source:{},origin:'null',data:{channel:'clc-server-auth',id:1,action:'login'}});
  await h.listener({source:h.frame.contentWindow,origin:'https://evil.example',data:{channel:'clc-server-auth',id:1,action:'login'}});
  await h.send('../admin/openai');assert.equal(h.requests.length,0);
});
test('AI, encrypted configuration and announcement bridge actions use exact server routes',async()=>{
  const h=host();for(const [action,route,method]of [['ai-chat','/api/ai/chat','POST'],['openai-config','/api/admin/openai','GET'],['openai-save','/api/admin/openai','POST'],['ai-discover','/api/admin/catalog/discover','POST'],['announcement-preview','/api/admin/messages/preview','POST'],['announcement-send','/api/admin/messages/send','POST']]){await h.send(action,{body:{text:'Find a product',language:'yo'}});assert.equal(h.requests.at(-1).url,route);assert.equal(h.requests.at(-1).options.method,method);assert.equal(h.replies.at(-1).data.csrf,undefined);}
});
test('source navigation accepts only HTTPS sources actually returned by the backend',async()=>{
  const h=host({sources:[{url:'https://seller.example/product',title:'Seller'}]});
  const source=url=>h.listener({source:h.frame.contentWindow,origin:'null',data:{channel:'clc-open-source',url}});
  await source('https://unreturned.example/');assert.equal(h.opened.length,0);
  await h.send('ai-chat');await source('javascript:alert(1)');assert.equal(h.opened.length,0);await source('https://seller.example/product');assert.equal(h.opened.length,1);assert.equal(h.opened[0][2],'noopener,noreferrer');
});

test('email bridge exposes only fixed mail routes and validates inbox identifiers',async()=>{
 const h=host();for(const [action,route,method]of [['email-config','/api/admin/email','GET'],['email-public','/api/email/public','GET'],['email-inbox','/api/admin/email/inbox','GET'],['email-save','/api/admin/email','POST'],['email-verify','/api/admin/email/verify','POST'],['email-test','/api/admin/email/test','POST'],['email-sync','/api/admin/email/sync','POST'],['email-reply','/api/admin/email/reply','POST'],['email-status','/api/admin/email/status','POST']]){await h.send(action);assert.equal(h.requests.at(-1).url,route);assert.equal(h.requests.at(-1).options.method,method);}
 await h.send('email-message',{body:{id:7}});assert.equal(h.requests.at(-1).url,'/api/admin/email/message?id=7');const count=h.requests.length;await h.send('email-message',{body:{id:'../../secrets'}});assert.equal(h.requests.length,count);assert.match(h.replies.at(-1).error,/Invalid email/);
});
test('designed UI keeps CSRF in host memory and forwards it on protected account actions',async()=>{
  const h=host();await h.send('me');assert.equal(h.requests[0].options.method,'GET');
  assert.equal(h.replies[0].data.csrf,undefined);
  await h.send('password',{body:{current:'current',password:'replacement'}});
  assert.equal(h.requests[1].options.headers['X-CSRF-Token'],'private-csrf');
  assert.equal(h.requests[1].options.credentials,'same-origin');
  await h.send('logout');assert.equal(h.requests[2].options.headers['X-CSRF-Token'],'');
});
test('connected build disables local account bootstrap and preserves the original design',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../../outputs/Connected-Storefront.html'),'utf8');
  assert(!html.includes('const authReady=authInitialize();'));
  assert(html.includes('const authReady=Promise.resolve();'));
  assert(html.includes('server authentication')||html.includes('Server authentication adapter'));
  assert(html.includes('class="auth-story"'));
  assert(html.includes('connectedHydrate'));assert(!html.includes('Integration preview:'));
});
