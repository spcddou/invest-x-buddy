import { NextResponse } from 'next/server';
import { generateText,Output } from 'ai';
import { z } from 'zod';
import { requestSchema } from '@/lib/input';
import { decompose,isAdvice,refusal } from '@/lib/engine';
import { aiEnabled,aiFailure,model } from '@/lib/ai';
export const maxDuration=30;
export async function POST(req:Request){
 const parsed=requestSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'请填写有效的 A 股代码、研究命题和报告期。'},{status:400});
 const i=parsed.data;
 if(isAdvice(i.thesis))return NextResponse.json({refused:true,error:refusal},{status:422});
 const revised=`${i.name}（${i.code}），${i.period==='latest'?'本次抓取的最新可得累计报告期':i.period+' 累计报告期'}：${i.thesis}。以营业收入同比、扣非归母净利润同比和原始报告为检验线索；不把相关性当作归因。`;
 const base={revised,questions:decompose(i.thesis),clarifications:['证券代码是否与研究对象一致？如命题包含另一家公司，请修正公司选择。','报告期按累计值同比比较；最新可得不保证是最近应披露期。','“主营改善”暂用扣非利润作线索；仍需分部与非经常损益正文。'],mode:'规则回退',reason:'确定性澄清与拆解'};
 if(!aiEnabled())return NextResponse.json({...base,reason:'未配置 AI Gateway 认证，使用规则拆解'});
 try{
  const {output}=await generateText({model,output:Output.object({schema:z.object({clarifications:z.array(z.string()).min(1).max(3),revisionNote:z.string().max(300)})}),maxRetries:0,maxOutputTokens:1000,abortSignal:AbortSignal.timeout(12000),system:'提出研究澄清问题和命题修订建议。禁止建议价格、交易或仓位。不可改变已选公司与期间，不生成事实数值。只能讨论指标定义、时间和因果链。',prompt:JSON.stringify(i)});
  if(isAdvice(JSON.stringify(output)))return NextResponse.json(base);
  return NextResponse.json({...base,clarifications:output.clarifications,revisionNote:output.revisionNote,mode:'AI 澄清 + 规则指标映射',reason:model});
 }catch(e){return NextResponse.json({...base,reason:aiFailure(e)});}
}
