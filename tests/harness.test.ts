import { expect,it } from 'vitest';
import { makePlan,validatePlan,needsConfirmation,evaluateTriggers,MAX_STEPS } from '../lib/harness';
it('validates editable dependency order and mandatory verifier',()=>{
 const p=makePlan('估值回落但基本面未恶化'); expect(validatePlan(p).ok).toBe(true);
 expect(validatePlan([...p].reverse()).ok).toBe(false);
 expect(validatePlan(p.filter(s=>s.tool!=='verify_thesis')).ok).toBe(false);
});
it('rejects excess budget and duplicate IDs',()=>{
 const p=makePlan('主营业务');expect(validatePlan([...p,...p]).ok).toBe(false);
 expect(MAX_STEPS).toBe(10);
});
it('gates clarification budget conflict and memory writes',()=>{
 expect(needsConfirmation('clarification',false)).toBe(true);
 expect(needsConfirmation('memory',false)).toBe(true);
 expect(needsConfirmation('conflict',true)).toBe(false);
 expect(needsConfirmation('budget',false)).toBe(true);
});
it('monitor distinguishes missing data from no trigger',()=>{
 const e=(n:number)=>[{metric:'KCFJCXSYJLRTZ',values:{v:n},period:'2026-06-30'}];
 expect(evaluateTriggers(e(3),e(-2))[0].status).toBe('fired');
 expect(evaluateTriggers(e(3),[])[0].status).toBe('unknown');
 expect(evaluateTriggers(e(3),e(4))[0].status).toBe('clear');
});
