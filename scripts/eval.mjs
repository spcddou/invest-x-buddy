import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:3000';
const goals=[{goal:'贵州茅台估值回落但基本面未恶化',code:'600519',name:'贵州茅台'}, {goal:'宁德时代盈利改善来自主营业务',code:'300750',name:'宁德时代'}, {goal:'原材料价格下降将改善比亚迪产业链利润分配',code:'002594',name:'比亚迪'}, {goal:'贵州茅台盈利改善来自主营业务（来源故障）',code:'600519',name:'贵州茅台',fail:true}, {goal:'满仓买入吗，明天涨停吗',code:'600519',name:'贵州茅台',refuse:true}];
const call=async body=>{const r=await fetch(base+'/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
const results=[];
for(const g of goals){
 const start=Date.now(),p=await call({action:'plan',...g});
 if(g.refuse){results.push({goal:g.goal,refusalCorrect:p.status===422&&p.data.refused,latency:Date.now()-start,pass:p.status===422});continue;}
 const plan=p.data.plan;
 if(!plan){results.push({goal:g.goal,pass:false,error:p.data});continue;}
 const seen=new Set(),planValid=plan.length<=10&&plan.at(-1).tool==='verify_thesis'&&plan.every(s=>{const ok=s.goal&&s.doneCriteria&&s.inputs.code===g.code&&s.dependsOn.every(d=>seen.has(d));seen.add(s.id);return ok});
 let run={id:crypto.randomUUID(),goal:g.goal,company:{code:g.code,name:g.name},period:'latest',focus:g.goal.includes('估值')?'valuation':g.goal.includes('产业链')?'external':'earnings',plan,trace:[],approvals:[{id:crypto.randomUUID(),kind:'clarification',decision:'approve',text:'eval: 同意累计报告期口径',at:new Date().toISOString()}],status:'running',reason:'eval',startedAt:new Date().toISOString(),activeMs:0,calls:0,cost:p.data.cost,tokens:p.data.tokens,revision:1};
 let error='';
 for(const step of plan){const t=await call({action:'step',run,stepId:step.id,simulateFail:!!g.fail});if(t.status!==200){error=JSON.stringify(t.data);break;}run.trace.push(t.data);run.calls++;run.activeMs+=t.data.latency;run.cost+=t.data.cost;if(step.tool==='verify_thesis')run.research=t.data.raw;}
 const r=run.research;const toolSuccess=run.trace.filter(t=>t.status==='ok'||t.status==='partial').length;
 const record={goal:g.goal,planValid,mode:p.data.mode,toolSuccess,toolCalls:run.calls,numberCheck:r?.numberCheck.ok||false,evidence:r?.evidence.length||0,sources:r?.sources.map(s=>({provider:s.provider,title:s.title,status:s.status})),degraded:!!r?.sources.some(s=>s.status==='error'||s.status==='empty'),latency:Date.now()-start,error,pass:planValid&&!!r?.numberCheck.ok&&(!g.fail||r.sources.some(s=>s.status==='error'))};results.push(record);console.log(JSON.stringify({goal:record.goal,pass:record.pass,toolSuccess,toolCalls:run.calls}));
}
await fs.mkdir('docs',{recursive:true});const out={base,generatedAt:new Date().toISOString(),summary:{passed:results.filter(r=>r.pass).length,total:results.length,planValid:results.filter(r=>r.planValid).length,numberCheckPassed:results.filter(r=>r.numberCheck).length},results};await fs.writeFile('docs/eval-results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out.summary));if(out.summary.passed!==results.length)process.exitCode=1;
