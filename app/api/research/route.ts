import {requestAI,rateLimit,privateResponse,aiFailure} from '@/lib/model-runtime';

import { requestSchema } from '@/lib/input';
import { buildResearch,isAdvice,refusal } from '@/lib/engine';
import { collectSources } from '@/lib/providers';
import { enrichResearch } from '@/lib/ai';
export const maxDuration=60;
export async function POST(req:Request){
 const limited=rateLimit(req);if(limited)return limited;
 const parsed=requestSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return privateResponse({error:'输入无效：请检查公司、命题及报告期。'},{status:400});
 const i=parsed.data;const ai=requestAI(req);
 if(isAdvice(i.thesis+' '+(i.revised||'')))return privateResponse({refused:true,error:refusal},{status:422});
 const sources=await collectSources({code:i.code,name:i.name},i.simulateFail);
 const quote=sources.find(s=>s.title==='行情与估值'&&s.status==='ok');
 const returned=(quote?.raw as {data?:{f58?:string}}|undefined)?.data?.f58;
 const company={code:i.code,name:returned||i.name};
 const r=buildResearch({company,thesis:i.thesis,revised:i.revised||i.thesis,period:i.period,focus:i.focus},sources);
 return privateResponse(await enrichResearch(r,undefined,ai),{headers:{'Cache-Control':'no-store'}});
}
