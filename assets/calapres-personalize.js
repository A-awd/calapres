/* ============================================================
   Calapres — compact personalization selector (decisions 0049, 0050).
   «بدون» is selected by default and shows nothing. Choosing صورة, نص
   or عبارة enables only that method's fieldset (so only its fields are
   submitted and validated) and switches the form to the personalized
   variant. Going back to «بدون» clears what was entered and returns to
   the plain variant. Prices shown are always the price of the variant
   the form will submit.
   One required confirmation sits directly before Add to Cart; its
   wording follows the chosen path and the exact sentence shown is
   what the order stores. Any change to the inputs unticks it.
   Submission itself stays in the theme's calabriz-cart.js.
   ============================================================ */
(function(){
"use strict";
function money(cents){
  cents=Math.round(Number(cents)||0);
  var whole=Math.floor(cents/100),frac=cents%100;
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g,",")+(frac?"."+(frac<10?"0":"")+frac:"")+" ر.س";
}
window.CALAPRES_MONEY=money;
/* The engraving text is sent exactly as typed and never rewritten. Anything beyond Arabic or
   Latin letters, digits, spaces and common punctuation (symbols, emoji, diacritics, other
   scripts) only marks the order for a check before engraving; it is never refused or replaced. */
var ORDINARY=/^[ء-ي٠-٩۰-۹A-Za-z0-9\s.,\-\/&'"():،؛؟!]*$/;
function reviewReasons(text,desc){
  var reasons=[];
  if(!ORDINARY.test(text))reasons.push("رموز أو حروف خاصة");
  if(desc.trim())reasons.push("يوجد شرح");
  return reasons.length?"تحقق قبل الحفر: "+reasons.join("، "):"";
}

function init(form){
  var root=form.querySelector("[data-cp]");if(!root||root.dataset.ready)return;root.dataset.ready="true";
  var variant=form.querySelector("[data-cp-variant]"),status=form.querySelector("[data-product-status]");
  var submit=form.querySelector('[type="submit"]');
  var file=root.querySelector("[data-cp-file]"),fileName=root.querySelector("[data-cp-file-name]");
  var thumb=root.querySelector("[data-cp-thumb]"),thumbImg=root.querySelector("[data-cp-thumb-img]"),thumbName=root.querySelector("[data-cp-thumb-name]"),remove=root.querySelector("[data-cp-remove]");
  var text=root.querySelector("[data-cp-text]"),desc=root.querySelector("[data-cp-desc]"),flag=root.querySelector("[data-cp-flag]");
  var consent=root.querySelector("[data-cp-consent]"),ack=root.querySelector("[data-cp-ack]"),ackText=root.querySelector("[data-cp-ack-text]");
  var occasion=root.querySelector("[data-cp-occasion]");
  var choices=Array.prototype.slice.call(root.querySelectorAll("[data-cp-choice]"));
  var panels=Array.prototype.slice.call(root.querySelectorAll("[data-cp-panel]"));
  var active="",objectUrl="";
  var d=variant.dataset;

  function role(){return active&&d.custom?"custom":"plain"}
  function showPrice(){
    var r=role(),price=Number(d[r+"Price"]),compare=Number(d[r+"Compare"])||0,available=d[r+"Available"]==="true";
    variant.value=d[r];
    document.querySelectorAll("[data-product-price]").forEach(function(el){el.textContent=money(price)});
    var compareEl=document.querySelector("[data-product-compare]"),saving=document.querySelector("[data-product-saving]");
    if(compareEl){compareEl.hidden=compare<=price;compareEl.textContent=money(compare)}
    if(saving){saving.hidden=compare<=price;saving.textContent="وفّر "+money(Math.max(0,compare-price))}
    submit.disabled=!available;submit.textContent=available?"أضِف إلى السلّة — "+money(price):"غير متوفر حاليًا";
    document.querySelectorAll("[data-sticky-atc-submit]").forEach(function(el){el.disabled=!available;el.textContent=available?"أضِف إلى السلّة":"غير متوفر"});
  }
  /* The confirmation covers exactly what was entered, so any change asks for it again. */
  function resetAck(){ack.checked=false}
  function showConsent(){
    var wording=active?consent.getAttribute("data-ack-"+active)||"":"";
    consent.hidden=!active;consent.disabled=!active;ack.value=wording;ackText.textContent=wording;resetAck();
  }
  /* «بدون» (value "none") means no personalization: nothing is shown and nothing is kept. */
  function clearInputs(){
    text.value="";desc.value="";
    clearFile();file.value="";file.setCustomValidity("");
    root.querySelectorAll("[data-cp-phrase]").forEach(function(r){r.checked=false});
    occasion.value="";
    update();
  }
  function setChoice(next){
    active=next&&next!=="none"?next:"";
    if(!active)clearInputs();
    choices.forEach(function(c){
      var on=c.value===(active||"none");
      c.checked=on;c.closest("label").classList.toggle("is-on",on);
    });
    panels.forEach(function(p){var on=p.getAttribute("data-cp-panel")===active;p.hidden=!on;p.disabled=!on});
    showConsent();
    if(status)status.textContent="";
    showPrice();
  }
  choices.forEach(function(c){
    c.addEventListener("change",function(){if(c.checked)setChoice(c.value)});
  });

  function clearFile(){
    if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl="";
    thumb.hidden=true;thumbImg.removeAttribute("src");thumbName.textContent="";fileName.value="";
  }
  file.addEventListener("change",function(){
    clearFile();file.setCustomValidity("");resetAck();
    var f=file.files&&file.files[0];if(!f)return;
    if(["image/jpeg","image/png"].indexOf(f.type)===-1||!f.size||f.size>5*1024*1024){
      file.value="";file.setCustomValidity("اختر صورة JPG أو PNG حتى 5 ميجابايت.");file.reportValidity();return;
    }
    objectUrl=URL.createObjectURL(f);thumbImg.src=objectUrl;thumbName.textContent=f.name;fileName.value=f.name;thumb.hidden=false;
  });
  /* A file that is not a readable image is refused before it reaches the cart. */
  thumbImg.addEventListener("error",function(){if(thumbImg.getAttribute("src"))file.setCustomValidity("تعذر قراءة الصورة. اختر صورة JPG أو PNG سليمة.")});
  thumbImg.addEventListener("load",function(){file.setCustomValidity("")});
  /* Removing the image leaves the method open so another image can be chosen. */
  remove.addEventListener("click",function(){clearFile();file.value="";file.setCustomValidity("");resetAck();file.focus()});

  function update(){
    text.setCustomValidity(text.value.trim()?"":"اكتب النص المطلوب حفره.");
    flag.value=reviewReasons(text.value,desc.value);
  }
  text.addEventListener("input",function(){update();resetAck()});
  desc.addEventListener("input",function(){update();resetAck()});
  update();

  /* The chosen phrase's category is kept on the order as the occasion. */
  root.querySelectorAll("[data-cp-phrase]").forEach(function(r){
    r.addEventListener("change",function(){if(r.checked){occasion.value=r.getAttribute("data-category")||"";resetAck()}});
  });

  setChoice("none");
}

function boot(){document.querySelectorAll("[data-product-form]").forEach(init)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();