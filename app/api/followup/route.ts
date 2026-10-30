import { NextResponse } from 'next/server';
import { z } from 'zod';
import { savedSchema } from '@/lib/input';
import { isAdvice,refusal } from '@/lib/engine';
import { answerFollowup } from '@/lib/ai';
export const maxDuration=30;
export async function POST(req:Request){
 const schema=z.object({question:z.string().trim().min(2).max(500),research:savedSchema.shape.tasks.element});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'追问或研究记录格式无效。'},{status:400});
 if(isAdvice(parsed.data.question))return NextResponse.json({refused:true,text:refusal,evidenceIds:[],mode:'研究边界',check:{ok:true,rejected:[]}});
 return NextResponse.json(await answerFollowup(parsed.data.question,parsed.data.research));
}
