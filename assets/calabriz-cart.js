/* ============================================================
   كالابريز — cart (Shopify AJAX Cart API)
   Replaces the static prototype's localStorage cart with
   /cart.js, /cart/add.js and /cart/change.js. All product
   data (titles, prices, images, properties) comes from the
   live cart payload — nothing is hardcoded here.
   ============================================================ */
(function(){
"use strict";
var H=window.CALABRIZ||{};
var digits=H.digits||H.ar||function(value){
  var decimalDigit;
  try{decimalDigit=new RegExp("^\\p{Decimal_Number}$","u")}catch(error){decimalDigit=null}
  var input=String(value),output="",index=0;
  while(index<input.length){
    var code=input.codePointAt(index),character=String.fromCodePoint(code);
    if(code>=48&&code<=57)output+=character;
    else if(decimalDigit&&decimalDigit.test(character)){
      var start=code;
      while(start>0&&decimalDigit.test(String.fromCodePoint(start-1)))start--;
      output+=String((code-start)%10);
    }else output+=character;
    index+=character.length;
  }
  return output;
};
var fmt=H.fmt||function(n){return digits(n).replace(/\B(?=(\d{3})+(?!\d))/g,",")+" ر.س"};
var esc=H.esc||function(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var ENGRAVING_PROP="نص الحفر";

var cart=null,busy=false;

function money(cents){return fmt(Math.round(cents/100))}

function request(url,payload){
  return fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(payload)
  }).then(function(r){
    return r.json().then(function(data){
      if(!r.ok){var e=new Error(data.description||data.message||"cart error");e.data=data;throw e}
      return data;
    });
  });
}

function fetchCart(){
  return fetch("/cart.js",{headers:{Accept:"application/json"}})
    .then(function(r){return r.json()})
    .then(function(c){cart=c;renderBadge();renderCart();return c});
}

function renderBadge(){
  var b=document.getElementById("cartCount");if(!b||!cart)return;
  b.textContent=digits(cart.item_count);
}

/* "مبخرة كالابريز الفاخرة — الأبيض" -> name + color */
function splitTitle(item){
  var name=item.product_title||"",color="";
  if(item.variant_title&&item.variant_title!=="Default Title"&&item.variant_title!=="نص الحفر فقط"&&item.variant_title!=="تصميم مرفق (+10 ر.س)"){
    color=item.variant_title;
  }else{
    var parts=name.split("—");
    if(parts.length>1){color=parts.pop().trim();name=parts.join("—").trim()}
  }
  return{name:name,color:color};
}

function renderCart(){
  var body=document.getElementById("cartBody"),foot=document.getElementById("cartFoot");
  if(!body||!foot||!cart)return;
  var drawer=document.getElementById("drawer");
  var shopUrl=(drawer&&drawer.getAttribute("data-shop-url"))||"/collections/all";
  if(!cart.items.length){
    body.innerHTML='<div class="d-empty"><p>سلّتك فارغة.</p><a class="link-arrow" href="'+esc(shopUrl)+'">تصفّح المتجر <span>←</span></a></div>';
    foot.style.display="none";return;
  }
  var html="";
  cart.items.forEach(function(it,idx){
    var t=splitTitle(it);
    var eng=it.properties&&it.properties[ENGRAVING_PROP];
    html+='<div class="d-item">'+
      (it.image?'<img src="'+esc(it.image)+'" alt="">':'')+
      '<div class="di-info"><h4>'+esc(t.name)+'</h4>'+
      (t.color?'<div class="di-color">اللون: '+esc(t.color)+'</div>':'')+
      (eng?'<div class="di-eng" data-preserve-digits>الحفر: «'+esc(eng)+'»</div>':'')+designDetails(it)+
      '<div class="d-row"><span class="qty">'+
      '<button data-dec="'+idx+'" aria-label="إنقاص">−</button><b>'+digits(it.quantity)+'</b><button data-inc="'+idx+'" aria-label="زيادة">+</button>'+
      '</span><span class="di-price">'+money(it.final_line_price)+'</span></div>'+
      '<button class="di-remove" data-del="'+idx+'">إزالة</button></div></div>';
  });
  body.innerHTML=html;
  foot.style.display="block";
  document.getElementById("cartTotal").textContent=money(cart.total_price);
}

function openCart(){
  var d=document.getElementById("drawer"),s=document.getElementById("scrim");
  if(!d||!s)return;
  d.classList.add("open");s.classList.add("show");document.body.style.overflow="hidden";
  fetchCart();
}
function closeCart(){
  var d=document.getElementById("drawer"),s=document.getElementById("scrim");
  if(!d||!s)return;
  d.classList.remove("open");s.classList.remove("show");document.body.style.overflow="";
}
window.openCart=openCart;window.closeCart=closeCart;

function addToCart(id,properties){
  if(busy)return;busy=true;
  var payload={id:Number(id),quantity:1};
  if(properties&&Object.keys(properties).length)payload.properties=properties;
  request("/cart/add.js",payload)
    .then(function(){return fetchCart()})
    .then(function(){window.toast&&window.toast("أُضيفت إلى سلّتك")})
    .catch(function(e){window.toast&&window.toast(e.message||"تعذّرت الإضافة — حاول مرة أخرى")})
    .then(function(){busy=false});
}
window.addToCart=addToCart;

function changeLine(line,quantity){
  if(busy)return;busy=true;
  request("/cart/change.js",{line:line,quantity:quantity})
    .then(function(c){cart=c;renderBadge();renderCart()})
    .catch(function(e){window.toast&&window.toast(e.message||"تعذّر تحديث السلّة")})
    .then(function(){busy=false});
}

document.addEventListener("click",function(e){
  var t=e.target;
  if(t.closest("#cartOpen")){e.preventDefault();openCart()}
  if(t.closest("#cartClose")||t.id==="scrim")closeCart();
  var add=t.closest("[data-add]");
  if(add){
    e.preventDefault();
    var props={},eng=add.getAttribute("data-eng");
    if(eng)props[ENGRAVING_PROP]=eng;
    addToCart(add.getAttribute("data-add"),props);
  }
  var inc=t.closest("[data-inc]"),dec=t.closest("[data-dec]"),del=t.closest("[data-del]");
  if((inc||dec||del)&&cart){
    var i=+(inc||dec||del).getAttribute(inc?"data-inc":dec?"data-dec":"data-del");
    var line=i+1,q=cart.items[i]?cart.items[i].quantity:0;
    if(inc)changeLine(line,q+1);
    if(dec)changeLine(line,q-1);
    if(del)changeLine(line,0);
  }
  if(t.closest("#checkoutBtn"))window.location.href="/checkout";
});

/* Cancel native submission before Shopify's form listener runs. The successful
   Ajax cart request remains the sole source of product_added_to_cart events. */
document.addEventListener("submit",function(e){
  var form=e.target.closest("[data-product-form]");
  if(!form)return;
  e.preventDefault();
  submitProduct(form);
},true);

document.addEventListener("keydown",function(e){if(e.key==="Escape")closeCart()});

/* Paid engraving files travel with the selected variant as multipart FormData. */
function safeDesignUrl(value){
  if(typeof value!=="string"||!value.trim())return "";
  try{
    var url=new URL(String(value||""),window.location.origin);
    if(url.protocol==="https:"&&(url.hostname==="cdn.shopify.com"||url.origin===window.location.origin))return url.href;
  }catch(error){}
  return "";
}
function designDetails(item){
  var p=item.properties||{},url=safeDesignUrl(p["تصميم الحفر"]),html="";
  if(item.variant_title==="نص الحفر فقط"||item.variant_title==="تصميم مرفق (+10 ر.س)"){
    html+='<div class="di-eng">التخصيص: '+esc(item.variant_title)+'</div>';
  }
  if(url)html+='<div class="di-eng"><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">عرض التصميم المرفق ↗</a></div>';
  if(url&&p["اسم ملف التصميم"])html+='<div class="di-eng" data-preserve-digits>'+esc(p["اسم ملف التصميم"])+'</div>';
  if(p["ملاحظات التصميم"])html+='<div class="di-eng" data-preserve-digits>ملاحظات التصميم: '+esc(p["ملاحظات التصميم"])+'</div>';
  return html;
}
function initDesignForm(){
  var form=document.querySelector("[data-product-form]");if(!form)return;
  var select=form.querySelector("[data-design-select]");if(!select)return;
  var fields=form.querySelector("[data-design-fields]"),file=form.querySelector("#designFile");
  var preview=form.querySelector("[data-design-preview]"),image=form.querySelector("[data-design-image]");
  var filename=form.querySelector("[data-design-filename]"),fileNameValue=form.querySelector("[data-design-file-name]");
  var status=form.querySelector("[data-product-status]"),objectUrl="";
  function clearFile(){
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl="";file.value="";file.setCustomValidity("");
    image.removeAttribute("src");preview.hidden=true;filename.textContent="";fileNameValue.value="";
  }
  function updateSelection(){
    var option=select.options[select.selectedIndex],paid=option.dataset.paid==="true";
    fields.hidden=!paid;fields.disabled=!paid;file.required=paid;
    if(!paid){clearFile();form.querySelector("#designNotes").value=""}
    status.textContent="";
    var price=Number(option.dataset.price),compare=Number(option.dataset.compare)||0;
    document.querySelectorAll("[data-product-price]").forEach(function(el){el.textContent=money(price)});
    var compareEl=document.querySelector("[data-product-compare]"),saving=document.querySelector("[data-product-saving]");
    if(compareEl){compareEl.hidden=compare<=price;compareEl.textContent=money(compare)}
    if(saving){saving.hidden=compare<=price;saving.textContent="وفّر "+money(Math.max(0,compare-price))}
    var available=option.dataset.available==="true",button=form.querySelector('[type="submit"]');
    button.disabled=!available;button.textContent=available?"أضِف إلى السلّة — "+money(price):"غير متوفر حاليًا";
    document.querySelectorAll("[data-sticky-atc-submit]").forEach(function(el){el.disabled=!available;el.textContent=available?"أضِف إلى السلّة":"غير متوفر"});
  }
  Array.prototype.forEach.call(select.options,function(option){option.disabled=option.dataset.available!=="true"});
  if(Array.prototype.some.call(select.options,function(option){return option.value===select.dataset.initialVariant&&!option.disabled})){
    select.value=select.dataset.initialVariant;
  }
  select.addEventListener("change",updateSelection);
  file.addEventListener("change",function(){
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl="";preview.hidden=true;image.removeAttribute("src");filename.textContent="";fileNameValue.value="";
    file.setCustomValidity("");status.textContent="";
    var chosen=file.files&&file.files[0];if(!chosen)return;
    if(chosen.size===0||chosen.size>5*1024*1024||["image/jpeg","image/png"].indexOf(chosen.type)===-1){
      file.value="";file.setCustomValidity("اختر صورة JPG أو PNG لا تتجاوز 5 ميجابايت.");
      status.textContent=file.validationMessage;file.reportValidity();return;
    }
    objectUrl=URL.createObjectURL(chosen);
    filename.textContent=chosen.name;fileNameValue.value=chosen.name;preview.hidden=false;
    image.onerror=function(){file.setCustomValidity("تعذر قراءة الصورة. اختر صورة JPG أو PNG سليمة.");status.textContent=file.validationMessage};
    image.onload=function(){file.setCustomValidity("")};
    image.src=objectUrl;
  });
  form.querySelector("[data-design-remove]").addEventListener("click",function(){clearFile();status.textContent="أُزيلت الصورة. أرفق صورة أخرى أو اختر نص الحفر فقط.";file.focus()});
  updateSelection();
}
function submitProduct(form){
  if(busy||!form.reportValidity())return;
  var payload=new FormData(form),status=form.querySelector("[data-product-status]");
  Array.from(payload.entries()).forEach(function(entry){
    if(entry[0].indexOf("properties[")!==0)return;
    if((typeof entry[1]==="string"&&!entry[1].trim())||(entry[1] instanceof File&&!entry[1].size))payload.delete(entry[0]);
  });
  var hasDesign=payload.has("properties[تصميم الحفر]");
  var controls=Array.from(form.querySelectorAll("input,select,textarea,button"));
  var disabled=controls.map(function(el){return el.disabled});
  var sticky=Array.from(document.querySelectorAll("[data-sticky-atc-submit]")),stickyDisabled=sticky.map(function(el){return el.disabled});
  busy=true;controls.forEach(function(el){el.disabled=true});sticky.forEach(function(el){el.disabled=true});
  form.setAttribute("aria-busy","true");
  if(status)status.textContent=hasDesign?"جارٍ رفع التصميم وإضافة المبخرة…":"جارٍ إضافة المبخرة…";
  var accepted=false;
  fetch("/cart/add.js",{method:"POST",headers:{"Accept":"application/json"},body:payload})
    .then(function(response){return response.json().then(function(data){
      if(!response.ok)throw new Error(data.description||data.message||"تعذرت الإضافة.");
      accepted=true;
      if(hasDesign&&!(data.properties&&safeDesignUrl(data.properties["تصميم الحفر"]))){
        throw new Error("أُضيفت المبخرة، لكن تعذر تأكيد مرفق التصميم. راجع السلة قبل الدفع؛ لا تعِد الإضافة.");
      }
      return fetchCart();
    })})
    .then(function(){if(status)status.textContent="أُضيفت المبخرة"+(hasDesign?" مع التصميم المرفق":"")+" إلى السلة.";window.toast&&window.toast("أُضيفت إلى سلّتك")})
    .catch(function(error){
      var message=error.message;
      if(error instanceof TypeError)message=accepted?"أُضيفت المبخرة، وتعذر تحديث عرض السلة. افتح السلة قبل المحاولة مجددًا.":"تعذر تأكيد الإضافة. راجع السلة قبل المحاولة مجددًا.";
      if(status)status.textContent=message;
      window.toast&&window.toast(message);
    })
    .then(function(){busy=false;form.removeAttribute("aria-busy");controls.forEach(function(el,i){el.disabled=disabled[i]});sticky.forEach(function(el,i){el.disabled=stickyDisabled[i]})});
}

initDesignForm();
fetchCart();
})();
