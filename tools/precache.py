"""Regenerates the precache list in sw.js from the files the app ships.

Run from the repo root after adding or removing assets:  python3 tools/precache.py
It also bumps the cache version so installed apps pick up the change.
"""
import hashlib, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
files = ['./', 'index.html', 'styles.css', 'config.js', 'manifest.webmanifest']
files += sorted(str(p.relative_to(root)) for d in ('js', 'assets') for p in (root / d).rglob('*')
                if p.is_file() and p.name != 'LICENSE' and 'splash' not in p.parts)
digest = hashlib.sha1()
for f in files[1:]:
    digest.update((root / f).read_bytes())
sw = (root / 'sw.js').read_text()
block = 'const PRECACHE = ' + json.dumps(files, indent=2) + ';'
sw = re.sub(r'const PRECACHE = \[.*?\];', lambda m: block, sw, flags=re.S)
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'habie-{digest.hexdigest()[:8]}';", sw)
(root / 'sw.js').write_text(sw)
print(f'{len(files)} files precached')
