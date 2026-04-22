export const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Link not available</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="3;url=https://tools4all.ai">
<meta name="robots" content="noindex,nofollow">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    margin: 0; min-height: 100vh;
    display: grid; place-items: center;
    padding: 2rem;
    background: linear-gradient(140deg, #fdf9f3 0%, #f3edff 100%);
    color: #1f1b2e;
  }
  @media (prefers-color-scheme: dark) {
    body { background: linear-gradient(140deg, #1a1726 0%, #241f38 100%); color: #ece7ff; }
    .card { background: rgba(255,255,255,0.04); box-shadow: 0 20px 40px rgba(0,0,0,0.35); }
    .sub { color: #b4acc8; }
  }
  .card {
    max-width: 440px; width: 100%;
    background: rgba(255,255,255,0.72);
    border-radius: 20px;
    padding: 2.5rem 2rem;
    text-align: center;
    box-shadow: 0 16px 40px rgba(60,40,120,0.12);
    backdrop-filter: blur(12px);
  }
  .cat { font-size: 5rem; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.08)); }
  h1 { margin: 0.75rem 0 0.25rem; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; }
  .sub { margin: 0.25rem 0 1.25rem; color: #6b6480; font-size: 0.95rem; }
  .count { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.9rem; color: #8b5cf6; font-weight: 500; }
  .count-num { display: inline-grid; place-items: center; width: 1.75rem; height: 1.75rem; border-radius: 999px; background: rgba(139,92,246,0.14); font-variant-numeric: tabular-nums; }
  a { color: #8b5cf6; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main class="card" role="alert">
    <div class="cat" aria-hidden="true">🐈‍⬛</div>
    <h1>Nothing to see here</h1>
    <p class="sub">This share link is invalid, expired, or has been revoked.</p>
    <p class="count">Taking you to <a href="https://tools4all.ai">tools4all.ai</a> in <span class="count-num" id="c">3</span></p>
  </main>
<script>
  (function(){ var n=3, el=document.getElementById('c');
    var t=setInterval(function(){ n--; if(el) el.textContent=n; if(n<=0){ clearInterval(t); location.replace('https://tools4all.ai'); } }, 1000);
  })();
</script>
</body>
</html>`;
