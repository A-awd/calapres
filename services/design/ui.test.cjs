const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('sections/design-service.liquid','utf8');
const script=source.split('{% javascript %}')[1].split('{% endjavascript %}')[0];
let html=source.split('{% stylesheet %}')[0].replace(/{% form[^%]*%}/,'<form>').replace('{% endform %}','</form>').replace(/data-endpoint="[^"]*"/,'data-endpoint="/apps/design"').replace(/{{ (?:upload|base)_variant.available }}/g,'true').replace(/{{ upload_variant.id }}/g,'upload-id').replace(/{{ base_variant.id }}/g,'base-id').replace(/{%[\s\S]*?%}/g,'').replace(/{{[\s\S]*?}}/g,'');
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.AbortController=AbortController;
let designs=[],calls=0;w.fetch=async(url,options)=>{if(url.endsWith('/generate')){calls++;for(let n=0;n<3;n++)designs.push({id:'d'+designs.length,name:'عبدالرحمن',url:'https://example.test/images/'+designs.length+'.png',ordinal:designs.length+1,receipt:'receipt',version:'v1'});}return {ok:true,json:async()=>({token:'session',remaining:9-calls*3,designs,lastName:'عبدالرحمن'})};};
w.eval(script);
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await settle();const radio=d.querySelector('[data-mode=generate]');radio.checked=true;radio.dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelector('[data-variant]').value,'base-id');
 for(let i=1;i<=3;i++){d.querySelector('[data-generate]').click();await settle();assert.equal(d.querySelectorAll('[data-gallery] button').length,i*3);}
 assert.equal(d.querySelector('[data-generate]').disabled,true);
 d.querySelector('[data-gallery] button').click();
 assert.equal(d.querySelector('[data-design-id]').value,'d0');
 const approval=d.querySelector('[data-approval]');approval.checked=true;approval.dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelector('[type=submit]').disabled,false);
 d.querySelectorAll('[data-gallery] button')[8].click();assert.equal(approval.checked,false);
 assert.equal(d.querySelector('[type=submit]').disabled,true);
 d.querySelector('[data-name]').value='سارة';d.querySelector('[data-name]').dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('[data-design-id]').value,'');
 assert.equal(calls,3);console.log('PASS: accumulated 3/6/9 gallery, select first after ninth, approval reset, name reset, cap disables generation');
 w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
