// Clickable motion graphics: note burst on tap, tilt poster, tabs + countdown, scroll reveal, equalizer toggle.
(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=document.getElementById('fx'),cx=cv.getContext('2d');let P=[];
function size(){cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio}size();addEventListener('resize',size);
const G=['♪','♫','♬','✦','❀'],C=['#ffd36c','#ff6a2b','#ffb347','#fff6e5'];
function burst(x,y,n){if(reduce)return;for(let i=0;i<(n||18);i++){const a=Math.random()*6.283,s=2+Math.random()*5;P.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,g:G[i%5],c:C[i%4],r:14+Math.random()*18,l:1,rot:Math.random()*6})}run()}
let on=false;function run(){if(on)return;on=true;(function f(){cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.scale(devicePixelRatio,devicePixelRatio);
P=P.filter(p=>p.l>0);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.vx*=.99;p.l-=.012;p.rot+=.05;cx.save();cx.globalAlpha=Math.max(p.l,0);cx.translate(p.x,p.y);cx.rotate(Math.sin(p.rot)*.5);cx.fillStyle=p.c;cx.font=p.r+'px sans-serif';cx.fillText(p.g,0,0);cx.restore()});
if(P.length)requestAnimationFrame(f);else{on=false;cx.clearRect(0,0,cv.width,cv.height)}})()}
addEventListener('pointerdown',e=>{if(e.target.closest('#stage,input,.export-sheet'))return;burst(e.clientX,e.clientY,10)});
const eq=document.getElementById('eq');eq.onclick=()=>{eq.classList.toggle('off');const r=eq.getBoundingClientRect();burst(r.left+r.width/2,r.top,14)};
// poster tilt
const po=document.getElementById('poster');if(!reduce){po.addEventListener('pointermove',e=>{const r=po.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;po.style.transform='perspective(800px) rotateY('+x*16+'deg) rotateX('+-y*16+'deg) scale(1.03)'});po.addEventListener('pointerleave',()=>po.style.transform='')}
po.addEventListener('click',()=>{const r=po.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,30)});
// city tabs + countdown (Japan time)
const D=[{c:'OSAKA',j:'ओसाका',d:'31 DEC 2026',t:'17:30 – 24:00',m:'https://maps.app.goo.gl/nVocQ5EmrgiMLWYb9',at:'2026-12-31T17:30:00+09:00'},
{c:'NAGOYA',j:'नागोया',d:'01 JAN 2027',t:'17:00 – 21:30',m:'https://maps.app.goo.gl/p1yWzr2Bx2tttFVL9',at:'2027-01-01T17:00:00+09:00'},
{c:'TOKYO',j:'टोकियो',d:'02 JAN 2027',t:'17:00 – 21:30',m:'https://maps.app.goo.gl/L13f5PihaVkRcUQ98',at:'2027-01-02T17:00:00+09:00'}];
let cur=0;const $=id=>document.getElementById(id),panel=$('panel');
function show(i,fx){cur=i;const v=D[i];$('pCity').textContent=v.c;$('pJp').textContent=v.j;$('pDate').textContent=v.d;$('pTime').textContent=v.t;$('pMap').href=v.m;
document.querySelectorAll('.tabs button').forEach((t,k)=>t.classList.toggle('on',k===i));panel.classList.remove('swap');void panel.offsetWidth;panel.classList.add('swap');tick();
if(fx){const r=panel.getBoundingClientRect();burst(r.left+r.width/2,r.top+60,22)}}
document.querySelectorAll('.tabs button').forEach(t=>t.onclick=()=>show(+t.dataset.i,true));
function tick(){let s=Math.max(0,Math.floor((new Date(D[cur].at)-Date.now())/1000));$('cd').textContent=Math.floor(s/86400);$('ch').textContent=Math.floor(s%86400/3600);$('cm').textContent=Math.floor(s%3600/60);$('cs').textContent=s%60}
setInterval(tick,1000);show(0,false);
// scroll reveal
document.querySelectorAll('.sec,.poster').forEach(e=>e.classList.add('rv'));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach(e=>io.observe(e));
setTimeout(()=>document.querySelectorAll('.rv').forEach(e=>e.classList.add('in')),2500);
})();
