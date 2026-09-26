-- PORKONIA OS — brouillon de schéma PostgreSQL (phase 2)
-- STATUT : NON APPLIQUÉ. Aucun projet Supabase n'a été créé.
-- Pas de Supabase Storage : les médias sont des références (URL / chemins).

create table if not exists admins (user_id uuid primary key);

create table characters (
  id text primary key, revision int not null, created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, is_demo boolean not null default false, provenance jsonb not null,
  data jsonb not null  -- champs métier (cf. docs/DATA_MODEL.md)
);
create table articles (
  id text primary key, slug text not null unique, aliases text[] not null default '{}', status text not null
    check (status in ('brouillon','valide','publie')),
  revision int not null, created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, is_demo boolean not null default false, provenance jsonb not null, data jsonb not null
);
create table media (
  id text primary key, location text not null check (location in ('externe','locale')), ref text not null,
  sha256 text, canon_status text not null, variant_of text references media(id),
  revision int not null, created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, is_demo boolean not null default false, provenance jsonb not null, data jsonb not null,
  unique (location, ref)
);
create table bible_entries (
  id text primary key, category text not null, revision int not null, created_at timestamptz not null,
  updated_at timestamptz not null, deleted_at timestamptz, is_demo boolean not null default false,
  provenance jsonb not null, data jsonb not null
);
create table revisions (
  id text primary key, entity_type text not null, entity_id text not null, revision int not null,
  snapshot jsonb not null, message text not null, created_at timestamptz not null,
  unique (entity_type, entity_id, revision)
);
create table publications (
  id text primary key, number int not null unique, created_at timestamptz not null, note text not null default '',
  articles jsonb not null, manifest jsonb not null, content_hash text not null, restored_from int,
  verification text not null default 'non-verifiee', verification_note text, verified_at timestamptz
);
create table operation_log (id text primary key, at timestamptz not null, action text not null,
  entity_type text, entity_id text, summary text not null);

-- Immuabilité du contenu publié : seules les colonnes de vérification peuvent changer.
create or replace function forbid_publication_content_update() returns trigger language plpgsql as $$
begin
  if new.articles is distinct from old.articles or new.manifest is distinct from old.manifest
     or new.content_hash is distinct from old.content_hash or new.number is distinct from old.number then
    raise exception 'Le contenu d''une publication est immuable';
  end if;
  return new;
end $$;
create trigger publications_immutable before update on publications
  for each row execute function forbid_publication_content_update();

-- RLS : tout est privé (administrateurs uniquement) ; lecture publique limitée aux publications.
alter table characters enable row level security;
alter table articles enable row level security;
alter table media enable row level security;
alter table bible_entries enable row level security;
alter table revisions enable row level security;
alter table publications enable row level security;
alter table operation_log enable row level security;
alter table admins enable row level security;

create policy admin_all_characters on characters for all using (auth.uid() in (select user_id from admins));
create policy admin_all_articles on articles for all using (auth.uid() in (select user_id from admins));
create policy admin_all_media on media for all using (auth.uid() in (select user_id from admins));
create policy admin_all_bible on bible_entries for all using (auth.uid() in (select user_id from admins));
create policy admin_read_revisions on revisions for select using (auth.uid() in (select user_id from admins));
create policy admin_insert_revisions on revisions for insert with check (auth.uid() in (select user_id from admins));
create policy admin_all_log on operation_log for select using (auth.uid() in (select user_id from admins));
create policy admin_insert_log on operation_log for insert with check (auth.uid() in (select user_id from admins));
create policy admin_write_publications on publications for insert with check (auth.uid() in (select user_id from admins));
create policy admin_verify_publications on publications for update using (auth.uid() in (select user_id from admins));
create policy public_read_publications on publications for select using (true);
-- Aucune politique DELETE : pas de suppression physique via l'API.
