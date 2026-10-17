const fs=require('node:fs');
const path=require('node:path');
const out=path.resolve('outputs');
const original=fs.readFileSync(path.join(out,'Screen-Blueprint.html'),'utf8');
const start=original.indexOf('<script>const PAGES=');
const pages=original.slice(start).match(/^<script>const PAGES=[\s\S]*?<\/script>/)?.[0];
if(start<0||!pages)throw Error('Original page registry not found');
let bundle=['prototype.js','commerce.js','catalog.js','navigation.js','operations.js','accounts.js'].map(file=>fs.readFileSync(path.join(out,file),'utf8')).join('\n');
if(!bundle.includes('const authReady=authInitialize();'))throw Error('Account bootstrap not found');
bundle=bundle.replace('const authReady=authInitialize();','const authReady=Promise.resolve();');
// Omit the demo banner text in the application; retain the standalone design preview.
const previewLabel='INTERACTIVE PROTOTYPE &nbsp; · &nbsp; Sample data only <span class="hide-mobile">· No live transactions</span>';
if(!bundle.includes(previewLabel))throw Error('Prototype banner label not found');
bundle=bundle.replace(previewLabel,'');
// Retain the customer/worker/admin selector, without prototype inspection controls.
bundle=bundle.replace(/^const preview=.*$/m,'const preview=`<div class="top-preview"><span></span><div class="preview-controls">${roleSelect}</div></div>`;');
// The live build never persists authority or customer records in browser storage.
bundle=bundle.replace(/const persist=\(\)=>\{[^\n]+/,'const persist=()=>{};');
bundle=bundle.replace(/const record=\(action\)=>\{[^\n]+/,'const record=()=>connectedUnsupported();');
// Demo templates assumed trusted sample strings. Escape database text without changing layout.
bundle=bundle.replace("state.selected='${p.id}';state.draft.title='${p.name}';state.draft.sku='${p.id}';persist();go('W06')","opsNewDraft('${p.id}',true)");
bundle=bundle.replaceAll('${p.name}','${esc(p.name)}');
bundle=bundle.replace('onclick="${action}"','onclick="${esc(action)}"');
bundle=bundle.replace('${title}</h1>','${connectedText(title)}</h1>').replace('${desc}</p>','${connectedText(desc)}</p>');
const adapter=['server-accounts.js','server-business.js','server-ai.js','server-google.js','server-growth.js','server-payments.js','server-profile.js','server-wallet.js','server-fulfillment.js','server-whatsapp.js','server-notifications.js','server-enterprise.js'].map(file=>fs.readFileSync(path.join(out,file),'utf8')).join('\n');
const widgetStyles=fs.readFileSync(path.join(out,'chat-widget.css'),'utf8');
const html=original.slice(0,start).replace('</head>','<style id="chat-widget-styles">'+widgetStyles+'</style></head>')+pages+'<script>'+bundle+'\n'+adapter+'</script></body></html>';
fs.writeFileSync(path.join(out,'Connected-Storefront.html'),html);
console.log('Built original interface with server authentication at /application.');
