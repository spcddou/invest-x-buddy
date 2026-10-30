import { describe, it, expect, vi } from 'vitest';
import { checkNumbers, validateClaims, decompose, classifyGrowth, isAdvice } from '../lib/engine';
import { requestSource, EastmoneyProvider } from '../lib/providers';
const evidence = [{id:'E1', values:{growth:12.35}, raw:{growth:12.34567}, period:'2025-12-31'}];
describe('数字及引用核对',()=>{
 it('allows only normalized evidence values, including rounded display',()=>{
  expect(checkNumbers('增长12.35%',evidence).ok).toBe(true);
  expect(checkNumbers('增长99.1%',evidence).ok).toBe(false);
 });
 it('does not allow numbers merely present in report dates or unrelated raw fields',()=>{
  expect(checkNumbers('增长2025%',evidence).ok).toBe(false);
  expect(checkNumbers('增长12.34567%',evidence).ok).toBe(false);
 });
 it('rejects invalid citations and numbers from uncited evidence',()=>{
  expect(validateClaims([{text:'增长12.35%',evidenceIds:['E9']}],evidence).ok).toBe(false);
  expect(validateClaims([{text:'增长99%',evidenceIds:['E1']}],evidence).ok).toBe(false);
  expect(validateClaims([{text:'增长12.35%',evidenceIds:['E1']}],evidence).ok).toBe(true);
 });
});
describe('conservative fallback',()=>{
 it('maps earnings attribution to specific metric calls without asserting causality',()=>{
  const q=decompose('盈利改善来自主营业务');
  expect(q.some(x=>x.metric==='DEDUCT_PARENT_NETPROFIT')).toBe(true);
  expect(q.every(x=>x.call && x.question)).toBe(true);
 });
 it('maps valuation and external change separately',()=>{
  expect(decompose('估值回落但基本面未恶化').some(x=>x.metric==='historicalPE')).toBe(true);
  expect(decompose('原材料价格变化影响产业链利润分配').some(x=>x.metric==='segmentMargin')).toBe(true);
 });
 it('missing values are unknown, not negative',()=>{
  expect(classifyGrowth(null)).toBe('unknown');
  expect(classifyGrowth(-1)).toBe('against');
  expect(classifyGrowth(2)).toBe('support');
 });
 it('refuses target prices and trade recommendations',()=>{
  for(const s of ['帮我给个目标价','建议买入吗','sell this stock','合理股价是多少','目标股价'])expect(isAdvice(s)).toBe(true);
  expect(isAdvice('扣非利润能否支持主营改善')).toBe(false);
 });
});
describe('provider isolation',()=>{
 it.each([500,503])('makes HTTP %i visible',async(status)=>{
  const mock=vi.fn().mockResolvedValue(new Response('',{status}));
  const x=await requestSource('test','https://example.com',mock);
  expect(x.status).toBe('error');expect(x.reason).toContain(String(status));
 });
 it('empty payload has an explicit status',async()=>{
  const x=await requestSource('test','https://example.com',vi.fn().mockResolvedValue(new Response('null')));
  expect(x.status).toBe('empty');
 });
 it('empty report data has an explicit status',async()=>{
  const x=await requestSource('test','https://example.com',vi.fn().mockResolvedValue(new Response(JSON.stringify({result:{data:[]}}))));
  expect(x.status).toBe('empty');
 });
 it('timeout surfaces after one retry',async()=>{
  const mock=vi.fn().mockRejectedValue(new DOMException('timeout','TimeoutError'));
  const x=await requestSource('test','https://example.com',mock);
  expect(x.status).toBe('error');expect(x.reason).toContain('超时');expect(mock).toHaveBeenCalledTimes(2);
 });
 it('simulated eastmoney failure leaves each source visible',async()=>{
  const x=await new EastmoneyProvider().fetch({code:'600519',name:'贵州茅台'},true);
  expect(x).toHaveLength(4);expect(x.every(s=>s.status==='error'&&s.reason?.includes('演示'))).toBe(true);
 });
});
