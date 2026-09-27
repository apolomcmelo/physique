const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

async function main() {
    const url = process.env.P2_TEST_DB_URL;
    if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Use an empty disposable localhost P2_TEST_DB_URL');
    const db = new Client({ connectionString: url });
    await db.connect();
    try {
        const existing = await db.query("select count(*)::integer as n from pg_tables where schemaname in ('public','auth','storage')");
        if (existing.rows[0].n) throw new Error('Refusing nonempty database');
        await db.query('begin');
        await db.query('create schema auth; create table auth.users(id uuid primary key)');
        await db.query("create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$");
        await db.query('create schema storage; create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text); create table storage.buckets (id text primary key, public boolean default false); alter table storage.objects enable row level security');
        await db.query("create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$");
        await db.query('do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$');
        const dir = path.join(__dirname, '../src/infrastructure/supabase/migrations');
        for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) await db.query(fs.readFileSync(path.join(dir,name),'utf8'));
        const a = '11111111-1111-4111-8111-111111111111';
        const b = '22222222-2222-4222-8222-222222222222';
        await db.query('insert into auth.users(id) values($1),($2)', [a,b]);
        assert.equal((await db.query("select count(*)::integer as n from information_schema.columns where table_name='user_profiles' and column_name='timezone'")).rows[0].n,1);
        await db.query('grant usage on schema public,auth to authenticated; grant all on all tables in schema public to authenticated');
        await db.query('set role authenticated');
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
        const startsAt = new Date(Date.now() + 86400000).toISOString();
        const version = { id:'csv-one',startsAt,timezone:'UTC',anchorDay:'Quarta-feira',anchorTime:'10:00',meals:[],workouts:[],rows:[] };
        const proposal = { version, startsAt, replaces:null };
        await db.query('select confirm_routine_version($1,$2::jsonb,$3::jsonb)',[a,JSON.stringify({active:null,pending:version}),JSON.stringify(proposal)]);
        assert.equal((await db.query('select count(*)::integer as n from routine_versions')).rows[0].n,1);
        const edited = { ...version, rows:[{ id:'csv-one:0', activity:'Café' }] };
        await db.query('select edit_routine_version($1,$2,$3::jsonb)',[a,'csv-one',JSON.stringify(edited)]);
        assert.equal((await db.query("select content->'rows'->0->>'activity' as activity from routine_versions where user_id=$1",[a])).rows[0].activity,'Café');
        await db.query('select confirm_routine_version($1,$2::jsonb,$3::jsonb)',[a,JSON.stringify({active:null,pending:version}),JSON.stringify(proposal)]);
        assert.equal((await db.query('select count(*)::integer as n from routine_versions')).rows[0].n,1);
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
        assert.equal((await db.query('select count(*)::integer as n from routine_versions')).rows[0].n,0);
        await db.query('savepoint bad_owner');
        await assert.rejects(db.query('select confirm_routine_version($1,$2::jsonb,$3::jsonb)',[a,'{}',JSON.stringify(proposal)]),/Routine owner mismatch/);
        await db.query('rollback to savepoint bad_owner');
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
        await db.query('insert into routine_occurrences(user_id,occurrence_id,version_id,scheduled_at,outcome) values($1,$2,$3,now(),$4)',[a,'csv-one:0:2026-09-23','csv-one','skipped']);
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
        assert.equal((await db.query('select count(*)::integer as n from routine_occurrences')).rows[0].n,0);
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
        await db.query('select edit_routine_version($1,$2,$3::jsonb)',[a,'csv-one',JSON.stringify(edited)]);
        assert.equal((await db.query('select count(*)::integer as n from routine_occurrences')).rows[0].n,1);
        await db.query('select reschedule_pending_routine($1,$2::jsonb)',[a,JSON.stringify({ ...edited,timezone:'America/Sao_Paulo',startsAt:new Date(Date.now()+172800000).toISOString() })]);
        assert.equal((await db.query("select timezone from routine_versions where slot='pending' and user_id=$1",[a])).rows[0].timezone,'America/Sao_Paulo');
        assert.equal((await db.query('select count(*)::integer as n from routine_occurrences')).rows[0].n,1);
        console.log('P2 owner isolation, retry and migration: pass');
    } finally { await db.query('rollback'); await db.end(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
