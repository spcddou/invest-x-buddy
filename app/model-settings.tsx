'use client';
import {useEffect,useState} from 'react';
import {DEFAULT_MODEL,loadSettings,saveSettings,clearSettings} from '@/lib/model-settings';
export default function ModelSettings({busy,live,onChange}:{busy:boolean;live:{mode:string;reason:string};onChange:()=>void}){
 const [draft,setDraft]=useState(''),[model,setModel]=useState(DEFAULT_MODEL),[remember,setRemember]=useState(false),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const s=loadSettings(sessionStorage,localStorage);setModel(s.model);setRemember(s.remember);setSaved(Boolean(s.key));},[]);
 return <section className="panel model-settings" aria-label="模型设置">
  <div className="section-heading"><h2>模型设置</h2><strong className={'badge '+(live.mode==='规则回退'?'amber':'')} data-testid="model-mode">{live.mode}</strong></div>
  <p className="mode-detail" role="status">{live.reason}</p>
  <div className="model-fields"><label>OpenAI API key<input aria-label="OpenAI API key" type="password" autoComplete="off" spellCheck={false} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={saved?'已保存（不回显）；输入可替换':'粘贴你的 key，仅用于本次请求'} disabled={busy}/></label>
  <label>模型<select aria-label="模型" value={model} disabled={busy} onChange={e=>{const next=e.target.value;setModel(next);const s=loadSettings(sessionStorage,localStorage);if(s.key){saveSettings({...s,model:next},sessionStorage,localStorage);onChange();}}}><option value="gpt-4o-mini">gpt-4o-mini · 低成本 / 官方已标弃用</option><option value="gpt-5.6-terra">gpt-5.6-terra · 当前模型 / 费用较高</option></select></label></div>
  <div className="model-actions"><label><input aria-label="记住 key" type="checkbox" checked={remember} disabled={busy} onChange={e=>{const next=e.target.checked;setRemember(next);const s=loadSettings(sessionStorage,localStorage);if(s.key)saveSettings({...s,remember:next},sessionStorage,localStorage);}}/>记住（本机 localStorage）</label>
  <button className="secondary" disabled={busy||!draft.trim()} onClick={()=>{saveSettings({key:draft.trim(),model,remember},sessionStorage,localStorage);setDraft('');setSaved(true);setMessage('已保存；下次调用将验证 key 与模型权限。');onChange();}}>保存 key</button>
  <button className="text-button" disabled={busy} onClick={()=>{clearSettings(sessionStorage,localStorage);setDraft('');setSaved(false);setRemember(false);setMessage('已清除本浏览器 key。下次请求使用 Gateway 或规则回退。');onChange();}}>清除 / 忘记 key</button></div>
  {message&&<p role="status">{message}</p>}
  <small>默认仅本标签页 sessionStorage。key 通过 HTTPS 请求头交给本站 API，再直接调用 OpenAI；不写数据库、运行轨迹或导出。费用由你的 OpenAI 账户承担。记住后同源脚本可访问 key，请勿在共享设备使用。</small>
 </section>;
}
