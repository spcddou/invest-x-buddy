import {expect,it,vi,afterEach} from 'vitest';
import {z} from 'zod';
import {existsSync} from 'node:fs';
const {exec}=vi.hoisted(()=>({exec:vi.fn()}));
vi.mock('node:child_process',()=>({execFile:exec}));
import {generateStructured} from '../lib/structured-model';
afterEach(()=>{vi.unstubAllEnvs();exec.mockReset();});
const args={ai:{model:'codex-cli',label:'CLI',reason:''},schema:z.object({ok:z.boolean()}),system:'system',prompt:'material',maxOutputTokens:100,maxRetries:0,abortSignal:AbortSignal.timeout(1000)};
it('CLI uses isolated ephemeral readonly process and validates JSON; never inherits app secrets',async()=>{
 vi.stubEnv('OPENAI_API_KEY','private-test-value');vi.stubEnv('DATABASE_URL','private-db');
 exec.mockImplementation((_file,flags,options,cb)=>{
  expect(flags).toContain('--ephemeral');expect(flags).toContain('read-only');expect(flags).toContain('--ignore-user-config');
  expect(options.env.OPENAI_API_KEY).toBeUndefined();expect(options.env.DATABASE_URL).toBeUndefined();
  expect(options.timeout).toBe(60000);expect(options.killSignal).toBe('SIGKILL');
  void import('node:fs/promises').then(fs=>fs.writeFile(flags[flags.indexOf('-o')+1],'{"ok":true}')).then(()=>cb(null));
  return {stdin:{end:vi.fn()}};
 });
 expect((await generateStructured(args)).output).toEqual({ok:true});expect(existsSync(exec.mock.calls[0][2].cwd)).toBe(false);
});
it('CLI rejects schema-invalid output and removes temporary material',async()=>{
 exec.mockImplementation((_file,flags,_options,cb)=>{void import('node:fs/promises').then(fs=>fs.writeFile(flags[flags.indexOf('-o')+1],'{"ok":"wrong"}')).then(()=>cb(null));return {stdin:{end:vi.fn()}};});
 await expect(generateStructured(args)).rejects.toThrow();expect(existsSync(exec.mock.calls[0][2].cwd)).toBe(false);
});
it('CLI timeout is sanitized and cleans up',async()=>{
 exec.mockImplementation((_file,_flags,_options,cb)=>{queueMicrotask(()=>cb({killed:true,message:'secret provider error'}));return {stdin:{end:vi.fn()}};});
 await expect(generateStructured(args)).rejects.toMatchObject({name:'TimeoutError',message:'Codex CLI unavailable'});expect(existsSync(exec.mock.calls[0][2].cwd)).toBe(false);
});
