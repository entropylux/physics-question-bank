import io
import tarfile
import urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
dest=root/'阅读资源'/'katex'
dest.mkdir(parents=True,exist_ok=True)
url='https://registry.npmjs.org/katex/-/katex-0.16.22.tgz'
with urllib.request.urlopen(url,timeout=45) as r:
    data=r.read()
count=0
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
    for item in archive.getmembers():
        if not item.isfile(): continue
        if item.name in ['package/dist/katex.min.css','package/dist/katex.js']:
            rel=Path(item.name).name
        elif item.name.startswith('package/dist/fonts/'):
            rel='fonts/'+Path(item.name).name
        elif item.name=='package/LICENSE': rel='LICENSE'
        else: continue
        target=dest/rel
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(archive.extractfile(item).read())
        count+=1
print(f'KaTeX 0.16.22: {count} offline assets saved')
