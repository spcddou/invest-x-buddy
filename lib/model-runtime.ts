import {createOpenAI} from '@ai-sdk/openai';
import {z} from 'zod';
import {MODELS,DEFAULT_MODEL} from './model-settings';
import {redactSecrets} from './privacy';
export const gatewayModel=process.env.AI_GATEWAY_MODEL||'openai/gpt-5-mini';
export const aiEnabled=()=>Boolean(process.env.VERCEL||process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN);
export const resolveModel=(userKey:boolean,gateway:boolean,local=false)=>userKey?'byok':local?'codex-cli':gateway?'gateway':'rules';
export type RequestAI={model:ReturnType<ReturnType<typeof createOpenAI>['chat']>|string|null;label:string;reason:string};
const credentials=z.object({key:z.string().regex(/^sk-[A-Za-z0-9_-]{8,}$/).max(512),model:z.enum(MODELS)});
export function requestAI(req?:Request):RequestAI{
 const key=req?.headers.get('x-openai-key')||'';
 const kind=resolveModel(Boolean(key),aiEnabled(),process.env.LLM_PROVIDER==='codex-cli');
 if(kind==='codex-cli'){
  const local=req&&['localhost','127.0.0.1','[::1]'].includes(new URL(req.url).hostname);
  if(!local||process.env.VERCEL||process.env.VERCEL_ENV||process.env.DEPLOYMENT_ENV==='production')return {model:null,label:'规则回退',reason:'Codex CLI 仅限本地，拒绝托管生产环境；已切换规则回退'};
  return {model:'codex-cli',label:'真实模型 (Codex CLI · 本地)',reason:''};
 }
 if(kind==='byok'){
  const parsed=credentials.safeParse({key,model:req?.headers.get('x-openai-model')||DEFAULT_MODEL});
  if(!parsed.success)return {model:null,label:'OpenAI BYOK',reason:'用户 key 或模型格式无效，已切换规则回退'};
  // Loopback override is solely for the local SDK integration test. Production is fixed to OpenAI.
  const mock=process.env.NODE_ENV!=='production'&&/^http:\/\/127\.0\.0\.1:\d+\/v1$/.test(process.env.BYOK_TEST_BASE_URL||'')?process.env.BYOK_TEST_BASE_URL:undefined;
  return {model:createOpenAI({apiKey:parsed.data.key,baseURL:mock||'https://api.openai.com/v1'}).chat(parsed.data.model),label:`真实模型 (${parsed.data.model}) · BYOK`,reason:''};
 }
 return kind==='gateway'?{model:gatewayModel,label:`真实模型 (${gatewayModel}) · Gateway`,reason:''}:{model:null,label:'规则回退',reason:'未配置用户 key 或 Gateway 认证，已切换规则回退'};
}
export function aiFailure(error:unknown,label='模型'){
 const e=error as {statusCode?:number;name?:string};
 const why=e.statusCode===401?'密钥无效或认证失败':e.statusCode===429?'额度不足或请求限流':e.statusCode===403?'无模型权限或计费未开通':e.statusCode?`HTTP ${e.statusCode}`:e.name==='TimeoutError'||e.name==='AbortError'?'请求超时':'不可用或输出未通过校验';
 return `${label}：${why}${e.statusCode?` (HTTP ${e.statusCode})`:''}，已切换规则回退`;
}
// Shared fixed window: 120 API requests / minute / IP / running instance.
const windows=new Map<string,{count:number;until:number}>();
export function rateLimit(req:Request,now=Date.now()):Response|null{
 for(const [ip,w] of windows)if(w.until<=now)windows.delete(ip);
 const ip=(req.headers.get(process.env.VERCEL?'x-vercel-forwarded-for':'x-forwarded-for')||'local').split(',')[0].trim();
 const w=windows.get(ip)||{count:0,until:now+60000};w.count++;windows.set(ip,w);
 return w.count>120?Response.json({error:'请求频率超限，请稍后重试；当前使用规则回退。',mode:'规则回退'},{status:429,headers:{'Retry-After':String(Math.ceil((w.until-now)/1000)),'Cache-Control':'no-store'}}):null;
}
export function privateResponse(value:unknown,init?:ResponseInit){return Response.json(redactSecrets(value),{...init,headers:{'Cache-Control':'no-store',...init?.headers}});}
