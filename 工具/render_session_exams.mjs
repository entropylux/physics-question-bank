import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'分场练习卷');
const check=JSON.parse(fs.readFileSync(path.join(dir,'组卷校核.json'),'utf8'));
const roundArg=process.argv.slice(2).find(a=>a.startsWith('--round='));
const selectedRound=roundArg?Number(roundArg.split('=')[1]):null;
const targetPapers=check.papers.filter(p=>selectedRound===null||p.round===selectedRound);
if(!targetPapers.length)throw Error('未找到指定轮次');
const reportFile=path.join(dir,'打印版校核.json');
const retained=selectedRound!==null&&fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile,'utf8')).outputs.filter(p=>p.round!==selectedRound):[];
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true});
const outputs=[...retained];
try{
 for(const paper of targetPapers){
  const page=await browser.newPage({viewport:{width:673,height:900},deviceScaleFactor:1});
  const failures=[];page.on('requestfailed',r=>failures.push(r.url()));
  await page.goto(pathToFileURL(path.join(dir,paper.file+'.html')).href,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);await page.emulateMedia({media:'print'});
  const qa=await page.evaluate(()=>({
   questions:document.querySelectorAll('.question').length,answers:document.querySelectorAll('.answer').length,
   answerAfterAllQuestions:!!(document.querySelector('#q6')?.compareDocumentPosition(document.querySelector('#answers'))&Node.DOCUMENT_POSITION_FOLLOWING),
   mathErrors:document.querySelectorAll('.katex-error').length,
   overflowingMath:[...document.querySelectorAll('.katex-display')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.querySelector('annotation')?.textContent||e.textContent.slice(0,100)),
   brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),
   answerPageBreak:getComputedStyle(document.querySelector('.answers')).breakBefore
  }));
  if(qa.questions!==6||qa.answers!==6||!qa.answerAfterAllQuestions||qa.mathErrors||qa.overflowingMath.length||qa.brokenImages.length||failures.length||qa.answerPageBreak!=='page')throw Error(JSON.stringify({paper:paper.paper,qa,failures}));
  await page.evaluate(()=>document.querySelectorAll('a[href]').forEach(a=>a.removeAttribute('href')));
  await page.pdf({path:path.join(dir,paper.file+'.pdf'),preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:`<div style="width:100%;text-align:center;font-size:8px;color:#666;font-family:Arial">第 ${paper.round} 轮 · ${paper.session}卷 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`});
  outputs.push({paper:paper.paper,round:paper.round,session:paper.session,pdf:paper.file+'.pdf',bytes:fs.statSync(path.join(dir,paper.file+'.pdf')).size,...qa,failedResources:failures});
  await page.close();
 }
}finally{await browser.close();}
outputs.sort((a,b)=>a.paper-b.paper);
fs.writeFileSync(reportFile,JSON.stringify({outputs},null,2)+'\n');console.log(JSON.stringify(outputs.filter(p=>selectedRound===null||p.round===selectedRound),null,2));
