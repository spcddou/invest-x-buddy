import {afterEach,expect,it,vi} from 'vitest';
import {resolveModel,requestAI,rateLimit} from '../lib/model-runtime';
import {loadSettings,saveSettings,clearSettings,modelHeaders} from '../lib/model-settings';
import {redactSecrets} from '../lib/privacy';
import {enrichResearch} from '../lib/ai';
import {buildResearch} from '../lib/engine';
const key=['sk','test','A'.repeat(32)].join('-');
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it('BYOK precedes gateway; missing credentials falls through only when absent',()=>{
 expect(resolveModel(true,true)).toBe('byok');expect(resolveModel(false,true)).toBe('gateway');expect(resolveModel(false,false)).toBe('rules');
});
it('invalid BYOK never spends gateway quota and returns an explicit fallback',async()=>{
 vi.stubEnv('AI_GATEWAY_API_KEY','owner');
 const ai=requestAI(new Request('http://localhost',{headers:{'x-openai-key':'bad'}}));
 const r=await enrichResearch(buildResearch({company:{code:'600519',name:'贵州茅台'},thesis:'估值研究',revised:'估值研究',focus:'valuation',period:'latest'},[]),undefined,ai);
 expect(r.ai.mode).toBe('规则回退');expect(r.ai.reason).toContain('格式无效');
});
it.each([401,429])('OpenAI %s is an explicit fallback without leaking provider error',async status=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:key,type:status===401?'invalid_request_error':'insufficient_quota',code:status===401?'invalid_api_key':'insufficient_quota'}}),{status,headers:{'Content-Type':'application/json'}})));
 const ai=requestAI(new Request('http://localhost',{headers:{'x-openai-key':key}}));
 const r=await enrichResearch(buildResearch({company:{code:'600519',name:'贵州茅台'},thesis:'估值研究',revised:'估值研究',focus:'valuation',period:'latest'},[]),undefined,ai);
 expect(r.ai.mode).toBe('规则回退');expect(r.ai.reason).toContain(String(status));expect(JSON.stringify(r).includes(key)).toBe(false);vi.unstubAllGlobals();
});
it('per-IP limit applies independent of model mode and resets',()=>{
 const req=new Request('http://localhost',{headers:{'x-forwarded-for':'192.0.2.91'}});
 for(let i=0;i<120;i++)expect(rateLimit(req,1000)).toBeNull();
 expect(rateLimit(req,1001)?.status).toBe(429);expect(rateLimit(req,61001)).toBeNull();
});
const storage=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};};
it('session default, local remember opt-in, forget clears both; key only in header',()=>{
 const session=storage(),local=storage();saveSettings({key,model:'gpt-4o-mini',remember:false},session,local);
 expect(loadSettings(session,local).key===key).toBe(true);expect(local.getItem('ixb-model-settings')).toBeNull();
 saveSettings({key,model:'gpt-4o-mini',remember:true},session,local);expect(session.getItem('ixb-model-settings')).toBeNull();
 expect(loadSettings(session,local).remember).toBe(true);expect(modelHeaders(session,local)['x-openai-key']===key).toBe(true);
 clearSettings(session,local);expect(loadSettings(session,local).key).toBe('');
});
it('Neon payload and trace export serialization redact key-like strings recursively',()=>{
 const payload=redactSecrets({runs:[{trace:[{raw:{accidental:key},summary:key}]}],preferences:{metrics:key}});
 const neonPayload=JSON.stringify(payload),traceExport=JSON.stringify(payload.runs[0]);
 expect(neonPayload.includes(key)).toBe(false);expect(traceExport.includes(key)).toBe(false);
});
it('model-selected plans must read memory first, verify all evidence and contain no advice',async()=>{
 const {makePlan,validatePlan}=await import('../lib/harness');
 const p=makePlan('估值');p.at(-1)!.dependsOn=[];expect(validatePlan(p).ok).toBe(false);
 const q=makePlan('估值');q[1].goal='满仓买入';expect(validatePlan(q).ok).toBe(false);
});
