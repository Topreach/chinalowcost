/* Previous-page navigation within the local prototype. Direct links fall back to the app home. */
let navigationSequence=0;
const navigationEntries=[];
let navigationCursor=0;
const navigationShell=shell;
function currentNavigationRoute(){return location.hash.slice(1)||'C02';}
function stampNavigationEntry(){const entry={key:'clc-'+Date.now()+'-'+(++navigationSequence),route:currentNavigationRoute()};try{if(typeof history!=='undefined')history.replaceState({...history.state,clcNavigationKey:entry.key},'');}catch{}return entry;}
navigationEntries.push(stampNavigationEntry());
function navigationHome(){const page=PAGES.find(p=>p.ID===currentNavigationRoute());return page?.Application==='Worker'?'W02':page?.Application==='Admin'?'A01':'C02';}
function goBack(){if(navigationCursor>0&&typeof history!=='undefined'){history.back();return;}const home=navigationHome();if(currentNavigationRoute()!==home)go(home);}
function trackNavigation(){const next=currentNavigationRoute();let key;try{key=typeof history!=='undefined'?history.state?.clcNavigationKey:null;}catch{}const existing=navigationEntries.findIndex(entry=>entry.key===key&&entry.route===next);if(existing>=0)navigationCursor=existing;else{navigationEntries.splice(navigationCursor+1);navigationEntries.push(stampNavigationEntry());navigationCursor=navigationEntries.length-1;}render();$('page-title')?.focus({preventScroll:true});}
shell=(content,page)=>{const disabled=navigationCursor===0&&currentNavigationRoute()===navigationHome();const control=`<div class="back-row"><button type="button" class="secondary back-button" onclick="goBack()" aria-label="Back to previous page" ${disabled?'disabled':''}><span aria-hidden="true">←</span> Back</button></div>`;return navigationShell(content,page).replace('<div class="crumb">',control+'<div class="crumb">');};
window.addEventListener('hashchange',trackNavigation);
// Operations performs the initial render after all application views are ready.
