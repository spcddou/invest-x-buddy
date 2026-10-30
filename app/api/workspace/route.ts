import {workspaceSchema} from '@/lib/harness';
import {readWorkspace,writeWorkspace} from '@/lib/storage';
export const maxDuration=30;
export async function GET(){try{return Response.json(await readWorkspace());}catch{return Response.json({mode:'local',workspace:null,error:'服务端存储暂不可用；浏览器副本保留'});}}
export async function PUT(req:Request){
 const parsed=workspaceSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:'工作区结构无效'},{status:400});
 const w=parsed.data;
 if(w.notes.some(n=>!w.runs.some(r=>r.id===n.runId&&r.approvals.some(a=>a.kind==='memory'&&a.decision!=='reject'))))return Response.json({error:'长期笔记缺少记忆审批'},{status:403});
 try{return Response.json(await writeWorkspace(w));}catch{return Response.json({mode:'local',error:'服务端保存失败；浏览器副本保留'});}
}
