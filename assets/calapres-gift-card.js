/* ============================================================
   Calapres — printed greeting card add-on (product page only).
   Off by default. Ticking it opens a live preview of the actual card
   in the burner's colourway (back with the message, or the front),
   «إلى» (optional), «رسالتك» (required, up to 150 characters) and
   «من» (optional). Unticking clears everything and removes the card
   from the total. The card is a separate product: calabriz-cart.js
   adds it after the burner through form.calapresCard(), which returns
   exactly what the preview shows. Nothing here changes the burner's
   own variant or properties.
   ============================================================ */
(function(){
"use strict";
var MAX_LINES=5;
function init(root){
  if(root.dataset.ready)return;root.dataset.ready="true";
  var form=root.closest("form");if(!form)return;
  var q=function(s){return root.querySelector(s)};
  var on=q("[data-gc-on]"),body=q("[data-gc-body]"),flip=q("[data-gc-flip]"),count=q("[data-gc-count]");
  var inTo=q('[data-gc-in="to"]'),inMsg=q('[data-gc-in="msg"]'),inFrom=q('[data-gc-in="from"]');
  var outTo=q('[data-gc-out="to"]'),outMsg=q('[data-gc-out="msg"]'),outFrom=q('[data-gc-out="from"]');
  var toBlock=q("[data-gc-to-block]"),fromBlock=q("[data-gc-from-block]");
  var sides=Array.prototype.slice.call(root.querySelectorAll("[data-gc-side]"));
  var price=Number(root.getAttribute("data-gc-price"))||0,fontsLoaded=false;

  /* The card's Arabic face (Amiri) is fetched only when the card is first opened. */
  function loadFont(){
    if(fontsLoaded)return;fontsLoaded=true;
    var l=document.createElement("link");l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap";document.head.appendChild(l);
  }
  function side(front){
    flip.classList.toggle("is-front",front);
    sides.forEach(function(b){b.setAttribute("aria-pressed",String((b.getAttribute("data-gc-side")==="front")===front))});
  }
  /* At most five lines, so the message always fits the printed area. */
  function limitLines(){
    var parts=inMsg.value.split("\n");
    if(parts.length>MAX_LINES){var pos=inMsg.selectionStart;inMsg.value=parts.slice(0,MAX_LINES-1).join("\n")+"\n"+parts.slice(MAX_LINES-1).join(" ");try{inMsg.setSelectionRange(pos,pos)}catch(e){}}
  }
  function validity(){
    inMsg.setCustomValidity(on.checked&&!inMsg.value.trim()?"اكتب رسالة الكرت.":"");
  }
  /* The preview shows the text exactly as typed; the browser shapes and wraps the Arabic as in print. */
  function render(){
    outTo.textContent=inTo.value;toBlock.hidden=!inTo.value.trim();
    outFrom.textContent=inFrom.value;fromBlock.hidden=!inFrom.value.trim();
    if(inMsg.value.trim()){outMsg.textContent=inMsg.value;outMsg.classList.remove("is-hint")}
    else{outMsg.textContent="رسالتك تظهر هنا";outMsg.classList.add("is-hint")}
    count.textContent=inMsg.value.length+" / 150";
    validity();
  }
  /* The Add to Cart total always includes the card while it is ticked. */
  function total(){
    form.setAttribute("data-addon-cents",on.checked?String(price):"0");
    if(typeof form.calapresShowPrice==="function")form.calapresShowPrice();
  }
  on.addEventListener("change",function(){
    body.hidden=!on.checked;body.disabled=!on.checked;
    if(on.checked)loadFont();
    else{inTo.value="";inMsg.value="";inFrom.value="";side(false)}
    render();total();
  });
  [inTo,inMsg,inFrom].forEach(function(el){el.addEventListener("input",function(){if(el===inMsg)limitLines();side(false);render()})});
  flip.addEventListener("click",function(){side(!flip.classList.contains("is-front"))});
  sides.forEach(function(b){b.addEventListener("click",function(){side(b.getAttribute("data-gc-side")==="front")})});

  /* What calabriz-cart.js adds after the burner: null when the card is not chosen. */
  form.calapresCard=function(){
    if(!on.checked||!inMsg.value.trim())return null;
    var p={};
    if(inTo.value.trim())p["إلى"]=inTo.value;
    p["رسالتك"]=inMsg.value;
    if(inFrom.value.trim())p["من"]=inFrom.value;
    p["_لون الكرت"]=root.getAttribute("data-gc-colour")||"";
    p["_مع المبخرة"]=root.getAttribute("data-gc-burner")||"";
    return {id:Number(root.getAttribute("data-gc-variant")),quantity:1,properties:p};
  };
  body.hidden=!on.checked;body.disabled=!on.checked;
  render();total();
}
function boot(){document.querySelectorAll("[data-gc]").forEach(init)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();