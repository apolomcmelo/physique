// Use only an empty, disposable localhost PostgreSQL instance.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

async function main() {
    const connectionString = process.env.P1_TEST_DB_URL;
    if (!connectionString || !['127.0.0.1', 'localhost'].includes(new URL(connectionString).hostname)) {
        throw new Error('P1_TEST_DB_URL must identify a disposable localhost database');
    }
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const { rows } = await client.query("select count(*)::integer as total from pg_tables where schemaname in ('public', 'auth', 'storage')");
        if (rows[0].total !== 0) throw new Error('Refusing to modify an existing database');
        await client.query('begin');
        await client.query('create schema auth');
        await client.query('create table auth.users (id uuid primary key)');
        await client.query("create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$");
        await client.query('create schema storage');
        await client.query('create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null)');
        await client.query('create table storage.buckets (id text primary key, public boolean not null default false)');
        await client.query('alter table storage.objects enable row level security');
        await client.query("create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$");
        await client.query('do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$');
        const migrationDir = path.join(__dirname, '../src/infrastructure/supabase/migrations');
        for (const name of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
            await client.query(fs.readFileSync(path.join(migrationDir, name), 'utf8'));
        }
        const owner = '11111111-1111-4111-8111-111111111111';
        const workoutId = '33333333-3333-4333-8333-333333333333';
        const exerciseId = '44444444-4444-4444-8444-444444444444';
        const sessionId = '55555555-5555-4555-8555-555555555555';
        const setId = '66666666-6666-4666-8666-666666666666';
        await client.query('insert into auth.users (id) values ($1)', [owner]);
        await client.query('insert into workouts (id, name, type, user_id) values ($1, $2, $3, $4)', [workoutId, 'HIT', 'HIT', owner]);
        await client.query('insert into exercises (id, workout_id, name, sets, duration_seconds) values ($1, $2, $3, $4, $5)', [exerciseId, workoutId, 'Treino HIT', 1, 1500]);
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
        const session = { id: sessionId, workout_id: workoutId, user_id: owner, started_at: '2026-09-25T10:00:00Z', finished_at: '2026-09-25T10:25:00Z', status: 'partial' };
        const set = { id: setId, session_id: sessionId, exercise_id: exerciseId, set_number: 1, reps_completed: 0, weight_used_kg: null, duration_seconds: 1410, completed_at: '2026-09-25T10:23:30Z' };
        await client.query('select save_session_atomically($1::jsonb, $2::jsonb)', [JSON.stringify(session), JSON.stringify([set])]);
        const savedSession = await client.query('select status, workout_name from workout_sessions where id = $1', [sessionId]);
        const savedSet = await client.query('select duration_seconds, prescribed_duration_seconds from completed_sets where id = $1', [setId]);
        assert.deepEqual(savedSession.rows[0], { status: 'partial', workout_name: 'HIT' });
        assert.equal(savedSet.rows[0].duration_seconds, 1410);
        assert.equal(savedSet.rows[0].prescribed_duration_seconds, 1500);
        await client.query('select save_session_atomically($1::jsonb, $2::jsonb)', [JSON.stringify(session), JSON.stringify([set])]);
        assert.equal((await client.query('select id from completed_sets where session_id = $1', [sessionId])).rowCount, 1);
        await client.query('delete from workouts where id = $1', [workoutId]);
        assert.equal((await client.query('select workout_name from workout_sessions where id = $1', [sessionId])).rows[0].workout_name, 'HIT');
        await client.query('select save_session_atomically($1::jsonb, $2::jsonb)', [JSON.stringify({ ...session, finished_at: '2026-09-25T10:26:00Z' }), JSON.stringify([{ ...set, duration_seconds: 1390 }])]);
        assert.equal((await client.query('select duration_seconds from completed_sets where id = $1', [setId])).rows[0].duration_seconds, 1390,
            'correction must work after deleting the model');
        await client.query('select save_session_atomically($1::jsonb, $2::jsonb)', [JSON.stringify({ ...session, started_at: '2026-09-24T10:00:00Z' }), JSON.stringify([])]);
        assert.equal((await client.query('select started_at from workout_sessions where id = $1', [sessionId])).rows[0].started_at.toISOString(), '2026-09-24T10:00:00.000Z');
        await client.query('delete from workout_sessions where id = $1', [sessionId]);
        assert.equal((await client.query('select id from completed_sets where session_id = $1', [sessionId])).rowCount, 0,
            'discard must delete only the selected session and its sets');
        console.log('P1 PostgreSQL session/actuals/partial/history: pass');
    } finally { await client.query('rollback'); await client.end(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
