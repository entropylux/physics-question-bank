import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'分场练习卷');
const require=createRequire(import.meta.url);
const katex=require(path.join(root,'阅读资源/katex/katex.js'));
const {marked}=require('marked');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const items=['经典','近代'].flatMap(n=>JSON.parse(fs.readFileSync(path.join(out,'组卷数据',n+'.json'),'utf8')).items);
const errors=[],mathErrors=[],papers=[];let totalMath=0;
const ids=new Set();
const required={经典:['力学','电磁学','热学','光学','分析力学','电动力学'],近代:['高等量子力学','量子力学','量子力学','统计物理','统计力学','相对论']};
const scorePlan={经典:[10,10,10,10,30,30],近代:[10,20,20,20,20,10]};
for(const q of items){
 const key=(q.sourceKind==='official'?'official':q.sourceSubject)+'/'+q.sourceId;
 if(ids.has(key))errors.push('跨卷重复来源 '+key);ids.add(key);
 if(q.rubric.reduce((s,r)=>s+r.points,0)!==q.points)errors.push('评分点不符 '+key);
 if(!q.question?.trim()||!q.solution?.trim()||!q.adaptation?.trim())errors.push('缺题干、解答或选编说明 '+key);
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(q.question+q.solution))errors.push('控制字符 '+key);
 if(q.sourceKind==='official'){
  if(!fs.existsSync(path.join(root,q.sourceSubject,'官方题库',q.sourceId+'.png')))errors.push('来源图不存在 '+key);
  const coverage=JSON.parse(fs.readFileSync(path.join(root,q.sourceSubject,'官方题库解答覆盖.json'),'utf8')).items;
  if(coverage.find(i=>i.file===q.sourceId+'.png')?.status!=='solved')errors.push('来源不完整 '+key);
 }else if(q.sourceKind==='supplement'){
  for(const n of ['分层练习题.md','练习详解.md'])if(!fs.readFileSync(path.join(root,q.sourceSubject,n),'utf8').includes(q.sourceId))errors.push('教学补充编号不存在 '+key);
 }else errors.push('未知来源类别 '+key);
}
function md(s,label){
 const tokens=[];
 const math=(tex,display)=>{let html;try{html=katex.renderToString(tex.trim(),{displayMode:display,throwOnError:true,strict:'ignore',output:'htmlAndMathml',trust:false});totalMath++;}catch(e){mathErrors.push({label,tex,error:e.message});html='<code>'+esc(tex)+'</code>';}tokens.push(html);return 'SESSIONMATH'+(tokens.length-1)+'END';};
 s=s.replace(/\$\$([\s\S]*?)\$\$/g,(_,t)=>'\n\n'+math(t,true)+'\n\n').replace(/(?<!\\)\$([^$\n]+?)\$/g,(_,t)=>math(t,false));
 return marked.parse(s,{gfm:true}).replace(/<p>(SESSIONMATH\d+END)<\/p>/g,'$1').replace(/SESSIONMATH(\d+)END/g,(_,i)=>tokens[+i]);
}
fs.copyFileSync(path.join(root,'专项练习卷','练习卷.css'),path.join(out,'练习卷.css'));
function shell(title,body){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="../阅读资源/katex/katex.min.css"><link rel="stylesheet" href="练习卷.css"></head><body><main>${body}</main></body></html>`;}
let index='# 经典与近代分场练习卷\n\n两轮练习，每轮各一张经典卷和一张近代卷，共四张。每张6道大题、100分，建议180分钟；分值和用时为本练习设置。\n\n- **经典卷**：力学、电磁学、热学、光学各10分，分析力学、电动力学各30分。\n- **近代卷**：高等量子力学10分、量子力学两题各20分、统计物理20分、统计力学20分、相对论10分。量子与热统合计80分。\n\n所有解答统一放在全卷题目之后，打印版从新页开始。原题保留来源编号；高等量子力学与相对论采用本库已有教学自编题，明确标为教学补充。\n\n| 轮次 | 经典卷 | 近代卷 | 阅读版 |\n|---|---|---|---|\n';
for(let round=1;round<=2;round++){
 const r=round===1?'第一轮':'第二轮';
 index+=`| ${r} | [PDF](${r}_经典卷.pdf) · [文本](${r}_经典卷.md) | [PDF](${r}_近代卷.pdf) · [文本](${r}_近代卷.md) | [经典](${r}_经典卷.html) · [近代](${r}_近代卷.html) |\n`;
}
for(let paper=1;paper<=4;paper++){
 const round=Math.ceil(paper/2),session=paper%2?'经典':'近代',r=round===1?'第一轮':'第二轮';
 const title=`${r} · ${session}卷`,base=`${r}_${session}卷`;
 const qs=items.filter(q=>q.paper===paper).sort((a,b)=>a.slot-b.slot);
 if(qs.length!==6||qs.map(q=>q.slot).join()!=='1,2,3,4,5,6')errors.push('题号或数量不符 '+paper);
 if(JSON.stringify(qs.map(q=>q.subject))!==JSON.stringify(required[session]))errors.push('分场科目不符 '+paper);
 if(JSON.stringify(qs.map(q=>q.points))!==JSON.stringify(scorePlan[session]))errors.push('分场分值不符 '+paper);
 if(qs.some(q=>q.round!==round||q.session!==session))errors.push('轮次或场次属性不符 '+paper);
 const planned=qs.reduce((s,q)=>s+q.minutes,0);
 if(planned>180)errors.push('建议时间超限 '+paper);
 const subjectLine=session==='经典'?'力学10 · 电磁学10 · 热学10 · 光学10 · 分析力学30 · 电动力学30':'高量10 · 量子20＋20 · 统计物理20 · 统计力学20 · 相对论10';
 const goal=round===1?'恢复基本计算与完整作答步骤。':'综合检查方法选择、边界条件与近似条件。';
 let m=`# ${title}\n\n分场训练｜100分｜建议180分钟\n\n${subjectLine}\n\n${goal}各题建议用时合计${planned}分钟，余时检查。分值、时长为训练设置。先完成全卷，再看后附解答；另备草稿纸。\n\n## 试题\n\n`;
 let h=`<nav class="topnav"><a href="index.html">两轮练习</a> · <a href="${base}.pdf">打印版</a> · <a href="${base}.md">可编辑文本</a> · <a href="#answers">卷后解答</a></nav><div class="eyebrow">${session}物理分场训练</div><h1>${title}</h1><div class="meta"><span>100分</span><span>建议180分钟</span><span>6道大题</span></div><p class="sectionnote">${subjectLine}</p><div class="intro">${goal}<br>各题建议用时合计${planned}分钟，余时检查。先完成全卷，再阅读后附解答；另备草稿纸。</div><p class="sectionnote">题目保留来源编号，重排、节选或教学补充在各题注明。分值、时长为训练设置。</p><table class="scoregrid"><tr><th>题号</th>${qs.map(q=>`<th>${q.slot}</th>`).join('')}<th>合计</th></tr><tr><td>满分</td>${qs.map(q=>`<td>${q.points}</td>`).join('')}<td>100</td></tr><tr><td>得分</td>${qs.map(()=>'<td></td>').join('')}<td></td></tr></table><h2>试题</h2>`;
 for(const q of qs){
  const supplemental=q.sourceKind==='supplement',source=`../${q.sourceSubject}/${supplemental?'分层练习题.md':'官方题库/'+q.sourceId+'.png'}`;
  const sourceHTML=source.replace('.md','.html'),label=supplemental?'教学补充':'题库原题';
  const heading=`第${q.slot}题　${q.title}（${q.points}分）`;
  m+=`### ${heading}\n\n${q.subject}｜建议${q.minutes}分钟｜[${label}：${q.sourceId}](${source})\n\n${q.question.trim()}\n\n*选编说明：${q.adaptation}*\n\n`;
  h+=`<section class="question" id="q${q.slot}"><h3>${heading}</h3><p class="source">${esc(q.subject)} · 建议${q.minutes}分钟 · <a href="${sourceHTML}">${label} ${q.sourceId}</a></p>${md(q.question,`${paper}-${q.slot}-question`)}<p class="source">选编说明：${esc(q.adaptation)}</p><div class="workspace" aria-hidden="true"></div></section>`;
 }
 m+='---\n\n# 参考解答与评分\n\n以下为全卷解答。等价的正确方法同样得分；评分点仅用于自检。\n\n';
 h+='<section class="answers" id="answers"><div class="eyebrow">全卷试题结束 · 以下为解答</div><h2>参考解答与评分</h2><p class="sectionnote">等价的正确方法同样得分。建议评分点用于定位概念、建模和运算中的问题。</p>';
 for(const q of qs){
  m+=`## 第${q.slot}题　${q.title}\n\n${q.solution.trim()}\n\n**建议评分（${q.points}分）**\n\n${q.rubric.map(x=>`- ${x.text}：${x.points}分。`).join('\n')}\n\n**自检：** ${q.checks.join('；')}\n\n`;
  h+=`<article class="answer" id="a${q.slot}"><h3>第${q.slot}题　${esc(q.title)}</h3>${md(q.solution,`${paper}-${q.slot}-solution`)}<div class="rubric"><strong>建议评分 · ${q.points}分</strong>${q.rubric.map(x=>`<p>${esc(x.text)}：${x.points}分</p>`).join('')}</div><div class="check">${md('**自检：** '+q.checks.join('；'),`${paper}-${q.slot}-checks`)}</div></article>`;
 }
 h+='</section>';
 fs.writeFileSync(path.join(out,base+'.md'),m.trim()+'\n');fs.writeFileSync(path.join(out,base+'.html'),shell(title,h));
 papers.push({paper,round,session,title,file:base,questionCount:qs.length,points:qs.reduce((s,q)=>s+q.points,0),plannedMinutes:planned,items:qs.map(q=>({slot:q.slot,subject:q.subject,source:q.sourceSubject+'/'+q.sourceId,sourceKind:q.sourceKind,points:q.points}))});
}
index+='\n## 使用顺序\n\n先完成第一轮经典和近代，再订正并做第二轮。经典卷可先限时完成力、电、热、光四题，把主要复习时间放在分析力学与电动力学；近代卷重点检查两道量子题和两道热统题。\n\n## 选题索引\n\n';
for(const p of papers)index+=`- ${p.title}：${p.items.map(q=>q.source.split('/')[1]+(q.sourceKind==='supplement'?'（教学补充）':'')).join('、')}。\n`;
index+='\n统计物理与统计力学共享原题库，两轮不重复抽取同一原题。旧的[四大力学专项练习卷](../专项练习卷/README.md)继续保留，用于跨科专题训练；本目录按经典、近代分别成卷。\n';
fs.writeFileSync(path.join(out,'README.md'),index);
fs.writeFileSync(path.join(out,'index.html'),shell('经典与近代分场练习卷','<nav class="topnav"><a href="../index.html">返回题库</a></nav>'+md(index,'index')));
const report={papers,questions:items.length,uniqueSources:ids.size,official:items.filter(q=>q.sourceKind==='official').length,supplement:items.filter(q=>q.sourceKind==='supplement').length,totalMath,mathErrors,errors};
fs.writeFileSync(path.join(out,'组卷校核.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({papers:papers.map(({items,...p})=>p),questions:report.questions,official:report.official,supplement:report.supplement,totalMath,mathErrors,errors},null,2));
if(errors.length||mathErrors.length)process.exitCode=1;
