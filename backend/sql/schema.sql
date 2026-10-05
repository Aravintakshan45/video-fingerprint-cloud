create extension if not exists "pgcrypto";

create table if not exists sessions (
    id          uuid primary key default gen_random_uuid(),
    label       text,
    started_at  timestamptz not null default now()
);

create table if not exists fingerprints (
    id          uuid primary key default gen_random_uuid(),
    frame_hash  text not null unique,
    client_ts   timestamptz not null,
    created_at  timestamptz not null default now(),
    session_id  uuid not null references sessions(id) on delete cascade,
    line_no     integer not null
);

create index if not exists idx_fp_created_at on fingerprints (created_at desc);
create index if not exists idx_fp_session    on fingerprints (session_id);
