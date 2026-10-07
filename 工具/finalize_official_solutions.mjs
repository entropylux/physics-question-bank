import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const subjects=fs.readdirSync(root).filter(n=>/^\d\d_/.test(n)).sort();
const rows=[], exceptions=[], errors=[];
for(const subject of subjects){
 const dir=path.join(root,subject), manifest=path.join(dir,'官方题库','文件清单.json');
 if(!fs.existsSync(manifest))continue;
 const files=JSON.parse(fs.readFileSync(manifest,'utf8')).files;
 const answer=path.join(dir,'官方题库解答.md'), coverage=path.join(dir,'官方题库解答覆盖.json');
 if(!fs.existsSync(answer)||!fs.existsSync(coverage)){errors.push(subject+': missing solution or coverage');continue;}
 const items=JSON.parse(fs.readFileSync(coverage,'utf8')).items;
 let md=fs.readFileSync(answer,'utf8').replace(/^\uFEFF/,'');
 const ids=[...md.matchAll(/^##\s+([12]-[1-6]T\d+)\b/gm)].map(m=>m[1]+'.png');
 const names=files.map(f=>f.name).sort();
 if(JSON.stringify([...ids].sort())!==JSON.stringify(names))errors.push(subject+': solution section mismatch');
 if(JSON.stringify(items.map(i=>i.file).sort())!==JSON.stringify(names))errors.push(subject+': coverage mismatch');
 for(const item of items){
  if(!['solved','source_incomplete'].includes(item.status))errors.push(subject+': invalid status '+item.file);
  if(item.status==='solved'&&!item.subparts?.length)errors.push(subject+': missing subparts '+item.file);
  if(!item.note)errors.push(subject+': missing coverage note '+item.file);
  if(item.status==='source_incomplete')exceptions.push({subject,...item});
 }
 rows.push({subject,count:files.length,solved:items.filter(i=>i.status==='solved').length,incomplete:items.filter(i=>i.status==='source_incomplete').length,answer,md});
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
for(const row of rows){
 const md=row.md.replace(/<a name="q-[12]-[1-6]T\d+"><\/a>\s*\n/g,'').replace(/^(##\s+([12]-[1-6]T\d+)\b.*)$/gm,(_,heading,id)=>`<a name="q-${id}"></a>\n\n${heading}`);
 fs.writeFileSync(row.answer,md);
}
const independent=rows.filter(r=>!r.subject.startsWith('10_'));
const count=independent.reduce((n,r)=>n+r.count,0),solved=independent.reduce((n,r)=>n+r.solved,0),incomplete=count-solved;
let overview=`# 官方题库逐题解答总览\n\n按邮件网盘的原文件名逐条对应。扣除统计力学文件夹的共享副本，共 ${count} 个题图条目：${solved} 个有解答，${incomplete} 个原图缺失问项，已标明可确定内容与缺失之处。不同题号偶有重复题意，所以此计数不是互不相同物理问题的数量。\n\n解答按小问给出模型、公式来源、推导和结果；题设中的近似、参数歧义及原图印刷错误在对应小节说明。\n\n| 科目 | 原题图 | 有解答 | 原图缺项 | 入口 |\n|---|---:|---:|---:|---|\n`;
for(const r of rows)overview+=`| ${r.subject.replace(/^\d+_/,'')} | ${r.count} | ${r.solved} | ${r.incomplete} | [逐题解答](${r.subject}/官方题库解答.md) · [原题索引](${r.subject}/题库索引.md) |\n`;
overview+='\n统计物理与统计力学使用同一套49张题图、同一份逐题解答，按用户要求分别保存在各科目录。高等量子力学、相对论的邮件未提供题库链接，仍保留教学自编练习及其详解。\n\n## 原图缺项清单\n\n';
for(const e of exceptions.filter(e=>!e.subject.startsWith('10_'))){const id=e.file.replace(/\.png$/,'');overview+=`- **${id}**（${e.subject.replace(/^\d+_/,'')}）：${e.note} [原图](${e.subject}/官方题库/${e.file}) · [说明与可解部分](${e.subject}/官方题库解答.md#q-${id})\n`;}
overview+='\n## 核对方式\n\n每科的“官方题库解答覆盖.json”逐项保存原文件名、小问记录、解答状态和备注。完整性检查比对原图清单、解答章节、覆盖记录及原图链接，检测漏项、重号和断链；公式排版检查另存“排版核查.json”。这些检查不替代对物理推导的阅读和校核。\n';
fs.writeFileSync(path.join(root,'官方题库解答总览.md'),overview);
console.log(JSON.stringify({entries:count,solved,sourceIncomplete:incomplete,copies:rows.reduce((n,r)=>n+r.count,0)},null,2));
