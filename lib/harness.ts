import {z} from 'zod';
import {isAdvice} from './engine';
import type {Research,SourceResult} from './types';
export const MAX_STEPS=10;
export const MAX_COST=0.05;
export const MAX_TIME=180000;
const stock=z.object({code:z.string().regex(/^(60\d{4}|68\d{4}|00\d{4}|30\d{4})$/),name:z.string().min(1).max(30)});
export const toolNames=['get_quote','get_kline','get_financials','get_valuation','search_announcements','verify_thesis','compare_entities','memory_read','memory_write'] as const;
export type ToolName=typeof toolNames[number];
export const registry=Object.fromEntries(toolNames.map(name=>[name,{name,permission:name==='memory_write'?'write-memory':'read',cost:0,latency:name==='verify_thesis'?18000:9000,schema:name==='memory_write'?z.object({note:z.string().max(2000)}):name==='memory_read'?z.object({query:z.string().max(200)}):name==='compare_entities'?stock.extend({peer:stock}):stock,description:({get_quote:'扶摇行情快照；公开源分列回退',get_kline:'不复权日线，仅作价格背景',get_financials:'扶摇合并利润表；公开同比补充与分歧核验',get_valuation:'扶摇 TTM / MRQ；公开动态 PE 分列',search_announcements:'iFinD 公告片段；CNINFO 原文入口回退',verify_thesis:'拆解 → 证据 → 数字核验 → 保守结论',compare_entities:'两家公司同口径证据对比',memory_read:'读取当前个人工作区长期笔记',memory_write:'批准后写入长期笔记'})[name]}])) as unknown as Record<ToolName,{name:ToolName;permission:string;cost:number;latency:number;schema:z.ZodType;description:string}>;
export const stepSchema=z.object({id:z.string().min(1).max(40),goal:z.string().min(1).max(300),tool:z.enum(toolNames),inputs:stock,dependsOn:z.array(z.string()).max(10),doneCriteria:z.string().min(1).max(300)});
export type PlanStep=z.infer<typeof stepSchema>;
export type Approval={id:string;kind:'clarification'|'budget'|'conflict'|'memory';decision:'approve'|'edit'|'reject';text:string;at:string};
export type Trace={id:string;stepId:string;tool:string;args:unknown;status:'ok'|'partial'|'error'|'approval';startedAt:string;latency:number;summary:string;sources:SourceResult[];retries:number;cacheHit:boolean;cost:number;tokens:number;raw:unknown};
export type Run={id:string;goal:string;company:{code:string;name:string};period:string;focus:string;plan:PlanStep[];trace:Trace[];approvals:Approval[];status:string;reason:string;research?:Research;startedAt:string;activeMs:number;calls:number;cost:number;tokens:number;revision:number;baseline?:Research;triggerResults?:ReturnType<typeof evaluateTriggers>};
export function makePlan(goal:string,company={code:'600519',name:'贵州茅台'}):PlanStep[]{
 const tools:ToolName[]=['memory_read','get_quote','get_financials',...(/估值|价格/.test(goal)?['get_valuation','get_kline'] as ToolName[]:['search_announcements','get_kline'] as ToolName[]),'verify_thesis'];
 return tools.map((tool,i)=>({id:'step'+(i+1),goal:registry[tool].description,tool,inputs:company,dependsOn:tool==='verify_thesis'?tools.slice(0,i).map((_,j)=>'step'+(j+1)):i===0?[]:['step1'],doneCriteria:tool==='verify_thesis'?'每条结论引用证据；数字核对通过；缺口明确':'取得带来源与时间的响应，或明确记录无法验证'}));
}
export function validatePlan(plan:PlanStep[]){
 const errors:string[]=[];const seen=new Set<string>();
 if(!plan.length||plan.length>MAX_STEPS)errors.push('计划步骤超过预算或为空');
 for(const s of plan){if(!stepSchema.safeParse(s).success)errors.push('步骤格式无效');if(seen.has(s.id))errors.push('步骤 ID 重复');if(s.dependsOn.some(d=>!seen.has(d)))errors.push('依赖必须在当前步骤之前');seen.add(s.id);if(['memory_write','compare_entities'].includes(s.tool))errors.push('该能力需通过专用审批入口调用');}
 if(plan[0]?.tool!=='memory_read')errors.push('必须先读取记忆');
 if(plan.some(s=>isAdvice(s.goal+' '+s.doneCriteria)))errors.push('计划越过研究边界');
 if(plan.slice(0,-1).some(s=>!plan.at(-1)?.dependsOn.includes(s.id)))errors.push('核验步骤必须依赖全部取证步骤');
 if(plan.filter(s=>s.tool==='verify_thesis').length!==1||plan.at(-1)?.tool!=='verify_thesis')errors.push('必须以唯一 verify_thesis 收尾');
 return {ok:!errors.length,errors};
}
export function needsConfirmation(kind:string,approved:boolean){return ['clarification','budget','conflict','memory'].includes(kind)&&!approved}
export function canRunTool(tool:ToolName,approved:boolean){return registry[tool].permission!=='write-memory'||approved}
export function remainingSteps(plan:PlanStep[],trace:{stepId:string;status:string}[]){return plan.filter(s=>!trace.some(t=>t.stepId===s.id&&['ok','partial','error'].includes(t.status)))}
export function stopReason(s:{calls:number;cost:number;elapsed:number;failures:number;stopped:boolean}){
 return s.stopped?'用户停止':s.calls>=MAX_STEPS?'达到最大步骤预算':s.cost>=MAX_COST?'达到最大成本预算':s.elapsed>=MAX_TIME?'达到最大执行时间':s.failures>=3?'连续失败，等待人工修订计划':'';
}
export function compressContext(trace:{id:string;summary:string;raw:unknown}[],budget=1800){
 const before=trace.reduce((n,t)=>n+Math.ceil(JSON.stringify(t.raw).length/2),0);
 let items=trace.map(t=>({pointer:t.id,text:JSON.stringify(t.raw),compressed:false}));
 for(let i=0;i<items.length&&items.reduce((n,t)=>n+Math.ceil(t.text.length/2),0)>budget;i++)items[i]={pointer:trace[i].id,text:trace[i].summary,compressed:true};
 const after=items.reduce((n,t)=>n+Math.ceil(t.text.length/2),0);
 return {before,after,items,budget,overBudget:after>budget};
}
export function evaluateTriggers(before:{metric:string;values:Record<string,number>;period:string;stale?:boolean}[],after:{metric:string;values:Record<string,number>;period:string;stale?:boolean}[]){
 const a=before.find(e=>e.metric==='KCFJCXSYJLRTZ'&&!e.stale),b=after.find(e=>e.metric==='KCFJCXSYJLRTZ'&&!e.stale);
 const x=a?Object.values(a.values)[0]:undefined,y=b?Object.values(b.values)[0]:undefined;
 return [{name:'同口径扣非归母净利润同比穿越零增长线',status:x===undefined||y===undefined?'unknown':(x>=0)!==(y>=0)?'fired':'clear',detail:x===undefined||y===undefined?'缺少可比数据，无法判断':`原值 ${x}% → 新值 ${y}%；报告期 ${a!.period} → ${b!.period}`},{name:'更正公告 / 主营分部因果证据',status:'unknown',detail:'需人工核读新增公告与分部正文；标题检索不能自动判定因果。'}];
}
export const runSchema=z.object({id:z.string().uuid(),goal:z.string().min(4).max(1000),company:stock,period:z.string().max(20),focus:z.enum(['earnings','valuation','external']),plan:z.array(stepSchema).max(10),trace:z.array(z.custom<Trace>()).max(30),approvals:z.array(z.custom<Approval>()).max(50),status:z.string(),reason:z.string(),research:z.custom<Research>().optional(),startedAt:z.string(),activeMs:z.number(),calls:z.number(),cost:z.number(),tokens:z.number(),revision:z.number(),baseline:z.custom<Research>().optional(),triggerResults:z.custom<ReturnType<typeof evaluateTriggers>>().optional()});
export type Workspace={version:2;runs:Run[];notes:{id:string;text:string;at:string;runId:string}[];preferences:{metrics:string};pinned:string[]};
export const workspaceSchema=z.object({version:z.literal(2),runs:z.array(runSchema).max(30),notes:z.array(z.object({id:z.string(),text:z.string().max(3000),at:z.string(),runId:z.string()})).max(50),preferences:z.object({metrics:z.string().max(200)}),pinned:z.array(z.string().max(500)).max(20)});
