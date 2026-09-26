// Run only against an explicitly identified disposable PostgreSQL database.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

async function main() {
    if (!process.env.P0_TEST_DB_URL) throw new Error('Set P0_TEST_DB_URL to a disposable database');
    const url = new URL(process.env.P0_TEST_DB_URL);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        throw new Error('P0_TEST_DB_URL must point to a disposable localhost database');
    }
    const client = new Client({ connectionString: process.env.P0_TEST_DB_URL });
    await client.connect();
    try {
        const existing = await client.query("select count(*)::integer as total from pg_tables where schemaname in ('public', 'auth', 'storage')");
        if (existing.rows[0].total !== 0) throw new Error('P0 database must be empty; refusing to modify existing tables');
        await client.query('begin');
        await client.query('create schema if not exists auth');
        await client.query('create table if not exists auth.users (id uuid primary key)');
        await client.query('create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting(\'request.jwt.claim.sub\', true), \'\')::uuid $$');
        await client.query('create schema if not exists storage');
        await client.query('create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null)');
        await client.query('create table if not exists storage.buckets (id text primary key, public boolean not null default false)');
        await client.query('alter table storage.objects enable row level security');
        await client.query("create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$");
        await client.query('do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$');
        for (const table of ['storage.objects']) await client.query(`grant all on ${table} to authenticated`);
        const migrations = fs.readdirSync(path.join(__dirname, '../src/infrastructure/supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
        for (const name of migrations.filter(name => !/^0(07|08|09|10|11|12)_/.test(name))) {
            await client.query(fs.readFileSync(path.join(__dirname, '../src/infrastructure/supabase/migrations', name), 'utf8'));
        }
        const a = '11111111-1111-4111-8111-111111111111';
        const b = '22222222-2222-4222-8222-222222222222';
        const w = '33333333-3333-4333-8333-333333333333';
        const e = '44444444-4444-4444-8444-444444444444';
        await client.query('insert into auth.users (id) values ($1), ($2)', [a, b]);
        await client.query('insert into workouts (id, name, type, user_id) values ($1, $2, $3, $4)', [w, 'Private', 'HIT', a]);
        await client.query('insert into exercises (id, workout_id, name) values ($1, $2, $3)', [e, w, 'Private exercise']);
        await client.query(fs.readFileSync(path.join(__dirname, '../src/infrastructure/supabase/migrations/009_p0_atomic_workout.sql'), 'utf8'));
        await client.query(fs.readFileSync(path.join(__dirname, '../src/infrastructure/supabase/migrations/010_p0_atomic_import.sql'), 'utf8'));
        await client.query(fs.readFileSync(path.join(__dirname, '../src/infrastructure/supabase/migrations/011_p0_atomic_session.sql'), 'utf8'));
        await client.query('savepoint atomic_update');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        await client.query('select save_workout_atomically($1::jsonb, $2::jsonb)', [
            JSON.stringify({ id: w, name: 'Private', type: 'HIT', user_id: a, updated_at: new Date().toISOString() }),
            JSON.stringify([{ id: e, workout_id: w, name: 'Private exercise', order_index: 0 }]),
        ]);
        assert.equal((await client.query('select id from exercises where workout_id = $1', [w])).rows[0].id,
            e, 'editing must retain exercise IDs');
        await client.query('select save_workout_atomically($1::jsonb, $2::jsonb)', [
            JSON.stringify({ id: w, name: 'Private', type: 'HIT', user_id: a, updated_at: new Date().toISOString() }),
            JSON.stringify([{ id: e, workout_id: w, name: 'Private exercise', order_index: 0 }]),
        ]);
        assert.equal((await client.query('select id from exercises where workout_id = $1', [w])).rowCount,
            1, 'retrying an edit must not duplicate exercises');
        await assert.rejects(client.query('select save_workout_atomically($1::jsonb, $2::jsonb)', [
            JSON.stringify({ id: w, name: 'Changed', type: 'HIT', user_id: a, updated_at: new Date().toISOString() }),
            JSON.stringify([{ id: '55555555-5555-4555-8555-555555555555', workout_id: w, name: null }]),
        ]), /null value in column "name"/);
        await client.query('rollback to savepoint atomic_update');
        const unchanged = await client.query('select name from workouts where id = $1', [w]);
        assert.equal(unchanged.rows[0].name, 'Private', 'failed edit must retain previous workout');
        const unchangedExercises = await client.query('select name from exercises where workout_id = $1', [w]);
        assert.equal(unchangedExercises.rows[0].name, 'Private exercise', 'failed edit must retain previous exercises');
        await client.query('savepoint atomic_create');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        const newWorkout = '66666666-6666-4666-8666-666666666666';
        await assert.rejects(client.query('select create_workout_atomically($1::jsonb, $2::jsonb)', [
            JSON.stringify({ id: newWorkout, name: 'New', type: 'HIT', user_id: a, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
            JSON.stringify([{ id: '77777777-7777-4777-8777-777777777777', workout_id: newWorkout, name: null }]),
        ]), /null value in column "name"/);
        await client.query('rollback to savepoint atomic_create');
        const absentWorkout = await client.query('select id from workouts where id = $1', [newWorkout]);
        assert.equal(absentWorkout.rowCount, 0, 'failed exercise insert must not create workout');
        await client.query('savepoint failed_import');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        const mealId = '88888888-8888-4888-8888-888888888888';
        const validMeal = [{ id: mealId, day: 'Monday', time: '08:00', activity: 'Breakfast', description: 'Eggs', biological_objective: 'Energy' }];
        const invalidWorkout = [{ id: newWorkout, name: 'Invalid', type: 'INVALID', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), exercises: [] }];
        await assert.rejects(client.query('select import_plan_atomically($1, $2::jsonb, $3::jsonb, $4)', [
            'import-retry-1', JSON.stringify(validMeal), JSON.stringify(invalidWorkout), a,
        ]), /check constraint/);
        await client.query('rollback to savepoint failed_import');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        assert.equal((await client.query('select id from meal_plan_entries where id = $1', [mealId])).rowCount, 0, 'failed workout must not leave meal rows');
        assert.equal((await client.query('select import_id from plan_imports')).rowCount, 0, 'failed import must remain retryable');
        await client.query('select import_plan_atomically($1, $2::jsonb, $3::jsonb, $4)', [
            'import-retry-1', JSON.stringify(validMeal), JSON.stringify([{ ...invalidWorkout[0], type: 'HIT' }]), a,
        ]);
        await client.query('select import_plan_atomically($1, $2::jsonb, $3::jsonb, $4)', [
            'import-retry-1', JSON.stringify(validMeal), JSON.stringify([{ ...invalidWorkout[0], type: 'HIT' }]), a,
        ]);
        assert.equal((await client.query('select id from meal_plan_entries where id = $1', [mealId])).rowCount, 1, 'retry must not duplicate meals');
        assert.equal((await client.query('select id from workouts where id = $1', [newWorkout])).rowCount, 1, 'retry must not duplicate workouts');
        await client.query('update workouts set name = $1 where id = $2', ['Changed after import', newWorkout]);
        await client.query('select import_plan_atomically($1, $2::jsonb, $3::jsonb, $4)', [
            'import-retry-1', JSON.stringify(validMeal), JSON.stringify([{ ...invalidWorkout[0], type: 'HIT' }]), a,
        ]);
        assert.equal((await client.query('select name from workouts where id = $1', [newWorkout])).rows[0].name,
            'Changed after import', 'late retry must not overwrite edits');
        await client.query('savepoint cross_account_import');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [b]);
        await assert.rejects(client.query('select import_plan_atomically($1, $2::jsonb, $3::jsonb, $4)', [
            'import-retry-1', JSON.stringify(validMeal), JSON.stringify([]), a,
        ]), /Import owner mismatch/);
        await client.query('rollback to savepoint cross_account_import');
        await client.query('insert into workout_sessions (workout_id, started_at, user_id) values ($1, now(), $2)', [w, a]);
        const historicalSession = await client.query('select id from workout_sessions where workout_id = $1', [w]);
        await client.query('insert into completed_sets (session_id, exercise_id, set_number, reps_completed, completed_at, user_id) values ($1, $2, 1, 10, now(), $3)', [historicalSession.rows[0].id, e, a]);
        await client.query('savepoint failed_session');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        await assert.rejects(client.query('select save_session_atomically($1::jsonb, $2::jsonb)', [
            JSON.stringify({ id: historicalSession.rows[0].id, workout_id: w, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), user_id: a }),
            JSON.stringify([{ id: '99999999-9999-4999-8999-999999999999', session_id: historicalSession.rows[0].id, exercise_id: e, set_number: 2, reps_completed: null, completed_at: new Date().toISOString() }]),
        ]), /null value in column "reps_completed"/);
        await client.query('rollback to savepoint failed_session');
        assert.equal((await client.query('select finished_at from workout_sessions where id = $1', [historicalSession.rows[0].id])).rows[0].finished_at, null, 'failed set must not finish session');
        await client.query("insert into storage.buckets (id, public) values ('exams', true), ('photos', true)");
        await client.query('insert into storage.objects (bucket_id, name) values ($1, $2), ($3, $4)', ['exams', `${a}/blood.pdf`, 'photos', `${a}/front.jpg`]);
        const privacyMigration = fs.readFileSync(path.join(__dirname, '../src/infrastructure/supabase/migrations/007_p0_account_isolation.sql'), 'utf8');
        await client.query(privacyMigration);
        await client.query(fs.readFileSync(path.join(__dirname, '../src/infrastructure/supabase/migrations/008_p0_history_retention.sql'), 'utf8'));
        const buckets = await client.query("select id from storage.buckets where public = true and id in ('exams', 'photos')");
        assert.equal(buckets.rowCount, 0, 'private buckets must not expose files through public URLs');
        await client.query('grant usage on schema public, auth, storage to authenticated');
        await client.query('grant all on all tables in schema public to authenticated');
        await client.query('set role authenticated');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [b]);
        const rows = await client.query('select id from exercises');
        assert.equal(rows.rowCount, 0, 'account B must not read account A exercises');
        const objects = await client.query('select name from storage.objects');
        assert.equal(objects.rowCount, 0, 'account B must not read account A files');
        await client.query('savepoint cross_account_insert');
        await assert.rejects(
            client.query('insert into exercises (workout_id, name) values ($1, $2)', [w, 'stolen']),
            /row-level security/,
        );
        await client.query('rollback to savepoint cross_account_insert');
        await client.query('savepoint cross_account_file');
        await assert.rejects(client.query('insert into storage.objects (bucket_id, name) values ($1, $2)', ['exams', `${a}/stolen.pdf`]), /row-level security/);
        await client.query('rollback to savepoint cross_account_file');
        await client.query('savepoint cross_account_session');
        await assert.rejects(client.query('insert into workout_sessions (workout_id, started_at, user_id) values ($1, now(), $2)', [w, b]), /owner|row-level security/i);
        await client.query('rollback to savepoint cross_account_session');
        await client.query('savepoint cross_account_set');
        await assert.rejects(client.query('insert into completed_sets (session_id, exercise_id, set_number, reps_completed, completed_at, user_id) values ($1, $2, 2, 5, now(), $3)', [historicalSession.rows[0].id, e, b]), /owner/i);
        await client.query('rollback to savepoint cross_account_set');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        const ownExercises = await client.query('select id from exercises');
        assert.equal(ownExercises.rowCount, 1, 'account A must see its exercises');
        const ownObjects = await client.query('select name from storage.objects');
        assert.equal(ownObjects.rowCount, 2, 'account A must see its files');
        const ownSessions = await client.query('select id from workout_sessions');
        assert.equal(ownSessions.rowCount, 1, 'account A must see its session');
        await client.query('savepoint foreign_file_update');
        await assert.rejects(client.query('update storage.objects set name = $1 where name = $2', [`${b}/moved.pdf`, `${a}/blood.pdf`]), /row-level security/);
        await client.query('rollback to savepoint foreign_file_update');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        await client.query('reset role');
        await client.query('delete from workouts where id = $1', [w]);
        const sessions = await client.query('select * from workout_sessions where user_id = $1', [a]);
        assert.equal(sessions.rowCount, 1, 'deleting a workout must preserve completed history');
        assert.equal(sessions.rows[0].workout_id, w, 'history must keep its original model id');
        assert.equal(sessions.rows[0].workout_name, 'Private', 'history must retain workout name');
        const sets = await client.query('select * from completed_sets where session_id = $1', [sessions.rows[0].id]);
        assert.equal(sets.rows[0].exercise_name, 'Private exercise', 'history must retain exercise name');
        assert.equal(sets.rows[0].reps_completed, 10, 'history must retain performed repetitions');
        await client.query('select save_session_atomically($1::jsonb, $2::jsonb)', [
            JSON.stringify({ id: sessions.rows[0].id, workout_id: w, started_at: sessions.rows[0].started_at, finished_at: new Date().toISOString(), user_id: a }),
            JSON.stringify([]),
        ]);
        assert.notEqual((await client.query('select finished_at from workout_sessions where id = $1', [sessions.rows[0].id])).rows[0].finished_at,
            null, 'session already started must be finishable after its model is deleted');
        await client.query('savepoint foreign_history');
        await client.query('set role authenticated');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [b]);
        assert.equal((await client.query('select id from workout_sessions')).rowCount, 0,
            'account B must not read account A retained history');
        await client.query('reset role');
        await client.query('rollback to savepoint foreign_history');
        await client.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
        await client.query('update completed_sets set exercise_name = $1 where session_id = $2', ['Forged', sessions.rows[0].id]);
        assert.equal((await client.query('select exercise_name from completed_sets where session_id = $1', [sessions.rows[0].id])).rows[0].exercise_name, 'Private exercise', 'historical snapshot is immutable');
        await client.query('delete from workout_sessions where id = $1', [sessions.rows[0].id]);
        assert.equal((await client.query('select id from completed_sets where session_id = $1', [sessions.rows[0].id])).rowCount, 0,
            'explicit session deletion must remove its own sets');
        console.log('P0 two-account RLS: pass');
    } finally {
        await client.query('rollback');
        await client.end();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
