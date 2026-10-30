import {it,expect,vi,afterEach} from 'vitest';
import {buildResearch} from '../lib/engine';
import {toolSources,requestSource,IfindProvider} from '../lib/providers';
import type {SourceResult} from '../lib/types';
const input={company:{code:'600519',name:'贵州茅台'},thesis:'估值与盈利',revised:'估值与盈利',period:'latest',focus:'valuation'};
const ts=Date.now(),end=Date.parse('2026-06-30T00:00:00+08:00');
const official=(title:string,item:unknown[],timestamp=ts):SourceResult=>({id:'fuyao:'+title,provider:'fuyao',title,url:'https://fuyao.aicubes.cn/api/a-share/',status:'ok',fetchedAt:new Date().toISOString(),primary:false,raw:{code:0,data:{timestamp,item}}});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
it('official quote and each valuation basis reach evidence with original fields and timestamp',()=>{
 const r=buildResearch(input,[official('行情快照',[{ticker:'600519',last_price:100}]),official('估值TTM/MRQ',[{ticker:'600519',pe_ttm:20,pe_mrq:19,pb_mrq:6}])]);
 const q=r.evidence.find(e=>e.metric==='quotePrice');expect(q?.values.price).toBe(100);expect(q?.unit).toBe('元');expect(q?.asOf).toBe(new Date(ts).toISOString());expect(q?.raw).toMatchObject({last_price:100});
 expect(r.evidence.find(e=>e.metric==='pe_ttm')?.basis).toBe('TTM');expect(r.evidence.find(e=>e.metric==='pe_mrq')?.basis).toBe('MRQ');expect(r.numberCheck.ok).toBe(true);
});
it('official financial amounts retain report end, disclosure date and cumulative basis',()=>{
 const r=buildResearch(input,[official('合并利润表',[{ticker:'600519',period:'quarterly',period_end_ms:end,report_date_ms:end+86400000,currency:'CNY',operating_income:123456,parent_holder_net_profit:34567}])]);
 const e=r.evidence.find(e=>e.metric==='operating_income');expect(e?.values.operating_income).toBe(123456);expect(e?.period).toBe('2026-06-30');expect(e?.unit).toBe('元');expect(e?.basis).toContain('累计');expect(e?.raw).toMatchObject({report_date_ms:end+86400000});
});
it('rejects other ticker rows and preserves null valuation as unknown',()=>{
 const r=buildResearch(input,[official('行情快照',[{ticker:'300750',last_price:100}]),official('估值TTM/MRQ',[{ticker:'600519',pe_ttm:null}])]);
 expect(r.evidence.some(e=>e.values.price===100)).toBe(false);expect(r.evidence.find(e=>e.metric==='pe_ttm')?.stance).toBe('unknown');
});
it('provider financial discrepancies keep both records and an unresolved conflict',()=>{
 const r=buildResearch(input,[official('合并利润表',[{ticker:'600519',period_end_ms:end,operating_income:100,parent_holder_net_profit:40}]),{id:'eastmoney:主要财务指标',provider:'eastmoney',title:'主要财务指标',url:'https://example.com',status:'ok',fetchedAt:new Date().toISOString(),primary:false,raw:{result:{data:[{REPORT_DATE:'2026-06-30',TOTALOPERATEREVE:120,PARENTNETPROFIT:50}]}}}]);
 expect(r.conflicts.some(c=>c.title.includes('跨供应商')&&c.resolution.includes('不平均'))).toBe(true);expect(r.evidence.find(e=>e.metric==='operating_income')?.values.operating_income).toBe(100);
});
it('tool registry requests only relevant Fuyao endpoint before labeled public comparison',async()=>{
 vi.stubEnv('FUYAO_API_KEY','test-only');const urls:string[]=[];vi.stubGlobal('fetch',vi.fn(async(url:string)=>{urls.push(String(url));return Response.json(String(url).includes('fuyao')?{code:0,data:{timestamp:ts,item:[{ticker:'600519',last_price:100}]}}:{data:{f43:100,f124:ts/1000}})}));
 const r=await toolSources('get_quote',input.company,false,true);expect(urls[0]).toContain('/prices/snapshot');expect(urls.filter(u=>u.includes('fuyao'))).toHaveLength(1);expect(r[0].provider).toBe('fuyao');expect(r.find(s=>s.provider==='eastmoney')?.reason).toContain('公开');
});
it('Fuyao rate limits do not immediately retry and invalid envelopes are rejected',async()=>{
 const f=vi.fn().mockResolvedValue(new Response('',{status:429}));const r=await requestSource('fuyao:行情快照','https://example.com',f);expect(f).toHaveBeenCalledTimes(1);expect(r.status).toBe('error');
 const invalid=await requestSource('fuyao:行情快照','https://example.com',vi.fn().mockResolvedValue(Response.json({data:{item:[]}})));expect(invalid.status).toBe('error');
});
it('iFinD retries one transport failure and parses real nested content with required dates',async()=>{
 vi.stubEnv('IFIND_TOKEN','test-only');const calls:any[]=[];let failed=false;
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{
  if(!failed){failed=true;throw new TypeError('fetch failed');}
  const body=JSON.parse(init.body);calls.push(body);
  if(body.method==='notifications/initialized')return new Response(null,{status:202});
  const result=body.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'test',version:'1'}}:{content:[{type:'text',text:JSON.stringify({code:1,data:JSON.stringify([{'公告标题':'贵州茅台：半年度报告','公告片段内容':'仅供原文核对的片段','日期':'2026-08-15'}])})}]};
  return Response.json({jsonrpc:'2.0',id:body.id,result});
 }));
 const [r]=await new IfindProvider(fetch).fetch(input.company);expect(r.status).toBe('ok');expect(r.retries).toBe(1);expect((r.raw as any).notices).toHaveLength(1);const args=calls.find(c=>c.method==='tools/call').params.arguments;expect(args.time_start).toMatch(/^\d{4}-/);expect(args.time_end).toMatch(/^\d{4}-/);
});
it('public valuation never labels price as multiples and income cross-check has percent unit',()=>{
 const base:SourceResult={id:'eastmoney:x',provider:'eastmoney',title:'行情与估值',url:'https://example.com',status:'ok',fetchedAt:new Date().toISOString(),primary:false,raw:{data:{f43:100,f162:20,f167:4,f124:Date.now()/1000}}};
 const r=buildResearch(input,[base,{...base,id:'eastmoney:利润表',title:'利润表',raw:{result:{data:[{REPORT_DATE:'2026-09-30',DPN_RATIO:8}]}}}]);
 expect(r.evidence.find(e=>e.metric==='currentPE')?.values).toEqual({pe:20,pb:4});expect(r.evidence.find(e=>e.metric==='DPN_RATIO')?.unit).toBe('%');
});
