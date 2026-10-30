import type { Claim, Evidence, Question, Research, SourceResult, Stance } from './types';
export const presets=[{code:'600519',name:'贵州茅台',thesis:'贵州茅台估值回落但基本面未恶化',focus:'valuation'},{code:'300750',name:'宁德时代',thesis:'宁德时代盈利改善来自主营业务',focus:'earnings'},{code:'002594',name:'比亚迪',thesis:'原材料价格下降将改善比亚迪产业链利润分配',focus:'external'}];
export function isAdvice(text:string){return /明天.{0,5}(涨|跌)|涨停吗|保证.{0,3}收益|收益承诺|满仓|目标.{0,3}价|合理.{0,3}价|买入|卖出|买卖|买不买|能买|能买吗|建仓|加仓|减仓|仓位|荐股|买哪|卖哪|buy|sell|price\s*target|target\s*price/i.test(text);}
export const refusal='本工具仅核验研究命题，不提供目标价、买卖建议或仓位建议。可以继续核验营收、扣非利润、估值口径与证据缺口。';
export function classifyGrowth(value:number|null|undefined):Stance{return value===null||value===undefined?'unknown':value>=0?'support':'against';}
export function decompose(thesis:string):Question[]{
 const basic=[{question:'同报告期营业收入同比是否为非负？',metric:'TOTALOPERATEREVETZ',call:'Eastmoney / RPT_F10_FINANCE_MAINFINADATA'},{question:'扣非归母利润是否增长，能否佐证经营改善？',metric:'DEDUCT_PARENT_NETPROFIT',call:'Eastmoney / RPT_DMSK_FN_INCOME + KCFJCXSYJLRTZ'},{question:'原始定期报告能否提供主营业务归因？',metric:'reportBody',call:'CNINFO / 定期报告检索（标题、日期、PDF）'}];
 if(/估值|PE|PB|市盈率/i.test(thesis))return [{question:'当前市盈率与市净率是多少？',metric:'currentPE',call:'Eastmoney / quote f162 + f167'},{question:'可比口径历史市盈率是否回落？',metric:'historicalPE',call:'历史 PE 缺失；日 K 线仅作价格背景，不替代 PE'},...basic.slice(0,2)];
 if(/外部|原材料|产业链|政策|关税|分配/.test(thesis))return [{question:'成本变化能否传导至分部毛利率？',metric:'segmentMargin',call:'分部利润、采购价与传导时滞未接入'},...basic];
 return basic;
}
// Only display-normalized quantitative values are allowed; raw metadata/dates are not a numeric allowlist.
export function checkNumbers(text:string,evidence:{values:Record<string,number>}[]){
 const allowed=new Set(evidence.flatMap(e=>Object.values(e.values).filter(Number.isFinite).map(n=>String(n))));
 const tokens=text.replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/g)||[];
 const rejected=tokens.filter(n=>!allowed.has(String(Number(n))));
 const written=text.match(/百分之[零一二三四五六七八九十百千万亿点两]+|[零一二三四五六七八九十百千万亿两]+(?:亿元|万元|元|倍|个百分点|%)/g)||[];
 return {ok:rejected.length===0&&written.length===0,rejected:[...new Set([...rejected,...written])]};
}
export function validateClaims(claims:Claim[],evidence:{id:string;values:Record<string,number>}[]){
 const rejected:string[]=[];
 for(const claim of claims){
  if(!claim.evidenceIds.length||claim.evidenceIds.some(id=>!evidence.some(e=>e.id===id)))rejected.push('无效证据引用');
  rejected.push(...checkNumbers(claim.text,evidence.filter(e=>claim.evidenceIds.includes(e.id))).rejected);
  if(isAdvice(claim.text))rejected.push('越过研究边界');
 }
 return {ok:rejected.length===0,rejected:[...new Set(rejected)]};
}
const round=(n:number)=>Number(n.toFixed(2));
const value=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)?x:null;
type Row=Record<string,unknown>;
export function buildResearch(input:{company:{code:string;name:string};thesis:string;revised:string;period:string;focus:string},sources:SourceResult[]):Research{
 const evidence:Evidence[]=[];
 const add=(s:SourceResult,title:string,text:string,stance:Stance,metric:string,period:string,values:Record<string,number>,raw:unknown,limitation:string,url=s.url)=>{
  evidence.push({id:`E${evidence.length+1}`,sourceId:s.id,title,text,stance,metric,period,values,raw,url,fetchedAt:s.fetchedAt,primary:s.primary,limitation,provider:s.provider,asOf:period,unit:(/同比|价格背景/.test(title)||metric==='DPN_RATIO')?'%':metric==='currentPE'?'倍':metric==='cashflow'?'亿元':'不适用',basis:metric==='currentPE'?'动态PE / PB；非TTM':metric==='priceChange'?'不复权窗口首尾':metric==='reportBody'?'公告标题；非正文':'累计报告期同比',stale:false});
 };
 const rows=(s:SourceResult)=>((s.raw as {result?:{data?:Row[]}})?.result?.data||[]);
 const select=(s:SourceResult)=>rows(s).find(r=>input.period==='latest'||String(r.REPORT_DATE).startsWith(input.period));
 let main:Row|undefined;
 let inc:Row|undefined;
 let mainSource:SourceResult|undefined;
 let incSource:SourceResult|undefined;
 for(const s of sources){
  if(s.status==='disabled')continue;
  if(s.status!=='ok'){add(s,s.title+'不可用',s.reason||'暂无数据','unknown','source','未取得',{},null,'本来源不可用于判断；其他成功来源继续保留。');continue;}
  if(s.provider==='fuyao'){
   const data=(s.raw as {data:{timestamp:number|null;item:Row[]}}).data;
   const items=data.item.filter(r=>r.ticker===input.company.code||r.thscode===input.company.code+(input.company.code.startsWith('6')?'.SH':'.SZ'));
   const asOf=data.timestamp?new Date(data.timestamp).toISOString():'数据时点未知';
   if(s.title==='行情快照'){
    const row=items[0],price=value(row?.last_price);
    add(s,'扶摇行情快照',price===null?'请求证券的成交价缺失':`最新成交价 ${round(price)} 元`,'unknown','quotePrice',asOf,price===null?{}:{price:round(price)},row||s.raw,'扶摇主数据源；数据就绪时点不是每个字段的逐笔成交时点。');
    Object.assign(evidence.at(-1)!,{asOf,unit:'元',basis:'最新成交价；CNY',stale:!data.timestamp||Date.now()-data.timestamp>4*86400000});
   }else if(s.title==='估值TTM/MRQ'){
    const row=items[0];
    for(const [field,label,basis] of [['pe_ttm','市盈率 TTM','TTM'],['pe_mrq','市盈率 MRQ','MRQ'],['pb_mrq','市净率 MRQ','MRQ']]){
     const n=value(row?.[field]);
     add(s,'扶摇'+label,n===null?'请求证券的估值字段缺失':`${label} ${round(n)} 倍`,'unknown',field,asOf,n===null?{}:{[field]:round(n)},row||s.raw,'扶摇主数据源；TTM / MRQ 与动态 PE 分列，当前截面不证明估值回落。');
     Object.assign(evidence.at(-1)!,{asOf,unit:'倍',basis,stale:!data.timestamp||Date.now()-data.timestamp>4*86400000});
    }
   }else if(s.title==='合并利润表'){
    const row=items.find(r=>input.period==='latest'||new Date(Number(r.period_end_ms)+8*3600000).toISOString().startsWith(input.period));
    if(!row){add(s,'扶摇报告期未覆盖','所选证券 / 报告期没有利润表记录','unknown','period',input.period,{},s.raw,'不使用其他公司或报告期填补。');continue;}
    const period=new Date(Number(row.period_end_ms)+8*3600000).toISOString().slice(0,10);
    for(const [field,label] of [['operating_income','营业收入'],['operating_profit','营业利润'],['parent_holder_net_profit','归母净利润']]){
     const n=value(row[field]);
     add(s,'扶摇合并'+label,n===null?'该利润表字段缺失':`${label} ${round(n)} 元`,'unknown',field,period,n===null?{}:{[field]:round(n)},row,'扶摇主数据源；季度末报告不表示单季。保留累计金额，不擅自计算同比或扣非。');
     Object.assign(evidence.at(-1)!,{asOf:period,unit:'元',basis:'合并利润表；年初至报告期末累计；CNY'});
    }
   }else if(s.title==='历史K线'){
    const bars=data.item.slice().sort((a,b)=>Number(a.date_ms)-Number(b.date_ms));
    const first=bars[0],last=bars.at(-1),a=value(first?.close_price),b=value(last?.close_price);
    const change=bars.length>1&&a!==null&&a>0&&b!==null?round((b/a-1)*100):null;
    add(s,'扶摇价格背景',change===null?'不复权日线不足':`窗口首尾收盘价格变化 ${change}%`,'unknown','priceChange',bars.length?new Date(Number(first.date_ms)+8*3600000).toISOString().slice(0,10)+' 至 '+new Date(Number(last!.date_ms)+8*3600000).toISOString().slice(0,10):'未取得',change===null?{}:{change},{first,last,timestamp:data.timestamp},'扶摇主数据源；不复权价格背景，不替代历史 PE。');
    Object.assign(evidence.at(-1)!,{asOf,unit:'%',basis:'不复权窗口首尾',stale:!data.timestamp||Date.now()-data.timestamp>4*86400000});
   }
  }
  if(s.provider==='ifind'){
   const notices=(s.raw as {notices?:Row[]}).notices||[];
   if(!notices.length)add(s,'iFinD 公告片段未覆盖','没有证券精确匹配的可用公告片段','unknown','reportBody','未知',{},s.raw,'不能将空检索当作没有相关公告。');
   for(const row of notices){
    add(s,String(row['公告标题']),String(row['公告片段内容']).slice(0,1000),'unknown','reportBody',String(row['日期']||'未知'),{},row,'iFinD 语义检索片段，可能含摘要、截断、母公司与合并表混排；未核对原文，不提取定量事实或宣称主营归因。');
    Object.assign(evidence.at(-1)!,{unit:'原文片段（未结构化）',basis:'公告语义检索；非全文',asOf:String(row['日期']||'未知')});
   }
  }
  if(s.title==='主要财务指标'){
   mainSource=s;main=select(s);
   if(!main){add(s,'报告期未覆盖','所选报告期在本次返回记录中不存在','unknown','period',input.period,{},s.raw,'不能用其他报告期替代');continue;}
   const period=String(main.REPORT_DATE).slice(0,10);
   for(const [key,metric,label] of [['TOTALOPERATEREVE','operating_income','营业总收入'],['PARENTNETPROFIT','parent_holder_net_profit','归母净利润']]){
    const n=value(main[key]);
    if(n!==null){add(s,'公开补充'+label,`${label} ${round(n)} 元`,'unknown',metric,period,{[metric]:round(n)},{[key]:main[key],REPORT_DATE:main.REPORT_DATE,NOTICE_DATE:main.NOTICE_DATE},'公开回退 / 交叉核验；营业总收入不等于营业收入，口径待核。');Object.assign(evidence.at(-1)!,{unit:'元',basis:key==='TOTALOPERATEREVE'?'营业总收入；累计；CNY':'合并利润表；年初至报告期末累计；CNY'});}
   }

   for(const [key,label] of [['TOTALOPERATEREVETZ','营业收入同比'],['PARENTNETPROFITTZ','归母净利润同比'],['KCFJCXSYJLRTZ','扣非归母净利润同比']]){
    const v=value(main[key]);
    add(s,label,v===null?'该指标缺失':`${label} ${round(v)}%`,classifyGrowth(v),key,period,v===null?{}:{[key]:round(v)}, {[key]:main[key],REPORT_DATE:main.REPORT_DATE,NOTICE_DATE:main.NOTICE_DATE},'东方财富转录指标；累计报告期同比，扣非改善不能单独证明主营业务因果。');
   }
   const cash=value(main.NETCASH_OPERATE_PK),profit=value(main.PARENTNETPROFIT);
   add(s,'经营现金流与利润',cash===null||profit===null?'缺少可比现金流或利润':`经营现金净额 ${round(cash/1e8)} 亿元；归母净利润 ${round(profit/1e8)} 亿元`,'unknown','cashflow',period,cash===null||profit===null?{}:{cash:round(cash/1e8),profit:round(profit/1e8)}, {NETCASH_OPERATE_PK:cash,PARENTNETPROFIT:profit},'现金流受预收款和支付节奏影响，不将现金/利润比例机械解释为好坏。');
  }
  if(s.title==='利润表'){
   incSource=s;inc=select(s);
   const n=value(inc?.DPN_RATIO);
   add(s,'利润表交叉核验',n===null?'所选报告期扣非同比缺失':`利润表扣非归母净利润同比 ${round(n)}%`,classifyGrowth(n),'DPN_RATIO',String(inc?.REPORT_DATE||input.period).slice(0,10),n===null?{}:{DPN_RATIO:round(n)},inc||s.raw,'与主要指标同属东方财富，不能视为独立来源验证。');
  }
  if(s.title==='行情与估值'){
   const d=(s.raw as {data:Row}).data;
   const pe=value(d?.f162),pb=value(d?.f167),price=value(d?.f43);
   if(price!==null){add(s,'公开补充行情',`最新成交价 ${round(price)} 元`,'unknown','quotePrice','抓取时快照',{price:round(price)},d,'公开回退 / 交叉核验；按各自数据时点并列，不覆盖扶摇。');Object.assign(evidence.at(-1)!,{unit:'元',basis:'最新成交价；CNY',asOf:d.f124?new Date(Number(d.f124)*1000).toISOString():'数据时点未知',stale:!d.f124||Date.now()-Number(d.f124)*1000>4*86400000});}

   add(s,'当前估值快照',pe===null||pb===null?'当前估值字段缺失':`市盈率（动态） ${round(pe)} 倍；市净率 ${round(pb)} 倍`,'unknown','currentPE','抓取时快照',pe===null||pb===null?{}:{pe:round(pe),pb:round(pb)},d,'上游为动态市盈率；只有当前截面，不能证明估值回落。行情时点需另行核验，抓取时刻不等于行情时刻。');
  }
  if(s.title==='日K线'){
   const d=(s.raw as {data?:{klines?:string[]}}).data?.klines||[];
   const first=d[0]?.split(','),last=d.at(-1)?.split(',');
   const a=Number(first?.[2]),b=Number(last?.[2]);
   const valid=d.length>1&&Number.isFinite(a)&&a>0&&Number.isFinite(b);
   const change=valid?round((b/a-1)*100):null;
   add(s,'价格背景',change===null?'日 K 线为空或不足以比较':`窗口首尾收盘价格变化 ${change}%`,'unknown','priceChange',valid?`${first![0]} 至 ${last![0]}`:'未取得',change===null?{}:{change},s.raw,'不复权价格；分红、拆股与盈利变化均影响解释。价格下跌不等于 PE 回落。');
  }
  if(s.provider==='cninfo'){
   const list=(s.raw as {announcements:Row[]}).announcements.slice(0,3);
   for(const a of list){
    const title=String(a.announcementTitle).replace(/<[^>]*>/g,'');
    const url='https://static.cninfo.com.cn/'+a.adjunctUrl;
    add(s,title,'已检索到公司原始公告；正文尚未解析','unknown','reportBody',new Date(Number(a.announcementTime)).toISOString().slice(0,10),{},a,'这是材料线索，尚未用于证实正文中的数值或主营归因。公告日期可能与所选报告期不同，请查看 PDF。',url);
   }
  }
 }
 for(const e of evidence){
  const s=sources.find(s=>s.id===e.sourceId);
  if(e.metric==='currentPE'){
   const ts=(e.raw as {f124?:number})?.f124;
   e.asOf=ts&&ts>0?new Date(ts*1000).toISOString():'行情时点未知';
   e.stale=!ts||ts<=0||(Date.now()-ts*1000)>4*86400000;
  }else if(/^\d{4}-\d{2}-\d{2}$/.test(e.period)&&e.metric!=='reportBody')e.stale=(Date.now()-Date.parse(e.period))>200*86400000;
  if(e.stale){e.stance='unknown';e.limitation+=' 数据超过时效阈值或行情时点未知，降级为无法验证。';}
  if(s)s.asOf=e.asOf;
 }
 const anchor=evidence.find(e=>e.metric==='KCFJCXSYJLRTZ');
 const citations=evidence.filter(e=>['TOTALOPERATEREVETZ','KCFJCXSYJLRTZ','DPN_RATIO'].includes(e.metric));
 const missing=evidence.find(e=>e.stance==='unknown')||evidence[0];
 const claims:Claim[]=evidence.filter(e=>!e.stale&&Object.keys(e.values).length&&e.metric!=='currentPE').slice(0,2).map(e=>({text:e.text,evidenceIds:[e.id],kind:'事实'}));
 if(citations.length)claims.push({text:anchor?.stance==='support'?'经营改善的部分指标获得支持，仍需核验增长来源。':anchor?.stance==='against'?'扣非利润指标反对“盈利改善”的前提，不能直接沿用原命题。':'财务指标覆盖不足，当前无法判断经营改善。',evidenceIds:citations.map(e=>e.id)});
 if(missing)claims.push({text:input.focus==='valuation'?'缺少历史可比估值，估值回落这一部分无法验证。':input.focus==='external'?'缺少采购成本、分部利润与传导时滞，外部变化的因果链无法验证。':'扣非利润只是经营近似指标；主营业务归因仍缺少分部与非经常损益正文证据。',evidenceIds:[missing.id]});
 const conflicts:Research['conflicts']=[];
 for(const metric of ['operating_income','parent_holder_net_profit','quotePrice']){
  const a=evidence.find(e=>e.provider==='fuyao'&&e.metric===metric&&Object.keys(e.values).length);
  const b=evidence.find(e=>e.provider==='eastmoney'&&e.metric===metric&&Object.keys(e.values).length);
  if(a&&b){
   const same=a.period===b.period&&a.basis===b.basis;
   const equal=Math.abs(Object.values(a.values)[0]-Object.values(b.values)[0])<=0.01;
   if(!same||!equal)conflicts.push({title:'跨供应商字段 / 报告期分歧：'+a.title,evidenceIds:[a.id,b.id],resolution:same?'同口径数值存在分歧；保留两值，不平均、不覆盖，核读最新原始披露后再判断。':'报告期或统计口径不一致，不能直接比较；保留两值，不平均、不覆盖。营业收入与营业总收入等范围差异必须先对齐。'});
  }
 }
 const officialVal=evidence.find(e=>e.metric==='pe_ttm'),publicVal=evidence.find(e=>e.metric==='currentPE');
 if(officialVal&&publicVal)conflicts.push({title:'跨供应商估值口径不同',evidenceIds:[officialVal.id,publicVal.id],resolution:'扶摇 TTM / MRQ 与公开动态 PE 并列；不是同口径数值冲突，不能平均、互换或按大小选择。'});
 const rev=evidence.find(e=>e.metric==='TOTALOPERATEREVETZ');
 if(rev&&anchor&&rev.stance!==anchor.stance&&rev.stance!=='unknown'&&anchor.stance!=='unknown')conflicts.push({title:'营收与扣非利润出现相反信号',evidenceIds:[rev.id,anchor.id],resolution:'两项指标口径不同，不互相抵消。按同一累计报告期并列呈现；“盈利改善”以扣非利润指标判断，收入增长不能覆盖利润下降。'});
 const cross=evidence.find(e=>e.metric==='DPN_RATIO');
 if(main&&inc&&mainSource&&incSource&&anchor&&cross){
  const samePeriod=String(main.REPORT_DATE)===String(inc.REPORT_DATE);
  const a=value(main.KCFJCXSYJLRTZ),b=value(inc.DPN_RATIO);
  const agrees=samePeriod&&a!==null&&b!==null&&Math.abs(a-b)<0.01;
  conflicts.push({title:agrees?'同源交叉核验：扣非口径一致':'财务口径或报告期存在待核分歧',evidenceIds:[anchor.id,cross.id],resolution:agrees?'主要指标与利润表在显示精度内一致；均为二手转录，没有独立一手核验。更正公告或更新版本优先，但需人工核读原始 PDF 后才能解决。':'保留两条记录，不平均、不选择有利值。先对齐报告期及版本，再以公司最新更正后的原始报告为优先依据；当前悬而未决。'});
 }
 if(!conflicts.length)conflicts.push({title:'尚无可比较的同口径证据',evidenceIds:evidence.filter(e=>e.stance==='unknown').slice(0,2).map(e=>e.id),resolution:'没有检测到冲突不表示来源一致；可能是上游缺失或材料尚未解析。'});
 const ids=(citations.length?citations:missing?[missing]:[]).map(e=>e.id);
 const flips:Research['flips']=[{condition:'下一份同口径扣非归母净利润同比穿越零增长线',action:'由支持转为反对，或由反对转为支持；仍不单独证明主营归因。',evidenceIds:ids},{condition:'公司发布更正公告，或分部报告揭示增长主要由非经常项目贡献',action:'撤回原归因并重做证据分类，以原始更正材料为准。',evidenceIds:missing?[missing.id]:ids}];
 if(input.focus==='valuation')flips.unshift({condition:'取得两个时点同口径动态市盈率，后值低于前值，且同期扣非利润同比非负',action:'估值回落与基本面两部分才可能同时获得支持；当前缺少历史估值。',evidenceIds:ids});
 if(input.focus==='external')flips.unshift({condition:'同口径采购单价下降，且目标分部毛利率较同期上升，并排除产品结构变化',action:'将成本传导从假设升级为待核支持；需合同、分部报表和时滞对齐。',evidenceIds:ids});
 for(const c of claims)if(!c.kind)c.kind=c.text.includes('缺少')||c.text.includes('无法')?'不确定':'推断';
 return {id:crypto.randomUUID(),...input,period:anchor?.period||input.period,questions:decompose(input.revised),sources,evidence,claims,conflicts,flips,ai:{mode:'规则回退',reason:'确定性拆解与分类；未使用模型生成财务数值'},numberCheck:validateClaims(claims,evidence),createdAt:new Date().toISOString()};
}
