import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'专项练习卷');
const require=createRequire(import.meta.url);
const katex=require(path.join(root,'阅读资源/katex/katex.js'));
const {marked}=require("marked");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles=['基础框架与基本计算','近似方法与热力学势','角动量与量子统计','综合检验与系综联系'];
const goals=[
 '熟悉态、测量、散射与正则系综的基本计算，建立完整作答流程。',
 '集中训练微扰、变分和含时跃迁，并连接巨正则系综、热力学势与平衡条件。',
 '处理角动量、全同粒子、费米与玻色系统，把微观计数与宏观响应联系起来。',
 '独立完成综合计算，检查方法选择、边界条件与近似适用范围。'
];
const items=['量子','热统','分析','电动'].flatMap(n=>JSON.parse(fs.readFileSync(path.join(out,'组卷数据',n+'.json'),'utf8')).items);
const errors=[],mathErrors=[],report=[];let totalMath=0;
const ids=new Set();
for(const q of items){
 const key=q.sourceSubject+'/'+q.sourceId;
 if(ids.has(key))errors.push('重复原题 '+key);ids.add(key);
 if(q.rubric.reduce((s,r)=>s+r.points,0)!==q.points)errors.push('评分点总分不符 '+key);
 if(!q.question?.trim()||!q.solution?.trim())errors.push('缺题干/解答 '+key);
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(q.question+q.solution))errors.push('控制字符 '+key);
 if(!fs.existsSync(path.join(root,q.sourceSubject,'官方题库',q.sourceId+'.png')))errors.push('原图不存在 '+key);
 const coverage=JSON.parse(fs.readFileSync(path.join(root,q.sourceSubject,'官方题库解答覆盖.json'),'utf8')).items;
 if(coverage.find(i=>i.file===q.sourceId+'.png')?.status!=='solved')errors.push('原题不是完整可解条目 '+key);
}
function md(s,label){
 const tokens=[];
 function math(tex,display){let h;try{h=katex.renderToString(tex.trim(),{displayMode:display,throwOnError:true,strict:'ignore',output:'htmlAndMathml',trust:false});totalMath++;}catch(e){mathErrors.push({label,tex,error:e.message});h='<code>'+esc(tex)+'</code>';}tokens.push(h);return 'EXAMMATH'+(tokens.length-1)+'END';}
 s=s.replace(/\$\$([\s\S]*?)\$\$/g,(_,t)=>'\n\n'+math(t,true)+'\n\n').replace(/(?<!\\)\$([^$\n]+?)\$/g,(_,t)=>math(t,false));
 return marked.parse(s,{gfm:true}).replace(/<p>(EXAMMATH\d+END)<\/p>/g,'$1').replace(/EXAMMATH(\d+)END/g,(_,i)=>tokens[+i]);
}
const css=`:root{--ink:#172d37;--accent:#126960;--line:#d5e0dc}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eef3f1;font:16px/1.8 'Microsoft YaHei',system-ui,sans-serif}main{max-width:940px;margin:28px auto;background:#fff;padding:44px 55px;border:1px solid var(--line)}h1{font-size:30px;line-height:1.45;margin:10px 0 18px}h2{font-size:23px;border-bottom:2px solid var(--accent);padding-bottom:8px;margin:25px 0 18px}h3{font-size:19px;line-height:1.5;margin:24px 0 12px}h4{font-size:16px;margin:20px 0 8px}p{margin:10px 0}a{color:var(--accent)}.eyebrow{font-size:13px;letter-spacing:.1em;color:var(--accent);font-weight:700}.meta{display:flex;gap:15px;flex-wrap:wrap;font-size:14px}.intro{padding:15px 18px;background:#f0f6f3;border-left:4px solid var(--accent);margin:20px 0}.source{font-size:12px;color:#576b70;margin:5px 0 14px}.question{margin:24px 0 34px;padding-bottom:14px;border-bottom:1px solid var(--line)}.workspace{height:18mm;border-bottom:1px dotted #c9d4cf}.answers{margin-top:60px;padding-top:30px;border-top:5px solid var(--accent)}.answer{margin:25px 0 40px}.rubric{background:#f6f8f7;padding:12px 16px;font-size:13px;margin-top:20px}.rubric p{margin:3px 0}.check{font-size:13px;color:#3c5759}.answer:last-child .rubric strong{display:block}.answer:last-child .rubric p{display:inline}.answer:last-child .rubric p::after{content:"； "}.answer:last-child .rubric p:last-child::after{content:"。"}table{border-collapse:collapse;width:100%;font-size:14px;margin:15px 0}td,th{padding:8px 10px;border:1px solid var(--line);text-align:left}th{background:#f0f5f2}.katex{font-size:1.04em}.katex-display{overflow-x:auto;overflow-y:hidden;padding:6px 0;margin:14px 0!important}ol,ul{padding-left:24px}li{margin:5px 0}.topnav{font-size:14px;padding:15px 0;border-bottom:1px solid var(--line)}.scoregrid td{height:35px}.sectionnote{font-size:14px;color:#526b6b}img,svg{max-width:100%;height:auto}svg{break-inside:avoid}@media(max-width:720px){main{margin:0;padding:25px 20px}h1{font-size:25px}}@page{size:A4;margin:16mm 16mm 18mm}@media print{body{background:#fff;font-size:10.5pt;line-height:1.65;color:#111}main{max-width:none;margin:0;padding:0;border:0}.topnav,.screenonly{display:none}h1{font-size:22pt}h2{font-size:16pt;margin:16pt 0 12pt}h3{font-size:12.5pt;margin:16pt 0 9pt}h4{font-size:11pt}p{margin:7pt 0}h1,h2,h3,h4{break-after:avoid}li,p{orphans:3;widows:3}.question{break-inside:avoid;margin:14pt 0 20pt;padding-bottom:9pt}.answers{break-before:page;margin-top:0;padding-top:0;border-top:0}.answer{margin:15pt 0 24pt}.rubric,.check,.katex-display,table{break-inside:avoid}.katex-display{overflow:visible;padding:3pt 0;margin:9pt 0!important}.source{font-size:8pt;color:#444}.meta,.sectionnote{font-size:9pt}.intro{padding:9pt 12pt;margin:12pt 0}.workspace{height:14mm}.rubric{font-size:9pt}.check{font-size:9pt}a{color:inherit;text-decoration:none}.eyebrow{font-size:9pt}table{font-size:9pt}.answer:last-child p{margin:5pt 0}.answer:last-child .katex-display{margin:7pt 0!important}.answer:last-child .rubric{margin-top:12pt}}
`;
fs.writeFileSync(path.join(out,'练习卷.css'),css);
function shell(title,body){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="../阅读资源/katex/katex.min.css"><link rel="stylesheet" href="练习卷.css"></head><body><main>${body}</main></body></html>`;}
let indexMD='# 四大力学专项练习卷\n\n围绕四大力学开展综合练习，重点训练量子力学与热力学统计物理。全部选自本题库，中文重排及节选说明见各题来源；不是官方模拟命题或考试题量预测。\n\n每套7题、100分、建议180分钟。量子3题45分，热统2题35分，分析力学1题10分，电动力学1题10分。量子与热统合计80分；四套原题不重复。每套均先给出全部题目，再换页附完整解答和建议评分点。\n\n';
indexMD+='| 练习卷 | 学习重点 | 打印版 | 离线阅读 | 可编辑文本 |\n|---|---|---|---|---|\n';
for(let paper=1;paper<=4;paper++){
 const qs=items.filter(q=>q.paper===paper).sort((a,b)=>a.slot-b.slot);
 const sum=qs.reduce((s,q)=>s+q.points,0);
 if(qs.length!==7||sum!==100||qs.map(q=>q.slot).join()!=='1,2,3,4,5,6,7')errors.push('组卷结构错误 '+paper);
 const base=`第${paper}套_${titles[paper-1]}`,title=`第${paper}套 · ${titles[paper-1]}`;
 const planned=qs.reduce((s,q)=>s+q.minutes,0);
 let m=`# ${title}\n\n四大力学专项训练｜100分｜建议180分钟\n\n${goals[paper-1]}\n\n量子45分，热统35分，分析力学10分，电动力学10分。建议各题用时合计${planned}分钟，余时用于检查；可按学习进度分两次完成。题目选自本题库，中文重排和节选说明附在各题下。这里的分值、时长和组合是练习设置。\n\n先完成全卷，再看后附解答。另备草稿纸。\n\n## 试题\n\n`;
 let h=`<nav class="topnav"><a href="index.html">全部练习卷</a> · <a href="${base}.pdf">下载打印版</a> · <a href="${base}.md">可编辑文本</a> · <a href="#answers">卷后解答</a></nav><div class="eyebrow">四大力学专项训练</div><h1>${title}</h1><div class="meta"><span>100分</span><span>建议180分钟</span><span>量子45 · 热统35 · 分析10 · 电动10</span></div><div class="intro">${goals[paper-1]}<br>建议各题用时合计${planned}分钟，余时检查。先完成全卷，再阅读后附解答；另备草稿纸。</div><p class="sectionnote">题目来自本题库，已中文重排；节选、补充条件和单位约定在来源处说明。分值、时长和组合均为训练设置。</p><table class="scoregrid"><tr><th>题号</th>${qs.map(q=>`<th>${q.slot}</th>`).join('')}<th>合计</th></tr><tr><td>满分</td>${qs.map(q=>`<td>${q.points}</td>`).join('')}<td>100</td></tr><tr><td>得分</td>${qs.map(()=>'<td></td>').join('')}<td></td></tr></table><h2>试题</h2>`;
 for(const q of qs){
  const source=`../${q.sourceSubject}/官方题库/${q.sourceId}.png`;
  const heading=`第${q.slot}题　${q.title}（${q.points}分）`;
  m+=`### ${heading}\n\n${q.subject}｜建议${q.minutes}分钟｜[来源：${q.sourceId}](${source})\n\n${q.question.trim()}\n\n*组卷说明：${q.adaptation}*\n\n`;
  h+=`<section class="question" id="q${q.slot}"><h3>${heading}</h3><p class="source">${esc(q.subject)} · 建议${q.minutes}分钟 · <a href="${source}">原题 ${q.sourceId}</a></p>${md(q.question,`${paper}-${q.slot}-question`)}<p class="source">组卷说明：${esc(q.adaptation)}</p><div class="workspace" aria-hidden="true"></div></section>`;
 }
 m+='---\n\n# 参考解答与评分\n\n以下为全卷解答。等价的正确方法同样得分；评分点仅用于自检。\n\n';
 h+='<section class="answers" id="answers"><div class="eyebrow">全卷试题结束 · 以下为解答</div><h2>参考解答与评分</h2><p class="sectionnote">等价的正确方法同样得分。建议评分点用于定位概念、建模和运算中的问题。</p>';
 for(const q of qs){
  m+=`## 第${q.slot}题　${q.title}\n\n${q.solution.trim()}\n\n**建议评分（${q.points}分）**\n\n${q.rubric.map(r=>`- ${r.text}：${r.points}分。`).join('\n')}\n\n**自检：** ${q.checks.join('；')}\n\n`;
  h+=`<article class="answer" id="a${q.slot}"><h3>第${q.slot}题　${esc(q.title)}</h3>${md(q.solution,`${paper}-${q.slot}-solution`)}<div class="rubric"><strong>建议评分 · ${q.points}分</strong>${q.rubric.map(r=>`<p>${esc(r.text)}：${r.points}分</p>`).join('')}</div><div class="check">${md('**自检：** '+q.checks.join('；'),`${paper}-${q.slot}-checks`)}</div></article>`;
 }
 h+='</section>';
 fs.writeFileSync(path.join(out,base+'.md'),m.trim()+'\n');fs.writeFileSync(path.join(out,base+'.html'),shell(title,h));
 indexMD+=`| 第${paper}套 | ${titles[paper-1]} | [PDF](${base}.pdf) | [打开](${base}.html) | [Markdown](${base}.md) |\n`;
 report.push({paper,title,file:base,questionCount:qs.length,points:sum,plannedMinutes:planned,items:qs.map(q=>({slot:q.slot,source:q.sourceSubject+'/'+q.sourceId,points:q.points}))});
}
indexMD+='\n## 使用顺序\n\n先按1→2→3→4完成；每套可先做量子3题，再做热统2题与分析、电动各1题。前两套允许订正后重做，最后一套建议一次闭卷完成。题后答案附在整张卷子后面，不与题目交错。\n\n订正时记录：是否能独立选择方法、关键方程是否写全、数学运算卡在哪里、是否完成归一化/量纲/极限检查。隔天先重做算错而思路正确的题，再补概念缺口。\n\n## 选题索引\n\n';
for(const p of report)indexMD+=`- 第${p.paper}套：${p.items.map(q=>q.source.split('/')[1]).join('、')}。\n`;
indexMD+='\n电动力学按平面波和界面问题选题，部分题原存于电磁学、光学文件夹；其原题编号与来源保持可追溯。统计物理与统计力学按同一个题库计数，没有重复抽题。\n';
fs.writeFileSync(path.join(out,'README.md'),indexMD);
fs.writeFileSync(path.join(out,'index.html'),shell('四大力学专项练习卷','<nav class="topnav"><a href="../index.html">返回总首页</a></nav>'+md(indexMD.replaceAll('.md)', '.md)'), 'index')));
const checks={papers:report,uniqueSources:ids.size,questions:items.length,totalMath,mathErrors,errors};
fs.writeFileSync(path.join(out,'组卷校核.json'),JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify({papers:report.map(p=>({paper:p.paper,questions:p.questionCount,points:p.points,plannedMinutes:p.plannedMinutes})),uniqueSources:ids.size,totalMath,mathErrors,errors},null,2));
if(errors.length||mathErrors.length)process.exitCode=1;
