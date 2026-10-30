import {redactSecrets} from './privacy';
import {cookies} from 'next/headers';
import {neon} from '@neondatabase/serverless';
import type {Workspace} from './harness';
async function session(){const jar=await cookies();let key=jar.get('ixb_session')?.value;if(!key){key=crypto.randomUUID();jar.set('ixb_session',key,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:31536000,path:'/'});}return key;}
async function database(){if(!process.env.DATABASE_URL)return null;const sql=neon(process.env.DATABASE_URL);await sql`CREATE TABLE IF NOT EXISTS buddy_workspaces (id text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz DEFAULT now())`;return sql;}
export async function readWorkspace(){const id=await session(),sql=await database();if(!sql)return {mode:'local',workspace:null};const rows=await sql`SELECT payload FROM buddy_workspaces WHERE id=${id}`;return {mode:'Neon · 匿名会话隔离',workspace:(rows[0]?.payload||null) as Workspace|null};}
export async function writeWorkspace(w:Workspace){const id=await session(),sql=await database();if(!sql)return {mode:'local'};await sql`INSERT INTO buddy_workspaces (id,payload) VALUES (${id},${JSON.stringify(redactSecrets(w))}::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`;return {mode:'Neon · 已同步'};}
