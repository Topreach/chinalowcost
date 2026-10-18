export function validateApiOrigin(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.port)throw Error('Mobile backend must be an HTTPS origin without credentials, paths or a custom port.');
 return url.origin;
}
export function publicMedia(value,origin){
 if(Array.isArray(value))return value.map(item=>publicMedia(item,origin));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='url'&&typeof item==='string'&&item.startsWith('/api/storefront/')?origin+item:publicMedia(item,origin)]));
 return value;
}
export function bytesBase64(bytes){let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(raw);}
export function createNativeFetch({origin,request}){
 origin=validateApiOrigin(origin);
 return async(input,options={})=>{
  const url=new URL(String(input),origin);
  if(url.origin!==origin||!url.pathname.startsWith('/api/')||url.username||url.password||url.hash)throw Error('Mobile requests are restricted to the configured application API.');
  const method=options.method||'GET';if(!['GET','POST'].includes(method))throw Error('Unsupported API method');
  const headers={Origin:origin,Accept:'application/json'};
  for(const [key,value]of new Headers(options.headers||{}))if(['content-type','x-csrf-token'].includes(key.toLowerCase()))headers[key]=value;
  let data=options.body,dataType;
  if(data instanceof ArrayBuffer||ArrayBuffer.isView(data)){
   const bytes=data instanceof ArrayBuffer?new Uint8Array(data):new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
   if(bytes.length>5242880)throw Error('Uploads must be under 5 MB');data=bytesBase64(bytes);dataType='file';
  }else if(data!==undefined&&typeof data!=='string')throw Error('Unsupported mobile request body');
  const binary=/^\/api\/(catalog\/(media|video)|files)\//.test(url.pathname);
  const response=await request({url:url.href,method,headers,...(data!==undefined?{data}:{}),...(dataType?{dataType}:{}),connectTimeout:15000,readTimeout:90000,disableRedirects:true,responseType:binary?'arraybuffer':'json'});
  if(response.status>=300&&response.status<400)throw Error('Unexpected API redirect');
  const outputHeaders=new Headers();for(const [key,value]of Object.entries(response.headers||{}))if(!['set-cookie','set-cookie2'].includes(key.toLowerCase()))outputHeaders.set(key,String(value));
  let body;
  if(binary&&!outputHeaders.get('content-type')?.includes('json')&&typeof response.data==='string')body=Uint8Array.from(atob(response.data),character=>character.charCodeAt(0));
  else {let value=response.data;if(typeof value==='string'){try{value=JSON.parse(value);}catch{if(response.status<400)throw Error('The application server returned an unexpected response.');value={error:response.status===503?'The application is being updated. Please try again shortly.':'The server could not complete this request.'};}}body=JSON.stringify(publicMedia(value,origin));outputHeaders.set('content-type','application/json');}
  return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,headers:outputHeaders});
 };
}
