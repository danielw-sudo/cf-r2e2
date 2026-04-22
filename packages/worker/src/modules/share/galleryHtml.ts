export const GALLERY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>R2E2 Gallery</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;min-height:100vh}
header{padding:1.5rem 2rem;display:flex;align-items:center;gap:.75rem}
header img{width:32px;height:32px;border-radius:6px}
header h1{font-size:1.1rem;font-weight:600;letter-spacing:-.01em}
header span{color:#525252;font-size:.8rem;margin-left:auto}
.grid{columns:4 280px;column-gap:12px;padding:0 2rem 2rem}
.grid figure{break-inside:avoid;margin-bottom:12px;border-radius:10px;overflow:hidden;position:relative;cursor:pointer;background:#171717}
.grid img{width:100%;display:block;transition:transform .3s}
.grid figure:hover img{transform:scale(1.03)}
.grid figcaption{position:absolute;bottom:0;left:0;right:0;padding:.6rem .8rem;
  background:linear-gradient(transparent,rgba(0,0,0,.7));font-size:.75rem;opacity:0;transition:opacity .3s}
.grid figure:hover figcaption{opacity:1}
.empty{text-align:center;padding:6rem 2rem;color:#525252;font-size:1rem}
.lb{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .25s}
.lb.open{opacity:1;pointer-events:auto}
.lb img{max-width:92vw;max-height:92vh;border-radius:8px;object-fit:contain}
.lb .close{position:absolute;top:1rem;right:1.5rem;font-size:2rem;color:#aaa;cursor:pointer;line-height:1}
.lb .info{position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);
  text-align:center;font-size:.85rem;color:#999;max-width:600px}
@media(max-width:640px){.grid{columns:2;padding:0 .75rem .75rem}header{padding:1rem}}
</style>
</head>
<body>
<header>
  <h1>R2E2 Gallery</h1>
  <span id="count"></span>
</header>
<div class="grid" id="grid"></div>
<div class="empty" id="empty" style="display:none">No public images yet</div>
<div class="lb" id="lb" onclick="closeLb()">
  <span class="close">&times;</span>
  <img id="lbImg" src="" alt="">
  <div class="info" id="lbInfo"></div>
</div>
<script>
const grid=document.getElementById('grid'),empty=document.getElementById('empty'),
  lb=document.getElementById('lb'),lbImg=document.getElementById('lbImg'),
  lbInfo=document.getElementById('lbInfo'),count=document.getElementById('count');
fetch('/share/gallery').then(r=>r.json()).then(d=>{
  if(!d.items.length){empty.style.display='block';return}
  count.textContent=d.items.length+' images';
  d.items.forEach(item=>{
    const fig=document.createElement('figure');
    const img=document.createElement('img');
    img.loading='lazy';img.src=item.url;img.alt=item.title||'';
    const cap=document.createElement('figcaption');
    cap.textContent=item.title||'';
    fig.append(img,cap);
    fig.onclick=()=>openLb(item);
    grid.appendChild(fig);
  });
});
function openLb(item){lbImg.src=item.url;lbInfo.textContent=item.title||'';lb.classList.add('open');document.body.style.overflow='hidden'}
function closeLb(){lb.classList.remove('open');document.body.style.overflow=''}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLb()});
</script>
</body>
</html>`;
