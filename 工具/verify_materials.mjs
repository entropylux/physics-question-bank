import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];const courses=[];let links=0,images=0;
const official=[];
const dirs=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^\d\d_/.test(d.name)).map(d=>d.name);
for(const dir of dirs){
 let texts={};
 for(const n of ['知识点讲义','分层练习题','练习详解']){
  const file=path.join(root,dir,n+'.md');if(!fs.existsSync(file)){errors.push('Missing '+file);continue;}
  texts[n]=fs.readFileSync(file,'utf8');
  if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(texts[n]))errors.push('Control char '+file);
 }
 const ids=s=>[...s.matchAll(/^#{2,3}\s+([A-Z]{1,3}-?\d{2})\b/gm)].map(m=>m[1]);
 const q=ids(texts['分层练习题']||'');const a=ids(texts['练习详解']||'');
 if(q.length!==12||JSON.stringify(q)!==JSON.stringify(a))errors.push('Question mismatch '+dir);
 if((texts['知识点讲义']||'').length<6000)errors.push('Lecture too short '+dir);
 let bankCount=0;
 const manifest=path.join(root,dir,'官方题库','文件清单.json');
 if(fs.existsSync(manifest)){
  const m=JSON.parse(fs.readFileSync(manifest,'utf8'));
  const remote=JSON.parse(fs.readFileSync(path.join(root,dir,'官方题库','网盘目录快照.json'),'utf8'));
  if(m.files.length!==remote.dirent_list.length)errors.push('Remote count mismatch '+dir);
  for(const f of m.files){
   const p=path.join(root,dir,'官方题库',f.name);const b=fs.readFileSync(p);bankCount++;images++;
   if(b.length!==f.size||crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)errors.push('Image mismatch '+p);
   if(!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.readUInt32BE(16)<1||b.readUInt32BE(20)<1)errors.push('Invalid PNG '+p);
  }
  const solutionFile=path.join(root,dir,'官方题库解答.md');
  const coverageFile=path.join(root,dir,'官方题库解答覆盖.json');
  if(!fs.existsSync(solutionFile)||!fs.existsSync(coverageFile))errors.push('Missing official solutions '+dir);
  else{
   const solution=fs.readFileSync(solutionFile,'utf8');
   const headings=[...solution.matchAll(/^##\s+([12]-[1-6]T\d+)\b/gm)];
   const items=JSON.parse(fs.readFileSync(coverageFile,'utf8')).items;
   const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
   const names=m.files.map(f=>f.name);
   if(!same(headings.map(h=>h[1]+'.png'),names))errors.push('Official section mismatch '+dir);
   if(!same(items.map(i=>i.file),names))errors.push('Official coverage mismatch '+dir);
   for(let i=0;i<headings.length;i++){
    const h=headings[i],body=solution.slice(h.index,headings[i+1]?.index??solution.length);
    if(!body.includes('官方题库/'+h[1]+'.png'))errors.push('Missing original link '+dir+'/'+h[1]);
    if(!solution.includes('<a name="q-'+h[1]+'"></a>'))errors.push('Missing GitHub anchor '+dir+'/'+h[1]);
   }
   for(const item of items){
    if(!['solved','source_incomplete'].includes(item.status))errors.push('Invalid solution status '+dir+'/'+item.file);
    if((item.status==='solved'&&!item.subparts?.length)||!item.note)errors.push('Missing subpart record '+dir+'/'+item.file);
   }
   official.push({subject:dir,entries:items.length,solved:items.filter(i=>i.status==='solved').length,sourceIncomplete:items.filter(i=>i.status==='source_incomplete').map(i=>i.file)});
  }
 }
 courses.push({subject:dir,lectureCharacters:texts['知识点讲义']?.length,questions:q.length,originalImages:bankCount});
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);}
for(const p of walk(root).filter(p=>p.endsWith('.html')||p.endsWith('.css'))){
 const t=fs.readFileSync(p,'utf8');
 const refs=p.endsWith('.html')?[...t.matchAll(/(?:href|src)="([^"<>]+)"/g)].map(m=>m[1]):[...t.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/^['"]|['"]$/g,''));
 for(let ref of refs){
  if(/^(https?:|mailto:|data:)/.test(ref))continue;
  const anchor=decodeURIComponent(ref.split('#')[1]||'');
  ref=decodeURIComponent(ref.split('#')[0].split('?')[0].replaceAll('&amp;','&'));
  const target=ref?path.resolve(path.dirname(p),ref):p;links++;
  if(!fs.existsSync(target))errors.push('Broken link '+path.relative(root,p)+' -> '+ref);
  else if(anchor&&target.endsWith('.html')){
   const body=target===p?t:fs.readFileSync(target,'utf8');
   if(!body.includes('id="'+anchor+'"')&&!body.includes('name="'+anchor+'"'))errors.push('Broken anchor '+path.relative(root,p)+' -> '+ref+'#'+anchor);
  }
 }
}
const layout=JSON.parse(fs.readFileSync(path.join(root,'排版核查.json'),'utf8'));
if(layout.mathErrors.length)errors.push('Math rendering errors');
const independent=official.filter(c=>!c.subject.startsWith('10_'));
const sharedA=path.join(root,'09_统计物理','官方题库解答.md'),sharedB=path.join(root,'10_统计力学','官方题库解答.md');
if(fs.existsSync(sharedA)&&fs.existsSync(sharedB)){
 const trim=s=>s.slice(s.search(/<a name="q-|^##\s+[12]-[1-6]T/m));
 if(trim(fs.readFileSync(sharedA,'utf8'))!==trim(fs.readFileSync(sharedB,'utf8')))errors.push('Shared statistics solutions differ');
}
const report={date:'2026-10-07',subjects:courses.length,questions:courses.reduce((n,c)=>n+c.questions,0),officialEntries:independent.reduce((n,c)=>n+c.entries,0),officialSolved:independent.reduce((n,c)=>n+c.solved,0),sourceIncomplete:independent.flatMap(c=>c.sourceIncomplete.map(file=>({subject:c.subject,file}))),imageCopiesVerified:images,localLinksVerified:links,mathExpressionsRendered:layout.totalMath,courses,official,errors};
fs.writeFileSync(path.join(root,'完整性核查.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
