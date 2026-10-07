import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const katex=require(path.join(root,'阅读资源','katex','katex.js'));
const {marked}=require("marked");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const subjects=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^\d\d_/.test(d.name)).map(d=>d.name).sort();
const mathErrors=[]; const stats=[]; let totalMath=0;
const css=`:root{color-scheme:light;--ink:#172c36;--muted:#57676b;--accent:#006b69;--paper:#fff;--bg:#f2f5f3;--line:#d9e3de}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,'Microsoft YaHei',sans-serif;font-size:17px;line-height:1.85}a{color:var(--accent);text-underline-offset:3px}a:hover{color:#003e4b}header{background:#163b43;color:#fff;padding:18px max(24px,calc((100vw - 1240px)/2));line-height:1.6}header a{color:#def1e7;text-decoration:none}header small{display:block;color:#c8d8d7;margin-top:5px}nav.top{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;font-size:15px}.layout{max-width:1240px;margin:30px auto;display:grid;grid-template-columns:245px minmax(0,1fr);gap:26px;padding:0 20px}aside{align-self:start;position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto;font-size:14px;line-height:1.7}aside a{display:block;padding:5px 8px;border-left:2px solid var(--line);text-decoration:none}main{min-width:0;background:var(--paper);padding:36px 44px;border:1px solid var(--line);border-radius:10px;overflow-wrap:break-word}main img{max-width:100%;height:auto}h1{font-size:30px;line-height:1.45;letter-spacing:.02em;margin:0 0 24px}h2{font-size:23px;line-height:1.55;margin:42px 0 18px;padding-bottom:8px;border-bottom:1px solid var(--line);scroll-margin-top:20px}h3{font-size:19px;margin-top:28px;scroll-margin-top:20px}p{margin:15px 0}li{margin:7px 0}table{border-collapse:collapse;width:100%;font-size:15px;margin:22px 0}td,th{border:1px solid var(--line);padding:11px 13px;text-align:left;vertical-align:top}th{background:#ecf4ef}blockquote{border-left:4px solid #6ba99d;margin:20px 0;padding:3px 20px;background:#f3f8f5}.katex{font-size:1.08em}.katex-display{overflow-x:auto;overflow-y:hidden;padding:10px 0;margin:18px 0!important}code{font-size:.9em;background:#f1f4f2;padding:2px 5px;border-radius:3px}pre{overflow:auto;background:#f1f4f2;padding:18px}footer{font-size:13px;color:var(--muted);margin-top:40px;padding-top:18px;border-top:1px solid var(--line)}.wide{max-width:1200px;margin:30px auto;padding:32px}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{border:1px solid var(--line);border-radius:8px;padding:22px;background:#fff}.card h2{margin:0 0 10px;font-size:22px;border:0;padding:0}.card p{font-size:15px;color:var(--muted);margin:10px 0}.links{display:flex;gap:12px;flex-wrap:wrap;font-size:15px}.badge{display:inline-block;background:#e8f1eb;padding:3px 10px;border-radius:20px;font-size:13px;color:#21574c}.intro{background:#e9f1ec;border-radius:8px;padding:20px 24px;margin:20px 0 28px}.bank{margin:15px 0;border:1px solid var(--line);border-radius:7px;padding:12px 16px}.bank summary{cursor:pointer;font-weight:600}.bank img{display:block;width:100%;height:auto;margin-top:16px}.bank small{font-weight:400;color:var(--muted);margin-left:15px}.search{width:100%;padding:13px 15px;border:1px solid #b5c8be;border-radius:6px;font:inherit;margin:16px 0}button{border:1px solid #92aaa0;border-radius:5px;background:white;color:var(--accent);padding:9px 14px;font:inherit;font-size:14px;cursor:pointer;margin-right:8px}.empty{padding:25px;background:#f4f7f4;border:1px solid var(--line)}.source{font-size:14px;color:var(--muted)}@media(max-width:850px){.layout{display:block;margin:16px auto;padding:0 12px}aside{position:static;max-height:220px;margin-bottom:18px}main{padding:24px 20px}.cards{grid-template-columns:1fr}.wide{padding:20px;margin:15px 10px}h1{font-size:25px}h2{font-size:21px}table{display:block;overflow-x:auto}header{padding:16px 22px}}@media print{body{background:white;font-size:11pt}header,aside,nav.top,.search,button{display:none}.layout{display:block;margin:0;padding:0}main,.wide{border:0;padding:0;margin:0;border-radius:0;max-width:none}.katex-display{overflow:visible}a{color:inherit;text-decoration:none}h2,h3{break-after:avoid}.card,figure{break-inside:avoid}details{break-inside:avoid}footer{font-size:9pt}}`;
fs.writeFileSync(path.join(root,'阅读资源','reading.css'),css);

function shell(title,content,{prefix='../',toc='',subject='',source=''}={}){
 const official=subject&&fs.existsSync(path.join(root,subject,'官方题库解答.md'));
 const nav=subject?`<nav class="top"><a href="index.html">本科目</a><a href="知识点讲义.html">讲义</a><a href="分层练习题.html">练习</a><a href="练习详解.html">详解</a><a href="题库浏览.html">原题库</a>${official?'<a href="官方题库解答.html">原题逐题解答</a>':''}</nav>`:'';
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · 物理题库</title><link rel="stylesheet" href="${prefix}阅读资源/katex/katex.min.css"><link rel="stylesheet" href="${prefix}阅读资源/reading.css"></head><body><header><a href="${prefix}index.html">物理题库 · 分科讲义与题库</a><small>${subject?esc(subject.replace(/^\d+_/,'')):'从概念、推导与例题开始学习'}</small>${nav}</header>${toc?`<div class="layout"><aside aria-label="目录">${toc}</aside><main>${content}`:`<main class="wide">${content}`}<footer>原题库与教学自编题分别保存。${source?` <a href="${esc(source)}">查看可编辑文本</a>`:''}<br>公式与字体保存在本地，可离线阅读。浏览器打印可保存为PDF。</footer></main>${toc?'</div>':''}</body></html>`;
}
function renderMD(file,prefix='../',subject=''){
 let md=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
 md=md.replace(/<a name="q-[12]-[1-6]T\d+"><\/a>/g,'');
 const tokens=[];
 function math(tex,display){
   const key=`MATHPLACEHOLDER${tokens.length}END`;
   let html;
   try{ html=katex.renderToString(tex.trim(),{displayMode:display,throwOnError:true,strict:'ignore',output:'htmlAndMathml',trust:false});totalMath++; }
   catch(e){mathErrors.push({file:path.relative(root,file),tex:tex.slice(0,200),error:e.message});html=`<code>${esc(tex)}</code>`;}
   tokens.push(html);return key;
 }
 md=md.replace(/\$\$([\s\S]*?)\$\$/g,(_,t)=>'\n\n'+math(t,true)+'\n\n');
 md=md.replace(/(?<!\\)\$([^$\n]+?)\$/g,(_,t)=>math(t,false));
 let html=marked.parse(md,{gfm:true});
 html=html.replace(/<p>(MATHPLACEHOLDER\d+END)<\/p>/g,'$1').replace(/MATHPLACEHOLDER(\d+)END/g,(_,n)=>tokens[+n]);
 html=html.replace(/href="([^"#]+)\.md(#[^"]*)?"/g,(_,a,b)=>`href="${a}.html${b||''}"`);
 const toc=[];let heading=0;
 html=html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g,(_,level,text)=>{let id=text.match(/^([12]-[1-6]T\d+)/)?.[1];id=id?'q-'+id:`section-${++heading}`;if(level==='2')toc.push(`<a href="#${id}">${text.replace(/<[^>]+>/g,'')}</a>`);return `<h${level} id="${id}">${text}</h${level}>`;});
 const title=md.match(/^# (.+)/m)?.[1]||path.basename(file,'.md');
 const out=file.replace(/\.md$/,'.html');
 fs.writeFileSync(out,shell(title,html,{prefix,toc:toc.join(''),subject,source:path.basename(file)}));
 return {file:path.relative(root,file),chars:fs.readFileSync(file,'utf8').length,math:tokens.length};
}
const descriptions={
 '01_力学':'从受力和运动出发，连接守恒律、刚体、振动与非惯性系。',
 '02_分析力学':'用广义坐标、变分原理与哈密顿方法组织运动方程。',
 '03_电磁学':'从场与势建立静电、磁场、感应、电路和能量的联系。',
 '04_电动力学':'今年重点：平面电磁波，介质界面反射折射，菲涅耳公式与全反射。',
 '05_热学':'从状态、功热与熵出发，学习过程、热机、热力学势和相变。',
 '06_光学':'今年重点：菲涅尔衍射、半波带、傅里叶变换与透镜焦面。',
 '07_高等量子力学':'教学补充：多粒子算符、密度矩阵、相互作用表象、散射与相对论量子方程。',
 '08_量子力学':'邮件标注2题。从态和测量到势阱、谐振子、角动量和近似方法。',
 '09_统计物理':'今年重点：玻尔兹曼、费米、玻色统计及其与热力学的联系。',
 '10_统计力学':'以系综、配分函数、热力学推导和涨落组织学习。与统计物理共用原题库。',
 '11_相对论':'大学物理层次的狭义相对论：时空变换、固有时、四动量与碰撞。'
};
const cards=[];let originalCopies=0,unique=0,totalQuestions=0;
for(const subject of subjects){
 const dir=path.join(root,subject);
 const core=['知识点讲义.md','分层练习题.md','练习详解.md'];
 const exists=core.every(n=>fs.existsSync(path.join(dir,n)));
 const localStats=[];
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.md')&&!n.includes('校核'))){localStats.push(renderMD(path.join(dir,name),'../',subject));}
 const bankPath=path.join(dir,'官方题库','文件清单.json');
 const bank=fs.existsSync(bankPath)?JSON.parse(fs.readFileSync(bankPath,'utf8')):null;
 const count=bank?.files?.length||0; originalCopies+=count;if(!subject.startsWith('10_'))unique+=count;
 const qtext=fs.existsSync(path.join(dir,'分层练习题.md'))?fs.readFileSync(path.join(dir,'分层练习题.md'),'utf8'):'';
 const qcount=(qtext.match(/^#{2,3}\s+[A-Z]{1,3}-?\d{2}\b/gm)||[]).length; totalQuestions+=qcount;
 const bankLabel=count?`${count}张原题图`:'邮件未提供题库链接';
 const guide=fs.existsSync(path.join(dir,'官方题库导读.md'));
 const answers=fs.existsSync(path.join(dir,'官方题库解答.md'));
 const coverageFile=path.join(dir,'官方题库解答覆盖.json');
 const coverage=fs.existsSync(coverageFile)?JSON.parse(fs.readFileSync(coverageFile,'utf8')).items:[];
 const coverageMap=new Map(coverage.map(i=>[i.file,i]));
 const answerLink=f=>answers?`<a href="官方题库解答.html#q-${esc(f.name.replace(/\.png$/, ''))}">${coverageMap.get(f.name)?.status==='source_incomplete'?'题面缺项说明':'查看逐题解答'}</a>`:'';
 let bankBody=`<h1>${esc(subject.replace(/^\d+_/,''))}题库浏览</h1>`;
 if(bank){
   bankBody+=`<p class="source">来源：<a href="${bank.source_url}">资料来源</a> · 2026年10月7日保存 · ${count}张原图，按文件编号排序。${/^(09|10)_/.test(subject)?"统计物理与统计力学的49张图属于同一份题库。":""}</p><p>这里保存题库原图，保留原图中的题号、图示及已有解答。原图可能收录外校或教材题；本材料的教学自编题另放在“练习”中。</p>${guide?'<p><a href="官方题库导读.html">先读代表题导读与知识点对应</a></p>':''}<input class="search" id="search" aria-label="按文件题号查找" placeholder="输入题号，例如 T10 或 1038"><p><button id="expand">展开可见原图</button><button id="collapse">收起全部</button></p>`;
   for(const f of bank.files)bankBody+=`<details class="bank" data-name="${esc(f.name.toLowerCase())}"><summary>${esc(f.name)}<small>${Math.round(f.size/1024)} KB</small></summary><p class="source"><a href="官方题库/${encodeURIComponent(f.name)}" target="_blank">打开原尺寸图片</a> · ${answerLink(f)}</p><img src="官方题库/${encodeURIComponent(f.name)}" alt="${esc(f.name)} 题库原图" loading="lazy"></details>`;
   bankBody+=`<script>document.getElementById('search').addEventListener('input',e=>{let q=e.target.value.toLowerCase().trim();document.querySelectorAll('.bank').forEach(d=>d.hidden=!d.dataset.name.includes(q));});document.getElementById('expand').onclick=()=>document.querySelectorAll('.bank:not([hidden])').forEach(d=>d.open=true);document.getElementById('collapse').onclick=()=>document.querySelectorAll('.bank').forEach(d=>d.open=false);</script>`;
   let indexMD=`# ${subject.replace(/^\d+_/,'')}题库索引\n\n来源：[资料来源](${bank.source_url})。保存日期2026年10月7日，共${count}张原图。以原文件名为索引，不重新编号。\n\n`;
   indexMD+=bank.files.map(f=>`- [${f.name}](官方题库/${f.name})${answers?` · [${coverageMap.get(f.name)?.status==='source_incomplete'?'题面缺项说明':'逐题解答'}](官方题库解答.md#q-${f.name.replace(/\.png$/,'')})`:''}`).join('\n');
   fs.writeFileSync(path.join(dir,'题库索引.md'),indexMD);renderMD(path.join(dir,'题库索引.md'),'../',subject);
 } else bankBody+='<div class="empty"><p>本学科提供12道教学自编题和逐题详解，用于课程基础训练；它们不代表官方原题。</p><p><a href="分层练习题.html">开始分层练习</a> · <a href="练习详解.html">查看详解</a></p></div>';
 fs.writeFileSync(path.join(dir,'题库浏览.html'),shell(subject+'题库',bankBody,{subject}));
 const links=`<div class="links"><a href="知识点讲义.html">知识点讲义</a><a href="分层练习题.html">分层练习题</a><a href="练习详解.html">练习详解</a><a href="题库浏览.html">题库浏览</a>${answers?'<a href="官方题库解答.html">原题逐题解答</a>':''}${guide?'<a href="官方题库导读.html">原题导读</a>':''}</div>`;
 const localIndex=`<h1>${esc(subject.replace(/^\d+_/,''))}</h1><p>${esc(descriptions[subject])}</p><div class="intro"><span class="badge">${qcount}道教学自编题与详解</span> <span class="badge">${bankLabel}</span><p>学习顺序：读讲义中的概念与例题 → 独立完成分层练习 → 对照详解 → 独立做官方题库 → 按原文件题号查逐题解答。</p>${links}</div><h2>本文件夹里有什么</h2><ul><li>知识点讲义：从概念和所需数学出发，解释关键公式、推导、适用条件与例题。</li><li>分层练习题：题目与答案分开，便于独立练习。</li><li>练习详解：同题号逐题解答，说明建模和检查方法。</li>${answers?'<li>官方题库解答：按原题图文件名逐条推导，保留小问与条件说明；题面缺项另行标注。</li>':''}<li>官方题库：原始图片、来源目录快照及文件清单。${count?'共'+count+'张。':'该科提供教学自编练习。'}</li></ul><p>可编辑的Markdown文本与HTML阅读版同目录保存。</p>`;
 fs.writeFileSync(path.join(dir,'index.html'),shell(subject,localIndex,{subject}));
 cards.push(`<section class="card"><h2><a href="${subject}/index.html">${esc(subject.replace('_',' '))}</a></h2><p>${esc(descriptions[subject])}</p><p><span class="badge">${qcount}道自编题</span> <span class="badge">${bankLabel}</span></p><div class="links"><a href="${subject}/知识点讲义.html">讲义</a><a href="${subject}/分层练习题.html">练习</a><a href="${subject}/练习详解.html">详解</a><a href="${subject}/题库浏览.html">原题库</a>${answers?`<a href="${subject}/官方题库解答.html">原题逐题解答</a>`:''}</div></section>`);
 stats.push({subject,complete:exists,questions:qcount,originalImages:count,officialCoverage:coverage.reduce((a,i)=>(a[i.status]=(a[i.status]||0)+1,a),{}),documents:localStats});
}
for(const n of ['使用说明.md','官方题库解答总览.md'])if(fs.existsSync(path.join(root,n)))renderMD(path.join(root,n),'');
const intro=`<h1>物理题库与解答</h1><p>按课程组织知识点、练习与逐题推导，适合本科物理学习、自测和复习。</p><div class="intro"><strong>11门科目 · ${totalQuestions}道教学自编题及详解 · ${unique}个原题图条目</strong><p>保留原题图片和逐题解答，配套4套四大力学练习卷。统计物理与统计力学共享原题库。</p><div class="links"><a href="使用说明.html">阅读说明与学习路线</a><a href="官方题库解答总览.html">原题解答与缺项清单</a><a href="专项练习卷/index.html">四大力学专项练习卷</a></div></div><div class="cards">${cards.join('')}</div>`;
fs.writeFileSync(path.join(root,'index.html'),shell('分科讲义与题库',intro,{prefix:''}));
const report={subjects:stats.length,totalQuestions,uniqueOriginalImages:unique,originalImageCopies:originalCopies,totalMath,mathErrors,subjectsDetail:stats};
fs.writeFileSync(path.join(root,'排版核查.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({subjects:stats.length,complete:stats.filter(s=>s.complete).length,totalQuestions,uniqueOriginalImages:unique,originalImageCopies:originalCopies,totalMath,mathErrors},null,2));
if(mathErrors.length)process.exitCode=1;
