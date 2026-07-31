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
var AR="٠١٢٣٤٥٦٧٨٩";
var ar=H.ar||function(n){return String(n).replace(/[0-9]/g,function(d){return AR[+d]})};
var fmt=H.fmt||function(n){return ar(String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"٬"))+" ر.س"};
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
  b.textContent=ar(cart.item_count);
}

/* "مبخرة كالابريز الفاخرة — الأبيض" -> name + color */
function splitTitle(item){
  var name=item.product_title||"",color="";
  if(item.variant_title&&item.variant_title!=="Default Title"){
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
      (eng?'<div class="di-eng">الحفر: «'+esc(eng)+'»</div>':'')+
      '<div class="d-row"><span class="qty">'+
      '<button data-dec="'+idx+'" aria-label="إنقاص">−</button><b>'+ar(it.quantity)+'</b><button data-inc="'+idx+'" aria-label="زيادة">+</button>'+
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

/* product form -> AJAX add with line item property "نص الحفر" */
document.addEventListener("submit",function(e){
  var form=e.target.closest("[data-product-form]");
  if(!form)return;
  e.preventDefault();
  if(busy)return;
  var id=form.querySelector('[name="id"]');
  if(!id)return;
  var props={};
  form.querySelectorAll('[name^="properties["]').forEach(function(inp){
    var m=inp.name.match(/^properties\[(.+)\]$/);
    if(m&&inp.value.trim())props[m[1]]=inp.value.trim();
  });
  addToCart(id.value,props);
});

document.addEventListener("keydown",function(e){if(e.key==="Escape")closeCart()});

fetchCart();
})();
