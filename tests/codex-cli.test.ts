import {afterEach,expect,it,vi} from 'vitest';
import {requestAI,resolveModel} from '../lib/model-runtime';
afterEach(()=>vi.unstubAllEnvs());
it('BYOK > explicitly local CLI > gateway > rules',()=>{
 expect(resolveModel(true,true,true)).toBe('byok');
 expect(resolveModel(false,true,true)).toBe('codex-cli');
});
it.each(['VERCEL','VERCEL_ENV','DEPLOYMENT_ENV'])('refuses CLI in hosted production via %s',name=>{
 vi.stubEnv('LLM_PROVIDER','codex-cli');vi.stubEnv(name,name==='VERCEL'?'1':'production');
 const ai=requestAI(new Request('https://example.com'));
 expect(ai.model).toBeNull();expect(ai.reason).toContain('仅限本地');
});
it('permits local production build but refuses remote request hosts',()=>{
 vi.stubEnv('LLM_PROVIDER','codex-cli');vi.stubEnv('NODE_ENV','production');vi.stubEnv('VERCEL','');vi.stubEnv('VERCEL_ENV','');
 expect(requestAI(new Request('http://localhost:3000')).model).toBe('codex-cli');
 expect(requestAI(new Request('https://example.com')).model).toBeNull();
});
