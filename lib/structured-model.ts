import {generateText,Output} from 'ai';
import {z} from 'zod';
import {execFile} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import type {RequestAI} from './model-runtime';
export const CLI_TIMEOUT_MS=60000;
// Both transports share the caller's schema, prompts, and post-generation guards.
export async function generateStructured<T extends z.ZodType>({ai,schema,system,prompt,maxOutputTokens,abortSignal}: {
 ai:RequestAI;schema:T;system:string;prompt:string;maxOutputTokens:number;maxRetries:number;abortSignal:AbortSignal;
}):Promise<{output:z.infer<T>;usage:{totalTokens?:number}}>{
 if(ai.model!=='codex-cli'){
  if(!ai.model)throw new Error('No model');
  const result=await generateText({model:ai.model,output:Output.object({schema}),system,prompt,maxOutputTokens,maxRetries:0,abortSignal,telemetry:{isEnabled:false,recordInputs:false,recordOutputs:false}});
  return {output:schema.parse(result.output),usage:{totalTokens:result.usage.totalTokens}};
 }
 const dir=await mkdtemp(join(tmpdir(),'ixb-codex-'));
 try{
  await writeFile(join(dir,'schema.json'),JSON.stringify(z.toJSONSchema(schema)),{mode:0o600});
  // Do not inherit app keys, database credentials, MCP servers, hooks or project instructions.
  const env:NodeJS.ProcessEnv={NODE_ENV:process.env.NODE_ENV,...Object.fromEntries(Object.entries(process.env).filter(([k])=>['HOME','PATH','TMPDIR','HTTPS_PROXY','HTTP_PROXY','NO_PROXY','SSL_CERT_FILE','NODE_EXTRA_CA_CERTS'].includes(k)))};
  await new Promise<void>((resolve,reject)=>{
   const child=execFile(join(homedir(),'.local/bin/codex'),['exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--sandbox','read-only','-c','features.shell_tool=false','-c','features.exec_tool=false','-c','model_reasoning_effort="low"','--output-schema',join(dir,'schema.json'),'-o',join(dir,'output.json'),'--color','never','-'],{cwd:dir,env,timeout:CLI_TIMEOUT_MS,killSignal:'SIGKILL',maxBuffer:1024*1024},error=>error?reject(Object.assign(new Error('Codex CLI unavailable'),{name:error.killed?'TimeoutError':'Error'})):resolve());
   child.stdin?.end(`${system}\n只生成符合 schema 的 JSON。不要调用任何工具。\n${prompt}`);
  });
  return {output:schema.parse(JSON.parse(await readFile(join(dir,'output.json'),'utf8'))),usage:{}};
 }finally{await rm(dir,{recursive:true,force:true});}
}
