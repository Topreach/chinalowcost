const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('sandbox form clicks and Enter invoke JS submission once and respect validation',()=>{
 const listeners={},source=fs.readFileSync(path.join(__dirname,'../../outputs/server-accounts.js'),'utf8').split('let connectedUser=')[0];
 const context=vm.createContext({document:{addEventListener:(name,fn)=>listeners[name]=fn},Event:class{constructor(type,options){this.type=type;Object.assign(this,options);}}});vm.runInContext(source,context);
 let submitted=0,prevented=0,valid=true;const form={hasAttribute:()=>true,reportValidity:()=>valid,dispatchEvent:e=>{assert.equal(e.type,'submit');submitted++;}},control={form,type:'submit',disabled:false};
 listeners.click({target:{closest:()=>control},preventDefault:()=>prevented++});assert.equal(submitted,1);assert.equal(prevented,1);
 valid=false;listeners.click({target:{closest:()=>control},preventDefault(){}});assert.equal(submitted,1);
 valid=true;listeners.keydown({key:'Enter',target:{matches:()=>true,type:'password',form},preventDefault(){}});assert.equal(submitted,2);
 control.type='button';listeners.click({target:{closest:()=>control},preventDefault(){throw Error('Non-submit button blocked');}});assert.equal(submitted,2);
});
