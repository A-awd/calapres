/* ============================================================
   كالابريز — shared UI (all pages)
   Guarded logic only: toast, mobile nav, accordions, form
   feedback. Cart logic lives in calabriz-cart.js (Shopify
   AJAX Cart API).
   ============================================================ */
(function(){
"use strict";
var DECIMAL_DIGIT;
try{DECIMAL_DIGIT=new RegExp("^\\p{Decimal_Number}$","u")}catch(error){DECIMAL_DIGIT=null}
var DIGIT_CACHE={};
function digits(value){
  var input=String(value),output="",index=0;
  while(index<input.length){
    var code=input.codePointAt(index),character=String.fromCodePoint(code);
    if(code>=48&&code<=57)output+=character;
    else if(Object.prototype.hasOwnProperty.call(DIGIT_CACHE,code))output+=DIGIT_CACHE[code];
    else if(DECIMAL_DIGIT&&DECIMAL_DIGIT.test(character)){
      var start=code;
      while(start>0&&DECIMAL_DIGIT.test(String.fromCodePoint(start-1)))start--;
      DIGIT_CACHE[code]=String((code-start)%10);
      output+=DIGIT_CACHE[code];
    }else output+=character;
    index+=character.length;
  }
  return output;
}
function fmt(n){return digits(n).replace(/\B(?=(\d{3})+(?!\d))/g,",")+" ر.س"}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
window.CALABRIZ={digits:digits,ar:digits,fmt:fmt,esc:esc};

/* Keep every storefront-authored numeral in Western 0-9 form, including
   content injected later by the cart and storefront apps. Form values,
   URLs, IDs, data attributes, scripts, and customer-authored content marked
   with data-preserve-digits are deliberately left untouched. */
var DIGIT_ATTRIBUTES=["aria-label","aria-valuetext","title","placeholder","alt"];
var DIGIT_SKIP={SCRIPT:true,STYLE:true,NOSCRIPT:true,TEXTAREA:true,TEMPLATE:true};

function preservesDigits(element){
  return !element||DIGIT_SKIP[element.tagName]||Boolean(element.closest("[data-preserve-digits],[contenteditable]:not([contenteditable='false'])"));
}

function normalizeTextNode(node){
  var parent=node.parentElement;
  if(preservesDigits(parent))return;
  var normalized=digits(node.nodeValue);
  if(normalized!==node.nodeValue)node.nodeValue=normalized;
}

function normalizeAttributes(element){
  if(preservesDigits(element))return;
  DIGIT_ATTRIBUTES.forEach(function(name){
    if(!element.hasAttribute(name))return;
    var value=element.getAttribute(name);
    var normalized=digits(value);
    if(normalized!==value)element.setAttribute(name,normalized);
  });
}

function normalizeDigitSubtree(root){
  if(!root)return;
  if(root.nodeType===3){normalizeTextNode(root);return;}
  if(root.nodeType!==1&&root.nodeType!==11)return;
  if(root.nodeType===1){
    if(preservesDigits(root))return;
    normalizeAttributes(root);
  }
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  var node;
  while((node=walker.nextNode())){
    if(node.nodeType===3)normalizeTextNode(node);
    else normalizeAttributes(node);
  }
}

function startDigitNormalizer(){
  if(!document.body)return;
  normalizeDigitSubtree(document.body);
  if(!window.MutationObserver)return;
  var pending=[],scheduled=false;
  function flush(){
    scheduled=false;
    var records=pending;
    pending=[];
    var roots=[],texts=[],attributes=[];
    records.forEach(function(record){
      if(record.type==="characterData")texts.push(record.target);
      else if(record.type==="attributes")attributes.push(record.target);
      else record.addedNodes.forEach(function(node){roots.push(node)});
    });
    var rootSet=new Set(roots),seenRoots=new Set();
    roots=roots.filter(function(root){
      if(seenRoots.has(root))return false;
      seenRoots.add(root);
      var parent=root.parentNode;
      while(parent){
        if(rootSet.has(parent))return false;
        parent=parent.parentNode;
      }
      return true;
    });
    roots.forEach(normalizeDigitSubtree);
    function hasQueuedRoot(node){
      var parent=node;
      while(parent){
        if(rootSet.has(parent))return true;
        parent=parent.parentNode;
      }
      return false;
    }
    var seenTexts=new Set();
    texts.forEach(function(node){
      if(seenTexts.has(node))return;
      seenTexts.add(node);
      if(!hasQueuedRoot(node))normalizeTextNode(node);
    });
    var seenAttributes=new Set();
    attributes.forEach(function(element){
      if(seenAttributes.has(element))return;
      seenAttributes.add(element);
      if(!hasQueuedRoot(element))normalizeAttributes(element);
    });
  }
  new MutationObserver(function(records){
    pending=pending.concat(records);
    if(scheduled)return;
    scheduled=true;
    if(window.queueMicrotask)window.queueMicrotask(flush);
    else Promise.resolve().then(flush);
  }).observe(document.body,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:DIGIT_ATTRIBUTES
  });
}

startDigitNormalizer();

var toastT;
function toast(msg){
  var t=document.getElementById("toast");if(!t)return;
  t.textContent=msg;t.classList.add("show");
  clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove("show")},2800);
}
window.toast=toast;

/* mobile nav */
document.addEventListener("click",function(e){
  var t=e.target;
  var mo=t.closest("#menuOpen");
  if(mo){var nav=document.getElementById("mnav");if(nav){var open=nav.classList.toggle("open");mo.setAttribute("aria-expanded",open?"true":"false");}}
  if(t.closest(".mnav a"))document.getElementById("mnav").classList.remove("open");
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){var m=document.getElementById("mnav");if(m)m.classList.remove("open")}
});
})();


/* ============================================================
   Mobile sticky add-to-cart (appears only after the primary
   product button has scrolled above the viewport)
   ============================================================ */
(function(){
"use strict";
document.addEventListener("DOMContentLoaded",function(){
  var bar=document.querySelector("[data-sticky-atc]");
  var submit=document.querySelector("[data-sticky-atc-submit]");
  var primary=document.getElementById("pdAdd");
  if(!bar||!submit||!primary)return;

  function sync(){
    var mobile=window.matchMedia("(max-width: 860px)").matches;
    var primaryRect=primary.getBoundingClientRect();
    /* Keep the purchase action available through the footer. On short mobile
       product pages the footer enters the viewport before the primary button
       has fully scrolled away, which otherwise prevents the bar appearing. */
    var show=mobile&&primaryRect.bottom<0&&!primary.disabled;
    bar.classList.toggle("is-visible",show);
    bar.setAttribute("aria-hidden",show?"false":"true");
  }

  submit.addEventListener("click",function(){primary.click()});
  window.addEventListener("scroll",sync,{passive:true});
  window.addEventListener("resize",sync);
  sync();
});
})();


/* ============================================================
   Form feedback (guarded — real Shopify forms now submit
   natively; toasts fire from the redirect/result state)
   ============================================================ */
(function(){
"use strict";
document.addEventListener("DOMContentLoaded",function(){
  /* server-rendered success/error message (contact form) */
  var m=document.querySelector("[data-toast-message]");
  if(m){toast(m.getAttribute("data-toast-message"))}
  /* newsletter / notify redirects */
  var q=new URLSearchParams(location.search);
  var msg=null;
  if(q.get("subscribed")==="1"||q.get("customer_posted")==="true")msg="تمّ تسجيل بريدك بنجاح";
  if(q.get("notified")==="1")msg="سنُعلمك فورَ الإطلاق";
  if(msg){
    toast(msg);
    ["subscribed","notified","customer_posted","contact_posted"].forEach(function(k){q.delete(k)});
    var qs=q.toString();
    try{history.replaceState(null,"",location.pathname+(qs?"?"+qs:"")+location.hash)}catch(e){}
  }
});
})();


/* ============================================================
   FAQ accordion (runs only where .faq-item exists)
   ============================================================ */
(function(){
"use strict";
var items=document.querySelectorAll(".faq-item");
if(!items.length)return;
items.forEach(function(item){
  var btn=item.querySelector(".faq-q");
  btn.addEventListener("click",function(){
    var isOpen=item.classList.contains("open");
    items.forEach(function(it){
      it.classList.remove("open");
      it.querySelector(".faq-q").setAttribute("aria-expanded","false");
    });
    if(!isOpen){
      item.classList.add("open");
      btn.setAttribute("aria-expanded","true");
    }
  });
});
})();


/* ============================================================
   Product page accordion (runs only where #acc exists)
   ============================================================ */
(function(){
"use strict";
var acc=document.getElementById("acc");
if(!acc)return;
acc.addEventListener("click",function(e){
  var q=e.target.closest(".acc-q");
  if(!q)return;
  var item=q.parentElement,a=item.querySelector(".acc-a"),open=item.classList.contains("open");
  document.querySelectorAll(".acc-item.open").forEach(function(it){
    it.classList.remove("open");
    it.querySelector(".acc-a").style.maxHeight="0px";
    it.querySelector(".acc-q").setAttribute("aria-expanded","false");
  });
  if(!open){
    item.classList.add("open");
    a.style.maxHeight=a.scrollHeight+"px";
    q.setAttribute("aria-expanded","true");
  }
});
})();
