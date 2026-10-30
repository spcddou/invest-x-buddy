import {test,expect} from '@playwright/test';
// No real key in this suite. Disable artifacts to keep this invariant if reused manually.
test.use({trace:'off',screenshot:'off',video:'off'});
test('visible masked BYOK, session/remember/forget, invalid key explicitly falls back',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'生成研究计划'})).toBeEnabled({timeout:30000});
 const key='invalid-evaluator-placeholder';const field=page.getByLabel('OpenAI API key',{exact:true});
 await expect(field).toHaveAttribute('type','password');await field.fill(key);await page.getByRole('button',{name:'保存 key',exact:true}).click();await expect(field).toHaveValue('');
 expect(await page.evaluate(()=>Boolean(sessionStorage.getItem('ixb-model-settings')))).toBe(true);expect(await page.evaluate(()=>localStorage.getItem('ixb-model-settings'))).toBeNull();
 await page.getByRole('button',{name:'生成研究计划'}).click();await expect(page.getByTestId('model-mode')).toHaveText('规则回退');await expect(page.locator('.mode-detail')).toContainText('格式无效');
 await page.getByLabel('记住 key',{exact:true}).check();await page.reload();await expect(field).toHaveValue('');await expect(field).toHaveAttribute('placeholder',/已保存/);
 expect(await page.evaluate(()=>Boolean(localStorage.getItem('ixb-model-settings')))).toBe(true);expect(await page.evaluate(()=>sessionStorage.getItem('ixb-model-settings'))).toBeNull();
 await page.getByRole('button',{name:'清除 / 忘记 key'}).click();expect(await page.evaluate(()=>localStorage.getItem('ixb-model-settings')||sessionStorage.getItem('ixb-model-settings'))).toBeNull();
});
