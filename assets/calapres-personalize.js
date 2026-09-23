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
   The optional printed gift card (decision 0051) is independent of
   personalization: its price is added to the button total, and
   form._calapresGift() hands its own cart line to calabriz-cart.js.
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

/* Price of the gift card when it is ticked, else 0. */
function giftExtra(form){
  var gc=form.querySelector("[data-gc]"),toggle=gc&&gc.querySelector("[data-gc-toggle]");
  return toggle&&toggle.checked?Number(gc.getAttribute("data-gc-price"))||0:0;
}
/* Button and sticky bar show what the cart will charge: burner variant + card. The product
   price near the title keeps showing the burner alone. */
function showTotal(form,price,available){
  var submit=form.querySelector('[type="submit"]'),total=price+giftExtra(form);
  submit.disabled=!available;submit.textContent=available?"أضِف إلى السلّة — "+money(total):"غير متوفر حاليًا";
  document.querySelectorAll(".pd-sticky-atc [data-product-price]").forEach(function(el){el.textContent=money(total)});
}

function initGift(form){
  var gc=form.querySelector("[data-gc]");if(!gc||gc.dataset.ready)return;gc.dataset.ready="true";
  var toggle=gc.querySelector("[data-gc-toggle]"),fields=gc.querySelector("[data-gc-fields]");
  var to=gc.querySelector("[data-gc-to]"),msg=gc.querySelector("[data-gc-msg]"),from=gc.querySelector("[data-gc-from]"),count=gc.querySelector("[data-gc-count]");
  var variant=form.querySelector("[data-cp-variant]");
  function refresh(){
    if(typeof form._cpRefresh==="function")return form._cpRefresh();
    var d=variant.dataset;showTotal(form,Number(d.plainPrice),d.plainAvailable==="true");
  }
  function validate(){
    msg.setCustomValidity(msg.value.trim()?"":"اكتب رسالة الكرت.");
    count.textContent=msg.value.length+" / 150";
  }
  toggle.addEventListener("change",function(){
    fields.hidden=!toggle.checked;fields.disabled=!toggle.checked;refresh();
  });
  msg.addEventListener("input",validate);
  validate();
  /* The message is printed exactly as typed; only empty optional fields are left out. */
  form._calapresGift=function(){
    if(!toggle.checked)return null;
    var p={"لون الكرت":gc.getAttribute("data-gc-tone"),"للمبخرة":gc.getAttribute("data-gc-for")};
    if(to.value.trim())p["إلى"]=to.value;
    p["رسالتك"]=msg.value;
    if(from.value.trim())p["من"]=from.value;
    return{id:Number(gc.getAttribute("data-gc-variant")),properties:p};
  };
}

function init(form){
  var root=form.querySelector("[data-cp]");if(!root||root.dataset.ready)return;root.dataset.ready="true";
  var variant=form.querySelector("[data-cp-variant]"),status=form.querySelector("[data-product-status]");
  var file=root.querySelector("[data-cp-file]"),fileName=root.querySelector("[data-cp-file-name]");
  var thumb=root.querySelector("[data-cp-thumb]"),thumbImg=root.querySelector("[data-cp-thumb-img]"),thumbName=root.querySelector("[data-cp-thumb-name]"),remove=root.querySelector("[data-cp-remove]");
  var text=root.querySelector("[data-cp-text]"),desc=root.querySelector("[data-cp-desc]"),flag=root.querySelector("[data-cp-flag]");
  var consent=root.querySelector("[data-cp-consent]"),ack=root.querySelector("[data-cp-ack]"),ackText=root.querySelector("[data-cp-ack-text]");
  var occasion=root.querySelector("[data-cp-occasion]");
  var choices=Array.prototype.slice.call(root.querySelectorAll("[data-cp-choice]"));
  var panels=Array.prototype.slice.call(root.querySelectorAll("[data-cp-panel]"));
  var active="",objectUrl="";
  var d=variant.dataset;

  form._cpRefresh=showPrice;
  function role(){return active&&d.custom?"custom":"plain"}
  function showPrice(){
    var r=role(),price=Number(d[r+"Price"]),compare=Number(d[r+"Compare"])||0,available=d[r+"Available"]==="true";
    variant.value=d[r];
    document.querySelectorAll("[data-product-price]").forEach(function(el){el.textContent=money(price)});
    var compareEl=document.querySelector("[data-product-compare]"),saving=document.querySelector("[data-product-saving]");
    if(compareEl){compareEl.hidden=compare<=price;compareEl.textContent=money(compare)}
    if(saving){saving.hidden=compare<=price;saving.textContent="وفّر "+money(Math.max(0,compare-price))}
    showTotal(form,price,available);
    document.querySelectorAll("[data-sticky-atc-submit]").forEach(function(el){el.disabled=!available;el.textContent=available?"أضِف إلى السلّة":"غير متوفر"});
  }
  /* The confirmation covers exactly what was entered, so any change asks for it again. */
  function updateAckValidity(){
    ack.setCustomValidity(ack.checked?"":"يجب الموافقة على الشروط والأحكام.");
  }
  function resetAck(){ack.checked=false;updateAckValidity()}
  ack.addEventListener("change",updateAckValidity);
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

function boot(){document.querySelectorAll("[data-product-form]").forEach(function(form){init(form);initGift(form)})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
