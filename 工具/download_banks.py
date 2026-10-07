import concurrent.futures as cf
import hashlib
import json
import re
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://cloud.tsinghua.edu.cn'
SUBJECTS = [
 ('01_力学','a57bdd3e1dfb4380ac5a'),
 ('02_分析力学','a3eec8b19e434e6ab44f'),
 ('03_电磁学','dd920505d2fc41f7a84f'),
 ('04_电动力学','22902080846a4aeba580'),
 ('05_热学','26f2f8f988a7481eb1ec'),
 ('06_光学','a7347e29a9a5424882bc'),
 ('07_高等量子力学',None),
 ('08_量子力学','14bb87a56c5f4241b933'),
 ('09_统计物理','65512c25c5cf428cb418'),
 ('10_统计力学','65512c25c5cf428cb418'),
 ('11_相对论',None),
]

def fetch(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read()
        except Exception:
            if attempt == 2: raise
            time.sleep(attempt+1)

def natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', s)]

def main():
    jobs=[]; manifests={}; seen={}; summaries=[]
    for folder,token in SUBJECTS:
        dest=ROOT/folder/'官方题库'; dest.mkdir(parents=True,exist_ok=True)
        if not token:
            (dest/'来源说明.md').write_text('邮件未提供本学科官方题库链接。教学自编题见上一级的分层练习题和练习详解；自编题不代表官方命题范围。\n',encoding='utf-8')
            continue
        if token in seen: continue
        api=f'{HOST}/api/v2.1/share-links/{token}/dirents/?path=/'
        raw=fetch(api); meta=json.loads(raw)
        (dest/'网盘目录快照.json').write_bytes(raw)
        entries=sorted(meta['dirent_list'],key=lambda e:natural(e['file_name']))
        if any(e['is_dir'] for e in entries):
            raise RuntimeError(f'Unexpected subdirectory in {folder}; extend recursive listing before proceeding')
        manifests[folder]={'folder':folder,'token':token,'source_url':f'{HOST}/d/{token}/','retrieved_date':'2026-10-07','files':[]}
        seen[token]=folder
        for e in entries: jobs.append((folder,token,e))
        print(f'{folder}: {len(entries)} files listed',flush=True)
    def download(job):
        folder,token,e=job
        name=e['file_name']
        if Path(name).name!=name or '\\' in name: raise ValueError(name)
        out=ROOT/folder/'官方题库'/name
        url=f'{HOST}/d/{token}/files/?p={urllib.parse.quote(e["file_path"],safe="")}&dl=1'
        if out.exists() and out.stat().st_size==e['size']:
            data=out.read_bytes()
        else:
            data=fetch(url)
            if len(data)!=e['size']: raise ValueError(f'Size mismatch {name}: {len(data)} != {e["size"]}')
            if name.lower().endswith('.png') and not data.startswith(b'\x89PNG\r\n\x1a\n'): raise ValueError('Invalid PNG '+name)
            out.write_bytes(data)
        return folder,dict(name=name,size=len(data),sha256=hashlib.sha256(data).hexdigest(),source_url=url,remote_last_modified=e['last_modified'])
    errors=[]
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(download,j):j for j in jobs}
        for n,f in enumerate(cf.as_completed(futures),1):
            try:
                folder,record=f.result(); manifests[folder]['files'].append(record)
            except Exception as e: errors.append({'job':futures[f],'error':str(e)})
            if n%40==0 or n==len(jobs): print(f'Downloaded {n}/{len(jobs)}, errors {len(errors)}',flush=True)
    for folder,m in manifests.items():
        m['files'].sort(key=lambda e:natural(e['name']))
        (ROOT/folder/'官方题库'/'文件清单.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
        summaries.append({'subject':folder,'count':len(m['files']),'bytes':sum(e['size'] for e in m['files'])})
    # The email assigns the same share to two distinct subjects; both folders remain usable independently.
    src=ROOT/'09_统计物理'/'官方题库'; dst=ROOT/'10_统计力学'/'官方题库'
    for p in src.iterdir():
        if p.is_file(): shutil.copy2(p,dst/p.name)
    stat_manifest=json.loads((dst/'文件清单.json').read_text(encoding='utf-8'))
    stat_manifest['folder']='10_统计力学'
    stat_manifest['shared_with']='09_统计物理'
    (dst/'文件清单.json').write_text(json.dumps(stat_manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    summaries.append({'subject':'10_统计力学','count':len(stat_manifest['files']),'shared_with':'09_统计物理'})
    result={'date':'2026-10-07','subjects':summaries,'errors':errors,'unique_files':sum(len(m['files']) for m in manifests.values())}
    (ROOT/'下载核查.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False),flush=True)
    if errors: raise SystemExit(1)

if __name__=='__main__': main()
