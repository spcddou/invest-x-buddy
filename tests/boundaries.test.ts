import {it,expect} from 'vitest';
import {buildResearch,isAdvice,validateClaims} from '../lib/engine';
import {validatePlan,makePlan,stopReason,compressContext} from '../lib/harness';
import type {SourceResult} from '../lib/types';
const i={company:{code:'600519',name:'贵州茅台'},thesis:'主营业务改善',revised:'主营业务改善',period:'latest',focus:'earnings'};
const source=(raw:unknown,title='主要财务指标'):SourceResult=>({id:'eastmoney:'+title,provider:'eastmoney',title,url:'https://datacenter-web.eastmoney.com/',fetchedAt:new Date().toISOString(),status:'ok',primary:false,raw});
it.each(['明天涨停吗','满仓买入吗','保证收益20%','帮我给个目标股价','明天一定跌吗'])('refuses prediction/trading %s',s=>expect(isAdvice(s)).toBe(true));
it('nonexistent ticker / missing financial values never become support',()=>{
 const r=buildResearch(i,[{...source(null),status:'empty',reason:'证券不存在'}]);expect(r.evidence.every(e=>e.stance==='unknown')).toBe(true);expect(r.numberCheck.ok).toBe(true);
});
it('stale finance and unknown quote timestamps are explicitly degraded',()=>{
 const r=buildResearch(i,[source({result:{data:[{REPORT_DATE:'2020-12-31',KCFJCXSYJLRTZ:8,TOTALOPERATEREVETZ:4,PARENTNETPROFITTZ:5}]}}),source({data:{f43:10,f162:20,f167:3,f124:0}},'行情与估值')]);
 expect(r.evidence.filter(e=>e.stale).length).toBeGreaterThan(0);expect(r.evidence.every(e=>e.stance==='unknown')).toBe(true);
});
it('suspended/zero-volume quote cannot imply recent trading or PE decline',()=>{
 const r=buildResearch(i,[source({data:{f43:'-',f162:'-',f167:'-',f124:0}},'行情与估值')]);expect(r.evidence[0].stance).toBe('unknown');expect(r.evidence[0].values).toEqual({});
});
it('financial conflict preserves both values rather than averaging',()=>{
 const date=new Date().toISOString().slice(0,10);const r=buildResearch(i,[source({result:{data:[{REPORT_DATE:date,KCFJCXSYJLRTZ:-8,TOTALOPERATEREVETZ:4,PARENTNETPROFITTZ:5}]}}),source({result:{data:[{REPORT_DATE:date,DPN_RATIO:9}]}},'利润表')]);
 expect(r.conflicts.some(c=>c.title.includes('分歧'))).toBe(true);expect(r.evidence.some(e=>e.values.KCFJCXSYJLRTZ===-8)).toBe(true);expect(r.evidence.some(e=>e.values.DPN_RATIO===9)).toBe(true);
});
it('rejects cyclic reordered plan and cost overflow',()=>{const p=makePlan('估值');p[0].dependsOn=[p.at(-1)!.id];expect(validatePlan(p).ok).toBe(false);expect(stopReason({calls:1,cost:.06,elapsed:0,failures:0,stopped:false})).toContain('成本')});
it('unreferenced or Chinese ungrounded numbers are rejected',()=>{expect(validateClaims([{text:'百分之九十九',evidenceIds:['E1']}],[{id:'E1',values:{a:5}}]).ok).toBe(false)});
it('stale values cannot clear a monitor trigger',async()=>{const {evaluateTriggers}=await import('../lib/harness');expect(evaluateTriggers([{metric:'KCFJCXSYJLRTZ',values:{v:3},period:'old',stale:true}],[{metric:'KCFJCXSYJLRTZ',values:{v:4},period:'new'}])[0].status).toBe('unknown')});
