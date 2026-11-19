"""Regenerates the FILES list and cache name in sw.js from the files in this folder.
Run after every change: python3 tools/refresh-offline.py"""
import hashlib, json, os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
skip_dirs = {'tools', '.git', 'node_modules', 'netlify'}
skip_files = {'sw.js', 'KANGOEROE.md', 'README.md', 'netlify.toml', '_headers', '_redirects', 'package.json', 'package-lock.json'}
files, h = [], hashlib.sha256()
for d, dirs, fs in os.walk(root):
    dirs[:] = sorted(x for x in dirs if x not in skip_dirs and not x.startswith('.'))
    for f in sorted(fs):
        rel = os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
        if f in skip_files or f.startswith('.'): continue
        files.append('/' + rel)
files.sort()
for f in files:
    h.update(f.encode()); h.update(open(os.path.join(root, f[1:]), 'rb').read())
p = os.path.join(root, 'sw.js'); s = open(p).read()
s = re.sub(r"const CACHE='rekenrijk-offline-[0-9a-f]+';", f"const CACHE='rekenrijk-offline-{h.hexdigest()[:16]}';", s)
s = re.sub(r"const FILES=\[.*?\];", 'const FILES=' + json.dumps(files) + ';', s, flags=re.S)
open(p, 'w').write(s)
print(len(files), 'files, cache', h.hexdigest()[:16])
