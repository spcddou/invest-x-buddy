export type Stance = 'support' | 'against' | 'unknown';
export type Company = { code: string; name: string };
export type SourceResult = { id:string; provider:string; title:string; url:string; fetchedAt:string; status:'ok'|'error'|'empty'|'disabled'; reason?:string; raw:unknown; primary:boolean; retries?:number; latency?:number; asOf?:string; cacheHit?:boolean };
export type Evidence = { id:string; sourceId:string; title:string; text:string; stance:Stance; metric:string; period:string; values:Record<string,number>; raw:unknown; url:string; fetchedAt:string; primary:boolean; limitation:string; asOf?:string; unit?:string; basis?:string; stale?:boolean; provider?:string };
export type Question = { question:string; metric:string; call:string };
export type Claim = { text:string; evidenceIds:string[]; kind?:'事实'|'推断'|'不确定' };
export type Conflict = { title:string; evidenceIds:string[]; resolution:string };
export type Research = { id:string; company:Company; thesis:string; revised:string; period:string; focus:string; questions:Question[]; sources:SourceResult[]; evidence:Evidence[]; claims:Claim[]; conflicts:Conflict[]; flips:{condition:string; action:string; evidenceIds:string[]}[]; ai:{mode:string; reason:string;tokens?:number}; numberCheck:{ok:boolean; rejected:string[]}; createdAt:string };
