const {HttpError}=require('./security.cjs');
function position(value,fresh=false){if(!value||![value.latitude,value.longitude,value.accuracy,value.capturedAt].every(v=>typeof v==='number'&&Number.isFinite(v))||Math.abs(value.latitude)>90||Math.abs(value.longitude)>180||value.accuracy<0||value.accuracy>10000||value.capturedAt<1||value.capturedAt>Date.now()+60000||fresh&&value.capturedAt<Date.now()-120000)throw new HttpError(400,'Invalid or stale delivery location');return {latitude:Math.round(value.latitude*1e6)/1e6,longitude:Math.round(value.longitude*1e6)/1e6,accuracy:Math.round(value.accuracy),capturedAt:value.capturedAt};}
async function locate(google,request,body){
 if(body.consent!==true)throw new HttpError(400,'Location permission and consent are required');const pin=position(body.position,true),result={position:pin,address:null,status:'coordinates-only'};
 if(body.useGoogle!==true)return result;
 const settings=google.current();if(!settings.mapsKey)return {...result,status:'maps-not-configured'};
 try{
  const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');url.searchParams.set('latlng',pin.latitude+','+pin.longitude);url.searchParams.set('key',google.auth.decrypt(settings.mapsKey));url.searchParams.set('language','en');
  const response=await request(url.href,{signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw Error();const data=await response.json();if(data.status!=='OK'||!Array.isArray(data.results))throw Error();
  const entry=data.results.find(item=>item.address_components?.some(c=>c.types?.includes('country')&&c.short_name==='NG'));if(!entry)return {...result,status:'outside-nigeria'};
  const component=type=>String(entry.address_components.find(c=>c.types?.includes(type))?.long_name||'').slice(0,200);
  result.address={state:component('administrative_area_level_1'),town:component('locality')||component('sublocality_level_1')||component('administrative_area_level_2'),street:[component('street_number'),component('route')].filter(Boolean).join(' ').slice(0,500),postcode:component('postal_code').slice(0,20)};result.status='suggestion';return result;
 }catch{return {...result,status:'lookup-unavailable'};}
}
module.exports={position,locate};
