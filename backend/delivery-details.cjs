const {HttpError}=require('./security.cjs');
function deliveryDetails(store,user,id){const order=store.byId(id);if(!store.allowed(user,order,true)||order.revoked)throw new HttpError(404,'Delivery details not found or no longer assigned');const input=order.address||{},address={};for(const key of ['name','phone','whatsapp','contactPreference','state','town','street','landmark','postcode','deliveryInstructions'])address[key]=typeof input[key]==='string'?input[key]:'';if(input.position&&input.locationConfirmed===true){try{address.position=require('./customer-location.cjs').position(input.position);address.locationConfirmed=true;}catch{}}
 const query=[address.street,address.landmark,address.town,address.state,'Nigeria'].filter(Boolean).join(', '),mapUrls={address:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query)};
 if(address.position)mapUrls.pin='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address.position.latitude+','+address.position.longitude);
 return {orderId:order.id,address,mapUrls,deliveryMethod:address.position?'address-with-optional-pin':'manual-address'};
}
module.exports={deliveryDetails};
