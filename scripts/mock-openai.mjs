// Local OpenAI protocol fixture only; never used by the deployed application.
import http from 'node:http';
http.createServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk;
 if(req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return;}
 const data=JSON.parse(body);const prompt=JSON.parse(data.messages.at(-1).content);
 let output;
 if(Array.isArray(prompt.baseline)&&prompt.company){
  const plan=prompt.baseline;
  // A visible change proves the model's selected tool is executed, not a cosmetic mode label.
  const step=plan.find(s=>s.tool==='get_kline');step.tool='search_announcements';step.goal='模型选择公告以补充估值证据';
  output={plan};
 }else if(prompt.baseline){
  const e=prompt.evidence[0];output={claims:[{text:'模型审阅：当前证据不足以确认历史估值变化。',evidenceIds:[e.id]}],classifications:prompt.evidence.map(e=>({evidenceId:e.id,stance:e.stance}))};
 }else output={text:'模型追问：需要核对原始报告与可比口径。',evidenceIds:[prompt.evidence[0].id]};
 res.writeHead(200,{'Content-Type':'application/json'});
 res.end(JSON.stringify({id:'mock-completion',object:'chat.completion',created:1,model:data.model,choices:[{index:0,message:{role:'assistant',content:JSON.stringify(output)},finish_reason:'stop'}],usage:{prompt_tokens:80,completion_tokens:40,total_tokens:120}}));
}).listen(4011,'127.0.0.1');
