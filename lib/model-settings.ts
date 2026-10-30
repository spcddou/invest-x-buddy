export const DEFAULT_MODEL='gpt-4o-mini';
export const MODELS=['gpt-4o-mini','gpt-5.6-terra'] as const;
export type ModelSettings={key:string;model:string;remember:boolean};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const slot='ixb-model-settings';
export function loadSettings(session:Store,local:Store):ModelSettings{
 const raw=session.getItem(slot)||local.getItem(slot);
 if(raw){try{const s=JSON.parse(raw);if(typeof s.key==='string'&&MODELS.includes(s.model))return {key:s.key,model:s.model,remember:s.remember===true};}catch{/* Invalid browser settings are ignored. */}}
 return {key:'',model:DEFAULT_MODEL,remember:false};
}
export function clearSettings(session:Store,local:Store){session.removeItem(slot);local.removeItem(slot);}
export function saveSettings(s:ModelSettings,session:Store,local:Store){clearSettings(session,local);if(s.key)(s.remember?local:session).setItem(slot,JSON.stringify(s));}
export function modelHeaders(session:Store,local:Store):Record<string,string>{const s=loadSettings(session,local);return s.key?{'x-openai-key':s.key,'x-openai-model':s.model}:{};}
