import {expect,it,vi} from 'vitest';
import type {Workspace} from '../lib/harness';
const {sql}=vi.hoisted(()=>({sql:vi.fn().mockResolvedValue([])}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:'test-session'})})}));
vi.mock('@neondatabase/serverless',()=>({neon:()=>sql}));
import {writeWorkspace} from '../lib/storage';
it('actual Neon INSERT payload cannot contain a BYOK key even if accidentally copied into research text',async()=>{
 vi.stubEnv('DATABASE_URL','test-only');
 const key=['sk','test','B'.repeat(32)].join('-');
 const w:Workspace={version:2,runs:[],notes:[],preferences:{metrics:key},pinned:[key]};
 await writeWorkspace(w);
 const captured=JSON.stringify(sql.mock.calls);expect(captured.includes(key)).toBe(false);expect(captured).toContain('[REDACTED]');
 vi.unstubAllEnvs();
});
