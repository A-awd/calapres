/* ============================================================
   كالابريز — shared UI (all pages)
   Guarded logic only: toast, mobile nav, accordions, form
   feedback. Cart logic lives in calabriz-cart.js (Shopify
   AJAX Cart API).
   ============================================================ */
(function(){
"use strict";
var AR="٠١٢٣٤٥٦٧٨٩";
function ar(n){return String(n).replace(/[0-9]/g,function(d){return AR[+d]})}
function fmt(n){return ar(String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"٬"))+" ر.س"}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
window.CALABRIZ={ar:ar,fmt:fmt,esc:esc};

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
