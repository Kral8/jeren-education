import os, json, sys
sys.stdout.reconfigure(encoding='utf-8')
root = r'D:\сайт тещи\словари\Книги-библиотека'
items = []
for dp, dns, fns in os.walk(root):
    for f in fns:
        p = os.path.join(dp, f)
        rel = os.path.relpath(p, root)
        ext = os.path.splitext(f)[1].lower()
        items.append({'rel': rel, 'name': f, 'ext': ext, 'size': os.path.getsize(p), 'dir': os.path.relpath(dp, root)})
print('ROOT:', root)
print('EXISTS:', os.path.isdir(root))
print('TOTAL FILES:', len(items))
print('TOTAL SIZE MB:', round(sum(x['size'] for x in items)/1e6, 2))
exts = {}
for x in items:
    exts[x['ext']] = exts.get(x['ext'], 0) + 1
print('FORMATS:', json.dumps(exts, ensure_ascii=False))
for x in sorted(items, key=lambda i: i['rel']):
    print(f"{x['size']:>10}  {x['ext']:8}  {x['rel']}")
