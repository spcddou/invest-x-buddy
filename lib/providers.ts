import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Company, SourceResult } from './types';
export interface DataProvider { name:string; fetch(company:Company, simulateFail?:boolean):Promise<SourceResult[]> }
export async function requestSource(id:string,url:string,fetcher:typeof fetch=fetch,init?:RequestInit):Promise<SourceResult>{
 const start=Date.now();
 const base:SourceResult={id,provider:id.split(':')[0],title:id.split(':')[1]||id,url,fetchedAt:new Date().toISOString(),status:'ok',raw:null,primary:id.startsWith('cninfo'),cacheHit:false};
 let reason='';let raw:unknown=null;let retries=0;
 for(let attempt=0;attempt<2;attempt++){
  retries=attempt;
  try{
   const res=await fetcher(url,{...init,cache:'no-store',signal:AbortSignal.timeout(7000),headers:{'User-Agent':'Mozilla/5.0','Referer':'https://www.cninfo.com.cn/',...init?.headers}});
   if(res.status===429){reason='HTTP 429 限流；不立即重试';break;}
   if(!res.ok)throw new Error(`HTTP ${res.status}`);
   const data=await res.json();raw=data;
   const empty=data===null||data.success===false||data.result===null||('data' in data&&data.data===null)||(Array.isArray(data.result?.data)&&!data.result.data.length)||(Array.isArray(data.data?.klines)&&!data.data.klines.length)||(Array.isArray(data.data?.item)&&!data.data.item.length);
   if(id.startsWith('fuyao')){
    if(data?.code===4001){reason='业务限流 4001；不立即重试';break;}
    if(data?.code!==0)throw new Error(`扶摇信封无效或业务错误 code=${typeof data?.code==='number'?data.code:'missing'}`);
    if(!Array.isArray(data.data?.item))throw new Error('扶摇 data.item 结构无效');
   }
   return {...base,raw,status:empty?'empty':'ok',reason:empty?'上游为空或证券不存在 / 未披露':undefined,retries:attempt,latency:Date.now()-start};
  }catch(error){reason=error instanceof Error&&/abort|timeout/i.test(error.name+' '+error.message)?'上游超时':error instanceof Error?error.message:'网络错误';}
 }
 return {...base,status:'error',reason:reason+(retries?'；已重试一次':''),raw,retries,latency:Date.now()-start};
}
export class EastmoneyProvider implements DataProvider {
 name='eastmoney';
 async fetch(c:Company,simulateFail=false){
  const secid=`${c.code.startsWith('6')?'1':'0'}.${c.code}`;
  const report=(name:string)=>'https://datacenter-web.eastmoney.com/api/data/v1/get?'+new URLSearchParams({reportName:name,columns:'ALL',filter:`(SECUCODE="${c.code}.${c.code.startsWith('6')?'SH':'SZ'}")`,pageSize:'20',sortColumns:'REPORT_DATE',sortTypes:'-1'});
  const calls=[['行情与估值',`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f60,f162,f167,f124&fltt=2`],['日K线',`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=0&lmt=90&end=20500101&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56`],['主要财务指标',report('RPT_F10_FINANCE_MAINFINADATA')],['利润表',report('RPT_DMSK_FN_INCOME')]];
  return Promise.all(calls.map(async([title,url])=>simulateFail?{id:`eastmoney:${title}`,provider:'eastmoney',title,url,fetchedAt:new Date().toISOString(),status:'error' as const,reason:'演示故障：模拟 Eastmoney 503；没有使用缓存或样例值',raw:null,primary:false}:requestSource(`eastmoney:${title}`,url)));
 }
}
export class CninfoProvider implements DataProvider {
 name='cninfo';
 async fetch(c:Company){
  const url='https://www.cninfo.com.cn/new/fulltextSearch/full?'+new URLSearchParams({searchkey:c.code+' 年度报告',sdate:'',edate:'',isfulltext:'false',sortName:'pubdate',sortType:'desc',pageNum:'1'});
  const result=await requestSource('cninfo:公司公告',url);
  if(result.status==='ok'){
   const announcements=((result.raw as {announcements?:{secCode:string}[]}).announcements||[]).filter(a=>a.secCode===c.code);
   result.raw={announcements};
   if(!announcements.length){result.status='empty';result.reason='未找到与证券代码精确匹配的定期报告';}
  }
  return [result];
 }
}
// Official contracts checked against provider llms-full documentation, 2026-10-30 UTC.
export class FuyaoProvider implements DataProvider {
 name='fuyao';
 async fetch(c:Company,_simulateFail=false,tool?:string):Promise<SourceResult[]>{
  if(!process.env.FUYAO_API_KEY)return [{id:'fuyao:官方数据',provider:this.name,title:'扶摇',url:'https://fuyao.aicubes.cn/docs/',fetchedAt:new Date().toISOString(),raw:null,primary:false,status:'disabled',reason:'未配置 FUYAO_API_KEY'}];
  const code=c.code+(c.code.startsWith('6')?'.SH':'.SZ');
  const paths=[['行情快照','prices/snapshot',new URLSearchParams({thscodes:code})],['历史K线','prices/historical',new URLSearchParams({thscode:code,interval:'1d',start:String(Date.now()-120*86400000),end:String(Date.now()),adjust:'none'})],['合并利润表','financials/income-statements',new URLSearchParams({thscode:code,period:'quarterly',limit:'8'})],['估值TTM/MRQ','valuations/snapshot',new URLSearchParams({thscodes:code})]];
  const selected=tool?paths.filter(([,path])=>path===(tool==='get_quote'?'prices/snapshot':tool==='get_kline'?'prices/historical':tool==='get_financials'?'financials/income-statements':'valuations/snapshot')):paths;
  return Promise.all(selected.map(([title,path,q])=>requestSource('fuyao:'+title,`https://fuyao.aicubes.cn/api/a-share/${path}?${q}`,fetch,{headers:{'X-api-key':process.env.FUYAO_API_KEY!}}).then(s=>({...s,reason:'主数据源：扶摇 REST'+(s.reason?'；'+s.reason:'')}))));
 }
}
export class IfindProvider implements DataProvider {
 name='ifind';
 async fetch(c:Company):Promise<SourceResult[]>{
  const start=Date.now();
  const url=process.env.IFIND_MCP_URL||'https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-news-mcp';
  const base:SourceResult={id:'ifind:公告片段',provider:this.name,title:'iFinD 公告片段',url:'https://mcp.51ifind.com/',fetchedAt:new Date().toISOString(),raw:null,primary:false,status:'disabled'};
  if(!process.env.IFIND_TOKEN)return [{...base,reason:'未配置 IFIND_TOKEN'}];
  for(let attempt=0;attempt<2;attempt++){
  const client=new Client({name:'codex',version:'2.1.0'});
  // Bound the whole transport request as well as SDK RPC waiting; do not expose exception bodies or auth headers.
  const transport=new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:{Authorization:process.env.IFIND_TOKEN,'User-Agent':'codex'}},fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.any([...(init?.signal?[init.signal]:[]),AbortSignal.timeout(18000)])})});
  try{
   await client.connect(transport,{timeout:18000});
   const raw=await client.callTool({name:'search_notice',arguments:{query:`${c.name} ${c.code} 最新定期报告 主营业务 非经常损益`,time_start:new Date(Date.now()-365*86400000).toISOString().slice(0,10),time_end:new Date().toISOString().slice(0,10),size:3}},undefined,{timeout:18000});
   const text=('content' in raw?raw.content:[]) as {type:string;text?:string}[];
   const envelope=JSON.parse(text.filter(x=>x.type==='text').map(x=>x.text).join(''));
   if(raw.isError||envelope.code!==1)throw new Error('iFinD 业务错误');
   const rows=typeof envelope.data==='string'?JSON.parse(envelope.data):envelope.data;
   if(!Array.isArray(rows))throw new Error('iFinD 公告结构无效');
   const notices=rows.filter(r=>typeof r['公告标题']==='string'&&r['公告标题'].includes(c.name)&&typeof r['公告片段内容']==='string');
   return [{...base,status:notices.length?'ok':'empty',raw:{response:raw,notices},latency:Date.now()-start,retries:attempt,reason:'主数据源：iFinD search_notice 公告语义片段；不是全文或定量字段'}];
  }catch{if(attempt===1)return [{...base,status:'error',retries:1,latency:Date.now()-start,reason:'iFinD MCP 连接 / 调用失败或超时；已重试一次，转公开 CNINFO 公告入口'}];}
  finally{await client.close().catch(()=>{});}
  }
  return [];
 }
}
export async function collectSources(c:Company,fail=false){
 return (await Promise.all(['get_quote','get_kline','get_financials','get_valuation','search_announcements'].map(t=>toolSources(t,c,fail)))).flat().filter((s,i,all)=>all.findIndex(x=>x.id===s.id)===i);
}

const publicCache=new Map<string,{at:number;results:SourceResult[]}>();
export async function toolSources(tool:string,c:Company,fail=false,fresh=false){
 const key=tool+':'+c.code;
 const cached=publicCache.get(key);
 if(!fail&&!fresh&&cached&&Date.now()-cached.at<60000)return cached.results.map(s=>({...s,cacheHit:true}));
 let results:SourceResult[];
 if(tool==='search_announcements'){
  const official=await new IfindProvider().fetch(c);
  const fallback=(await new CninfoProvider().fetch(c)).map(s=>({...s,reason:official.some(s=>s.status==='ok')?'公开补充 / 回退：CNINFO 原始公告入口':'公开回退：iFinD 不可用，CNINFO 公告入口'}));
  results=[...official,...fallback];
 }
 else{
  const official=await new FuyaoProvider().fetch(c,false,tool);
  const secid=`${c.code.startsWith('6')?'1':'0'}.${c.code}`;
  const report=(name:string)=>'https://datacenter-web.eastmoney.com/api/data/v1/get?'+new URLSearchParams({reportName:name,columns:'ALL',filter:`(SECUCODE="${c.code}.${c.code.startsWith('6')?'SH':'SZ'}")`,pageSize:'12',sortColumns:'REPORT_DATE',sortTypes:'-1'});
  const calls=tool==='get_financials'?[['主要财务指标',report('RPT_F10_FINANCE_MAINFINADATA')],['利润表',report('RPT_DMSK_FN_INCOME')]]:tool==='get_kline'?[['日K线',`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=0&lmt=90&end=20500101&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56`]]:[['行情与估值',`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f60,f162,f167,f124&fltt=2`]];
  results=await Promise.all(calls.map(([title,url])=>fail?Promise.resolve({id:`eastmoney:${title}`,provider:'eastmoney',title,url,fetchedAt:new Date().toISOString(),status:'error' as const,reason:'演示故障：Eastmoney 503，已模拟重试一次',raw:null,primary:false,retries:1,latency:0,cacheHit:false}):requestSource(`eastmoney:${title}`,url)));
  results=results.map(s=>({...s,reason:(official.some(x=>x.status==='ok')?'公开补充 / 回退：与主源分列核验':'公开回退：扶摇不可用')+(s.reason?'；'+s.reason:'')}));
  results=[...official,...results];
  if(results.every(s=>s.status!=='ok')){
   if(tool==='get_quote'){
    const url=`https://hq.sinajs.cn/list=${c.code.startsWith('6')?'sh':'sz'}${c.code}`;
    const start=Date.now();
    try{
     const r=await fetch(url,{headers:{Referer:'https://finance.sina.com.cn'},signal:AbortSignal.timeout(7000),cache:'no-store'});
     const text=new TextDecoder('gb18030').decode(await r.arrayBuffer());const fields=(text.split('="')[1]||'').split(',');
     const price=Number(fields[3]);
     results.push({id:'sina:行情与估值',provider:'sina',title:'行情与估值',url,fetchedAt:new Date().toISOString(),status:r.ok&&fields.length>30&&price>0?'ok':'empty',raw:{data:{f58:fields[0],f43:price>0?price:null,f124:fields[30]&&fields[31]?Date.parse(fields[30]+'T'+fields[31]+'+08:00')/1000:null},original:text},primary:false,reason:'备用新浪行情；不提供 PE / PB，不填补估值',latency:Date.now()-start,retries:0});
    }catch{results.push({id:'sina:行情备用',provider:'sina',title:'行情备用',url,fetchedAt:new Date().toISOString(),status:'error',reason:'备用行情请求失败',raw:null,primary:false});}
   }
  }
 }
 if(!fail&&results.some(s=>s.status==='ok'))publicCache.set(key,{at:Date.now(),results});
 return results;
}
