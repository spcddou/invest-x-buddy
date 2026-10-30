import nextEnv from '@next/env';
import fs from 'node:fs/promises';
import {toolSources} from '../lib/providers.ts';
import {buildResearch} from '../lib/engine.ts';
nextEnv.loadEnvConfig(process.cwd());
const results=[];
for(const company of [{code:'600519',name:'贵州茅台'},{code:'300750',name:'宁德时代'},{code:'002594',name:'比亚迪'}]){
 const sources=[];
 for(const tool of ['get_quote','get_financials','get_valuation','get_kline','search_announcements'])sources.push(...await toolSources(tool,company,false,true));
 const unique=[...new Map(sources.map(s=>[s.id,s])).values()];
 const research=buildResearch({company,thesis:'核验估值与基本面',revised:'核验估值与基本面',period:'latest',focus:'valuation'},unique);
 const record={company,numberCheck:research.numberCheck,conflicts:research.conflicts,sources:unique.map(s=>({provider:s.provider,title:s.title,status:s.status,reason:s.reason,fetchedAt:s.fetchedAt,asOf:s.asOf,latency:s.latency,retries:s.retries,sample:s.provider==='fuyao'?s.raw?.data?.item?.slice(0,1):s.provider==='ifind'?s.raw?.notices?.slice(0,1).map(n=>({...n,'公告片段内容':n['公告片段内容'].slice(0,220)+'…'})):undefined})),officialEvidence:research.evidence.filter(e=>['fuyao','ifind'].includes(e.provider)).map(({provider,title,metric,period,unit,basis,asOf,values})=>({provider,title,metric,period,unit,basis,asOf,values}))};
 results.push(record);console.log(JSON.stringify({company:company.code,numberCheck:record.numberCheck.ok,sources:record.sources.map(({provider,title,status})=>({provider,title,status}))}));
}
await fs.writeFile('docs/provider-probe-results.json',JSON.stringify({generatedAt:new Date().toISOString(),results},null,2));
