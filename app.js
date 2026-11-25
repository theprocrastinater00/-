const input=document.getElementById('photoInput'), stage=document.getElementById('stage'), layer=document.getElementById('photoLayer'), photo=document.getElementById('uploadedPhoto'), zoom=document.getElementById('zoom'), zoomValue=document.getElementById('zoomValue'), downloadBtn=document.getElementById('download');
const overlayUrl='assets/event-overlay.png';
let scale=1,x=36,y=30,drag=null,selected=false,photoReady=false;
function paint(){layer.style.left=x+'%';layer.style.top=y+'%';layer.style.width=(28*scale)+'%';layer.style.height=(28*scale)+'%';zoom.value=Math.round(scale*100);zoomValue.textContent=Math.round(scale*100)+'%';}
function select(){selected=true;layer.classList.add('selected');}
input.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const url=URL.createObjectURL(f);photoReady=false;photo.onerror=()=>{photoReady=false;downloadBtn.disabled=true;alert('This photo format is not supported by your browser. Please choose a JPG or PNG image.');};photo.onload=()=>{photoReady=true;downloadBtn.disabled=false;};photo.src=url;layer.style.display='block';select();scale=1;x=36;y=30;paint();});
layer.addEventListener('pointerdown',e=>{if(e.target.classList.contains('resize-handle')){drag={type:'resize',sx:e.clientX,sy:e.clientY,scale};}else{select();drag={type:'move',sx:e.clientX,sy:e.clientY,x,y};}layer.setPointerCapture(e.pointerId);e.preventDefault();});
layer.addEventListener('pointermove',e=>{if(!drag)return;const r=stage.getBoundingClientRect(),dx=(e.clientX-drag.sx)/r.width*100,dy=(e.clientY-drag.sy)/r.height*100;if(drag.type==='move'){x=drag.x+dx;y=drag.y+dy;}else{scale=Math.max(.25,Math.min(2.5,drag.scale+Math.max(dx,dy)/28));}paint();});
function end(){drag=null;}layer.addEventListener('pointerup',end);layer.addEventListener('pointercancel',end);
zoom.addEventListener('input',()=>{scale=Number(zoom.value)/100;paint();});document.getElementById('zoomIn').onclick=()=>{scale=Math.min(2.5,scale+.1);paint();};document.getElementById('zoomOut').onclick=()=>{scale=Math.max(.25,scale-.1);paint();};document.getElementById('reset').onclick=()=>{scale=1;x=36;y=30;paint();};
stage.addEventListener('pointerdown',e=>{if(e.target===stage||e.target.classList.contains('stage-overlay')){layer.classList.remove('selected');selected=false;}});

// ---------------------------------------------------------------------------
// Export the finished composition (photo first, overlay on top).
// Built to work everywhere: desktop Chrome/Edge/Firefox/Safari, iOS Safari,
// Android Chrome, Samsung Internet, in-app browsers (Facebook/Messenger/
// Instagram/WhatsApp/Viber), and even when index.html is opened from a file.
//
// Strategy:
//   1. Draw on a canvas (tries 2048 -> 1536 -> 1024 px if the device is low on memory).
//   2. If the browser blocks canvas export (file:// "tainted canvas"), reload the
//      overlay from an embedded copy (overlay-data.js) and try again.
//   3. Always show a preview sheet with: Download, Share/Save to Photos, and
//      "press & hold the image to save" (works in every browser as a last resort).
// ---------------------------------------------------------------------------
const FILE_NAME='sangitik-shraddhanjali-2027.png';
let lastBlob=null,lastUrl=null;

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Image failed to load: '+String(src).slice(0,60)));
    img.src=src;
  });
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Script failed: '+src));
    document.head.appendChild(s);
  });
}
async function getOverlay(forceEmbedded){
  if(!forceEmbedded){
    // Same-origin copy as a blob avoids cross-origin/tainting problems on web hosts.
    try{
      const res=await fetch(overlayUrl,{cache:'force-cache'});
      if(res.ok){
        const b=await res.blob();
        const u=URL.createObjectURL(b);
        const img=await loadImage(u);
        return {img,revoke:()=>URL.revokeObjectURL(u)};
      }
    }catch(e){/* fall through */}
    try{ return {img:await loadImage(overlayUrl),revoke:()=>{}}; }catch(e){/* fall through */}
  }
  if(!window.__OVERLAY_DATA) await loadScript('overlay-data.js');
  return {img:await loadImage(window.__OVERLAY_DATA),revoke:()=>{}};
}
function canvasToBlob(canvas){
  return new Promise((resolve,reject)=>{
    try{
      if(canvas.toBlob){
        canvas.toBlob(b=>{
          if(b) return resolve(b);
          try{resolve(dataUrlToBlob(canvas.toDataURL('image/png')));}catch(e){reject(e);}
        },'image/png');
      }else{
        resolve(dataUrlToBlob(canvas.toDataURL('image/png')));
      }
    }catch(e){reject(e);}
  });
}
function dataUrlToBlob(dataUrl){
  const parts=dataUrl.split(','),mime=(parts[0].match(/:(.*?);/)||[])[1]||'image/png';
  const bin=atob(parts[1]),arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime});
}
function render(overlayImg,size){
  const canvas=document.createElement('canvas');
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Canvas not supported');
  const left=x/100*size, top=y/100*size;
  const boxW=28*scale/100*size, boxH=28*scale/100*size;
  const ratio=Math.min(boxW/photo.naturalWidth,boxH/photo.naturalHeight);
  const drawW=photo.naturalWidth*ratio, drawH=photo.naturalHeight*ratio;
  ctx.drawImage(photo,left+(boxW-drawW)/2,top+(boxH-drawH)/2,drawW,drawH);
  ctx.drawImage(overlayImg,0,0,size,size);
  return canvas;
}
async function buildBlob(){
  const sizes=[2048,1536,1024];
  let lastErr=null;
  for(const forceEmbedded of [false,true]){
    let ov;
    try{ ov=await getOverlay(forceEmbedded); }catch(e){ lastErr=e; continue; }
    for(const size of sizes){
      try{
        const canvas=render(ov.img,size);
        const blob=await canvasToBlob(canvas);
        canvas.width=canvas.height=1; // free memory
        ov.revoke();
        if(blob && blob.size>0) return blob;
      }catch(e){
        lastErr=e;
        if(e && e.name==='SecurityError') break; // tainted: go to embedded overlay
      }
    }
    ov.revoke();
  }
  throw lastErr||new Error('Export failed');
}

// ----- Result sheet -----
let sheet=null;
function ensureSheet(){
  if(sheet) return sheet;
  sheet=document.createElement('div');
  sheet.className='export-sheet';
  sheet.setAttribute('role','dialog');
  sheet.setAttribute('aria-modal','true');
  sheet.innerHTML=
   '<div class="export-card">'+
   '<button type="button" class="export-close" aria-label="Close">×</button>'+
   '<h3>Your image is ready</h3>'+
   '<img class="export-img" alt="Finished event image">'+
   '<div class="export-actions">'+
   '<a class="export-btn export-dl" role="button">⬇ Download image</a>'+
   '<button type="button" class="export-btn export-share" hidden>Share / Save to Photos</button>'+
   '</div>'+
   '<p class="export-help"><b>If the download does not start:</b> press and hold the image above (right-click on desktop) and choose <b>Save Image</b> / <b>Add to Photos</b>. Inside Facebook, Messenger, Instagram or WhatsApp, tap <b>⋯ → Open in browser</b> for the best result.</p>'+
   '</div>';
  document.body.appendChild(sheet);
  const close=()=>{sheet.classList.remove('open');document.body.style.overflow='';};
  sheet.querySelector('.export-close').onclick=close;
  sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  return sheet;
}
function canShareFile(blob){
  try{
    if(!navigator.share||!navigator.canShare) return null;
    const f=new File([blob],FILE_NAME,{type:'image/png'});
    return navigator.canShare({files:[f]})?f:null;
  }catch(e){return null;}
}
function showSheet(blob){
  const s=ensureSheet();
  if(lastUrl) URL.revokeObjectURL(lastUrl);
  lastBlob=blob;
  lastUrl=URL.createObjectURL(blob);
  s.querySelector('.export-img').src=lastUrl;
  const dl=s.querySelector('.export-dl');
  dl.href=lastUrl;dl.download=FILE_NAME;
  const shareBtn=s.querySelector('.export-share');
  const file=canShareFile(blob);
  shareBtn.hidden=!file;
  shareBtn.onclick=async()=>{
    try{await navigator.share({files:[file],title:'सांगीतिक शृङ्खला २०२७'});}
    catch(e){/* user cancelled */}
  };
  s.classList.add('open');
  document.body.style.overflow='hidden';
}
function triggerDownload(blob){
  // Legacy IE/old Edge
  if(window.navigator&&window.navigator.msSaveOrOpenBlob){
    window.navigator.msSaveOrOpenBlob(blob,FILE_NAME);return;
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=FILE_NAME;a.rel='noopener';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},60000);
}

downloadBtn.addEventListener('click',async()=>{
  if(!photoReady||!photo.complete||!photo.naturalWidth){
    alert('Please upload a photo and wait for it to finish loading.');
    return;
  }
  downloadBtn.disabled=true;
  const oldLabel=downloadBtn.textContent;
  downloadBtn.textContent='Preparing…';
  try{
    const blob=await buildBlob();
    const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    // Desktop & Android: start the download right away. iOS: user taps inside the sheet.
    if(!isIOS) { try{triggerDownload(blob);}catch(e){console.warn(e);} }
    showSheet(blob);
    downloadBtn.textContent='Image Ready';
    setTimeout(()=>{downloadBtn.textContent=oldLabel;downloadBtn.disabled=false;},1500);
  }catch(err){
    console.error(err);
    alert('Sorry, the image could not be created. Try a smaller photo (JPG/PNG), or open this page in Chrome or Safari.');
    downloadBtn.textContent=oldLabel;
    downloadBtn.disabled=false;
  }
});
