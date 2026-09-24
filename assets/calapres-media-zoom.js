/* ============================================================
   Calapres — product photo viewer (product page only).
   Tapping the product photo opens the product's own image at its
   original uploaded size, full screen, loaded only on demand.
   Zoom: double-tap, pinch, the «تكبير» button, a mouse click,
   Ctrl + wheel or the + / − keys. Move: drag (native scrolling on
   touch). Close: «إغلاق», Escape, or a click outside the photo.
   More than one product image adds previous / next, swipe and the
   arrow keys (right to left). Nothing here touches the product form.
   ============================================================ */
(function(){
"use strict";
function init(){
  var open=document.querySelector("[data-zoom-open]"),dlg=document.querySelector("[data-zoom]");
  if(!open||!dlg||dlg.dataset.ready)return;dlg.dataset.ready="true";
  var q=function(s){return dlg.querySelector(s)};
  var stage=q("[data-zoom-stage]"),img=q("[data-zoom-img]"),toggle=q("[data-zoom-toggle]"),closeBtn=q("[data-zoom-close]");
  var count=q("[data-zoom-count]"),prev=q("[data-zoom-prev]"),next=q("[data-zoom-next]"),pageImg=open.querySelector("img");
  var list=Array.prototype.map.call(dlg.querySelectorAll("[data-zoom-list] [data-src]"),function(n){
    return {id:n.getAttribute("data-id"),src:n.getAttribute("data-src"),w:Number(n.getAttribute("data-w"))||1,h:Number(n.getAttribute("data-h"))||1,alt:n.getAttribute("data-alt")||""};
  });
  if(!list.length)return;
  var modal=typeof dlg.showModal==="function";
  var start=0,i=0,scale=1,fitW=0,fitH=0,maxScale=3,stepScale=2;
  list.forEach(function(it,k){if(it.id===open.getAttribute("data-zoom-start"))start=k});

  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function measure(){
    var it=list[i],f=Math.min(stage.clientWidth/it.w,stage.clientHeight/it.h);
    fitW=it.w*f;fitH=it.h*f;
    maxScale=clamp(2/f,2,4);              /* up to about twice the original's own pixels */
    stepScale=clamp(1/f,2,maxScale);      /* one step shows the original at its own size */
  }
  /* Zoom to s around the screen point (x, y), keeping that point of the photo under it. */
  function zoom(s,x,y){
    s=clamp(s,1,maxScale);
    var r=img.getBoundingClientRect(),st=stage.getBoundingClientRect();
    if(x==null){x=st.left+st.width/2;y=st.top+st.height/2}
    var fx=r.width?clamp((x-r.left)/r.width,0,1):.5,fy=r.height?clamp((y-r.top)/r.height,0,1):.5;
    scale=s;img.style.width=fitW*s+"px";img.style.height=fitH*s+"px";
    var n=img.getBoundingClientRect();
    stage.scrollLeft+=n.left+fx*n.width-x;stage.scrollTop+=n.top+fy*n.height-y;
    var on=s>1.01;dlg.classList.toggle("is-zoomed",on);
    toggle.setAttribute("aria-pressed",on?"true":"false");toggle.textContent=on?"تصغير":"تكبير";
  }
  function show(k){
    i=(k+list.length)%list.length;var it=list[i];
    img.alt=it.alt;
    /* Show the photo already on the page at once, then swap in the original when it has loaded. */
    if(i===start&&pageImg&&pageImg.complete&&pageImg.currentSrc)img.src=pageImg.currentSrc;else img.removeAttribute("src");
    var full=new Image();full.onload=function(){if(list[i]===it)img.src=it.src};full.src=it.src;
    measure();stage.scrollLeft=0;stage.scrollTop=0;zoom(1);
    var many=list.length>1;prev.hidden=!many;next.hidden=!many;count.hidden=!many;count.textContent=(i+1)+" / "+list.length;
  }
  function openViewer(){
    document.documentElement.classList.add("pz-lock");
    if(modal){if(!dlg.open)dlg.showModal()}else dlg.setAttribute("open","");
    show(start);closeBtn.focus({preventScroll:true});
  }
  function closeViewer(){if(modal){if(dlg.open)dlg.close()}else{dlg.removeAttribute("open");closed()}}
  function closed(){
    document.documentElement.classList.remove("pz-lock");
    open.focus({preventScroll:true});
  }
  open.addEventListener("click",function(e){e.preventDefault();openViewer()});
  dlg.addEventListener("close",closed);
  closeBtn.addEventListener("click",closeViewer);
  toggle.addEventListener("click",function(){zoom(scale>1.01?1:stepScale)});
  prev.addEventListener("click",function(){show(i-1)});
  next.addEventListener("click",function(){show(i+1)});

  dlg.addEventListener("keydown",function(e){
    var k=e.key;
    if(k==="Escape"&&!modal){e.preventDefault();closeViewer();return}
    if(k==="+"||k==="="){e.preventDefault();zoom(scale*1.5)}
    else if(k==="-"||k==="_"){e.preventDefault();zoom(scale/1.5)}
    else if(k==="0"){e.preventDefault();zoom(1)}
    else if(scale>1.01&&/^Arrow/.test(k)){e.preventDefault();stage.scrollBy({left:k==="ArrowLeft"?-80:k==="ArrowRight"?80:0,top:k==="ArrowUp"?-80:k==="ArrowDown"?80:0})}
    else if(list.length>1&&(k==="ArrowLeft"||k==="ArrowRight")){e.preventDefault();show(i+(k==="ArrowLeft"?1:-1))}
  });

  /* Mouse: click the photo to zoom in or out, drag to move, click outside the photo to close. */
  var ptype="",drag=null,dragged=false;
  stage.addEventListener("pointerdown",function(e){
    ptype=e.pointerType;dragged=false;
    if(e.pointerType!=="mouse"||e.button!==0||scale<=1.01)return;
    drag={x:e.clientX,y:e.clientY,l:stage.scrollLeft,t:stage.scrollTop};e.preventDefault();
  });
  window.addEventListener("pointermove",function(e){
    if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>4)dragged=true;
    stage.scrollLeft=drag.l-dx;stage.scrollTop=drag.t-dy;
  });
  window.addEventListener("pointerup",function(){drag=null});
  stage.addEventListener("click",function(e){
    if(ptype==="touch"||ptype==="pen")return;      /* touch uses double-tap and pinch */
    if(dragged){dragged=false;return}
    if(scale>1.01)zoom(1,e.clientX,e.clientY);
    else if(e.target===img)zoom(stepScale,e.clientX,e.clientY);
    else closeViewer();
  });
  stage.addEventListener("wheel",function(e){
    if(!e.ctrlKey)return;e.preventDefault();zoom(scale*Math.exp(-e.deltaY/200),e.clientX,e.clientY);
  },{passive:false});

  /* Touch: pinch and double-tap zoom; one finger moves the zoomed photo by native scrolling;
     a sideways swipe changes photo when there is more than one and the photo is not zoomed. */
  var pinch=null,touch=null,lastTap=null;
  function gap(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
  stage.addEventListener("touchstart",function(e){
    if(e.touches.length===2){e.preventDefault();pinch={d:gap(e.touches[0],e.touches[1])||1,s:scale};touch=null;lastTap=null}
    else if(e.touches.length===1&&!pinch){var t=e.touches[0];touch={x:t.clientX,y:t.clientY,moved:false}}
  },{passive:false});
  stage.addEventListener("touchmove",function(e){
    if(pinch&&e.touches.length===2){
      e.preventDefault();var a=e.touches[0],b=e.touches[1];
      zoom(pinch.s*gap(a,b)/pinch.d,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);
    }else if(touch&&e.touches.length===1){
      var t=e.touches[0];if(Math.abs(t.clientX-touch.x)>10||Math.abs(t.clientY-touch.y)>10)touch.moved=true;
    }
  },{passive:false});
  stage.addEventListener("touchend",function(e){
    if(pinch){if(e.touches.length===0)pinch=null;return}
    if(!touch||e.touches.length)return;
    var t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y,moved=touch.moved;touch=null;
    if(moved){
      if(scale<=1.01&&list.length>1&&Math.abs(dx)>50&&Math.abs(dx)>1.5*Math.abs(dy))show(i+(dx>0?1:-1));
      lastTap=null;return;
    }
    var now=Date.now();
    if(lastTap&&now-lastTap.t<320&&Math.hypot(t.clientX-lastTap.x,t.clientY-lastTap.y)<40){
      e.preventDefault();lastTap=null;zoom(scale>1.01?1:stepScale,t.clientX,t.clientY);
    }else lastTap={t:now,x:t.clientX,y:t.clientY};
  });
  /* Safari: keep its own page zoom out of the viewer. */
  dlg.addEventListener("gesturestart",function(e){e.preventDefault()});

  window.addEventListener("resize",function(){if(!dlg.hasAttribute("open"))return;var s=scale;measure();zoom(s)});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();