import {it,expect,vi,afterEach} from 'vitest';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
const {request}=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('node:https',()=>({request}));
import {IfindProvider} from '../lib/providers';
afterEach(()=>vi.unstubAllEnvs());
it('native HTTPS transports MCP initialize, empty notification and streamed tool JSON',async()=>{
 vi.stubEnv('IFIND_TOKEN','test-only');const methods:string[]=[];
 request.mockImplementation((_url,options,callback)=>{
  expect(options.signal).toBeInstanceOf(AbortSignal);
  const req=new EventEmitter() as EventEmitter&{end:(body:string)=>void};
  req.end=body=>{const b=JSON.parse(body);methods.push(b.method);
   const result=b.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}:{content:[{type:'text',text:JSON.stringify({code:1,data:JSON.stringify([{'公告标题':'贵州茅台：定期报告','公告片段内容':'原始语义片段','日期':'2026-08-15'}])})}]};
   const empty=b.method==='notifications/initialized';
   const stream=Object.assign(Readable.from(empty?[]:[Buffer.from(JSON.stringify({jsonrpc:'2.0',id:b.id,result}))]),{statusCode:empty?202:200,rawHeaders:['Content-Type','application/json']});
   queueMicrotask(()=>callback(stream));
  };return req;
 });
 const [s]=await new IfindProvider().fetch({code:'600519',name:'贵州茅台'});
 expect(s.status).toBe('ok');expect((s.raw as {notices:unknown[]}).notices).toHaveLength(1);
 expect(methods).toEqual(['initialize','notifications/initialized','tools/call']);
});
