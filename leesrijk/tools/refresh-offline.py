"""Maak de offline-cache opnieuw na het aanpassen van LeesRijk. Python 3."""
from pathlib import Path
import hashlib, json
root = Path(__file__).resolve().parent.parent
files = sorted(p for p in root.rglob('*') if p.is_file() and p.suffix in {'.html', '.js', '.css', '.webmanifest', '.png', '.webp'} and p.name != 'sw.js' and not ({'tools', 'netlify', 'node_modules', '.git'} & set(p.relative_to(root).parts)))
version = hashlib.sha256(b''.join(p.relative_to(root).as_posix().encode() + p.read_bytes() for p in files)).hexdigest()[:16]
urls = ['./'] + ['./' + p.relative_to(root).as_posix() for p in files]
src = """// Gemaakt door tools/refresh-offline.py
const CACHE='leesrijk-VERSION';
const FILES=URLS;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('leesrijk-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin||u.pathname.startsWith('/api/'))return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html'))));});
""".replace('VERSION', version).replace('URLS', json.dumps(urls))
(root / 'sw.js').write_text(src)
print(f'Offline klaar: {len(files)} bestanden, versie {version}.')
