import {it,expect,vi} from 'vitest';
import {makePlan,stopReason,compressContext,canRunTool,remainingSteps} from '../lib/harness';
import {requestSource} from '../lib/providers';
it('resumes only unfinished steps',()=>{const p=makePlan('主营业务');expect(remainingSteps(p,[{stepId:p[0].id,status:'ok'}]).some(s=>s.id===p[0].id)).toBe(false)});
it('stops on user, call, wall and repeated failure budgets',()=>{
 expect(stopReason({calls:10,cost:0,elapsed:0,failures:0,stopped:false})).toContain('步骤');
 expect(stopReason({calls:1,cost:0,elapsed:181000,failures:0,stopped:false})).toContain('时间');
 expect(stopReason({calls:1,cost:0,elapsed:0,failures:3,stopped:false})).toContain('失败');
 expect(stopReason({calls:1,cost:0,elapsed:0,failures:0,stopped:true})).toContain('用户');
});
it('compresses old results while retaining raw pointers',()=>{const c=compressContext(Array.from({length:6},(_,i)=>({id:'T'+i,summary:'摘要',raw:'长'.repeat(2000)})),300);expect(c.after).toBeLessThan(c.before);expect(c.items[0].pointer).toBe('T0');expect(c.items[0].compressed).toBe(true)});
it('denies memory writes without explicit current approval',()=>{expect(canRunTool('memory_write',false)).toBe(false);expect(canRunTool('get_quote',false)).toBe(true)});
it('retries once then preserves failure',async()=>{const f=vi.fn().mockResolvedValue(new Response('',{status:503}));const r=await requestSource('test:x','https://example.com',f);expect(f).toHaveBeenCalledTimes(2);expect(r.retries).toBe(1);expect(r.status).toBe('error')});
