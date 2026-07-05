\restrict dbmate

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgboss; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgboss;


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: job_state; Type: TYPE; Schema: pgboss; Owner: -
--

CREATE TYPE pgboss.job_state AS ENUM (
    'created',
    'retry',
    'active',
    'completed',
    'cancelled',
    'failed'
);


--
-- Name: moderation_action_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moderation_action_scope AS ENUM (
    'account'
);


--
-- Name: moderation_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moderation_action_type AS ENUM (
    'warning',
    'ban'
);


--
-- Name: create_queue(text, jsonb); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.create_queue(queue_name text, options jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE
      tablename varchar := CASE WHEN options->>'partition' = 'true'
                            THEN 'j' || encode(sha224(queue_name::bytea), 'hex')
                            ELSE 'job_common'
                            END;
      queue_created_on timestamptz;
    BEGIN

      WITH q as (
        INSERT INTO pgboss.queue (
          name,
          policy,
          retry_limit,
          retry_delay,
          retry_backoff,
          retry_delay_max,
          expire_seconds,
          retention_seconds,
          deletion_seconds,
          warning_queued,
          dead_letter,
          partition,
          table_name,
          heartbeat_seconds
        )
        VALUES (
          queue_name,
          options->>'policy',
          COALESCE((options->>'retryLimit')::int, 2),
          COALESCE((options->>'retryDelay')::int, 0),
          COALESCE((options->>'retryBackoff')::bool, false),
          (options->>'retryDelayMax')::int,
          COALESCE((options->>'expireInSeconds')::int, 900),
          COALESCE((options->>'retentionSeconds')::int, 1209600),
          COALESCE((options->>'deleteAfterSeconds')::int, 604800),
          COALESCE((options->>'warningQueueSize')::int, 0),
          options->>'deadLetter',
          COALESCE((options->>'partition')::bool, false),
          tablename,
          (options->>'heartbeatSeconds')::int
        )
        ON CONFLICT DO NOTHING
        RETURNING created_on
      )
      SELECT created_on into queue_created_on from q;

      IF queue_created_on IS NULL OR options->>'partition' IS DISTINCT FROM 'true' THEN
        RETURN;
      END IF;

      EXECUTE format('CREATE TABLE pgboss.%I (LIKE pgboss.job INCLUDING DEFAULTS)', tablename);

      EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD PRIMARY KEY (name, id)$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD CONSTRAINT q_fkey FOREIGN KEY (name) REFERENCES pgboss.queue (name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD CONSTRAINT dlq_fkey FOREIGN KEY (dead_letter) REFERENCES pgboss.queue (name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED$cmd$, tablename);

      EXECUTE pgboss.job_table_format($cmd$CREATE INDEX job_i5 ON pgboss.job (name, start_after) INCLUDE (priority, created_on, id) WHERE state < 'active'$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i4 ON pgboss.job (name, singleton_on, COALESCE(singleton_key, '')) WHERE state <> 'cancelled' AND singleton_on IS NOT NULL$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$CREATE INDEX job_i7 ON pgboss.job (name, group_id) WHERE state = 'active' AND group_id IS NOT NULL$cmd$, tablename);

      IF options->>'policy' = 'short' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i1 ON pgboss.job (name, COALESCE(singleton_key, '')) WHERE state = 'created' AND policy = 'short'$cmd$, tablename);
      ELSIF options->>'policy' = 'singleton' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i2 ON pgboss.job (name, COALESCE(singleton_key, '')) WHERE state = 'active' AND policy = 'singleton'$cmd$, tablename);
      ELSIF options->>'policy' = 'stately' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i3 ON pgboss.job (name, state, COALESCE(singleton_key, '')) WHERE state <= 'active' AND policy = 'stately'$cmd$, tablename);
      ELSIF options->>'policy' = 'exclusive' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i6 ON pgboss.job (name, COALESCE(singleton_key, '')) WHERE state <= 'active' AND policy = 'exclusive'$cmd$, tablename);
      ELSIF options->>'policy' = 'key_strict_fifo' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i8 ON pgboss.job (name, singleton_key) WHERE state IN ('active', 'retry', 'failed') AND policy = 'key_strict_fifo'$cmd$, tablename);
        EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD CONSTRAINT job_key_strict_fifo_singleton_key_check CHECK (NOT (policy = 'key_strict_fifo' AND singleton_key IS NULL))$cmd$, tablename);
      END IF;

      EXECUTE format('ALTER TABLE pgboss.%I ADD CONSTRAINT cjc CHECK (name=%L)', tablename, queue_name);
      EXECUTE format('ALTER TABLE pgboss.job ATTACH PARTITION pgboss.%I FOR VALUES IN (%L)', tablename, queue_name);
    END;
    $_$;


--
-- Name: delete_queue(text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.delete_queue(queue_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_table varchar;
      v_partition bool;
    BEGIN
      SELECT table_name, partition
      FROM pgboss.queue
      WHERE name = queue_name
      INTO v_table, v_partition;

      IF v_partition THEN
        EXECUTE format('DROP TABLE IF EXISTS pgboss.%I', v_table);
      ELSE
        EXECUTE format('DELETE FROM pgboss.%I WHERE name = %L', v_table, queue_name);
      END IF;

      DELETE FROM pgboss.queue WHERE name = queue_name;
    END;
    $$;


--
-- Name: job_table_format(text, text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.job_table_format(command text, table_name text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
      SELECT format(
        replace(
          replace(command, '.job', '.%1$I'),
          'job_i', '%1$s_i'
        ),
        table_name
      );
    $_$;


--
-- Name: job_table_run(text, text, text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.job_table_run(command text, tbl_name text DEFAULT NULL::text, queue_name text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      tbl RECORD;
    BEGIN
      IF queue_name IS NOT NULL THEN
        SELECT table_name INTO tbl_name FROM pgboss.queue WHERE name = queue_name;
      END IF;

      IF tbl_name IS NOT NULL THEN
        EXECUTE pgboss.job_table_format(command, tbl_name);
        RETURN;
      END IF;

      EXECUTE pgboss.job_table_format(command, 'job_common');

      FOR tbl IN SELECT table_name FROM pgboss.queue WHERE partition = true
      LOOP
        EXECUTE pgboss.job_table_format(command, tbl.table_name);
      END LOOP;
    END;
    $$;


--
-- Name: job_table_run_async(text, integer, text, text, text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.job_table_run_async(command_name text, version integer, command text, tbl_name text DEFAULT NULL::text, queue_name text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF queue_name IS NOT NULL THEN
        SELECT table_name INTO tbl_name FROM pgboss.queue WHERE name = queue_name;
      END IF;

      IF tbl_name IS NOT NULL THEN
        INSERT INTO pgboss.bam (name, version, status, queue, table_name, command)
        VALUES (
          command_name,
          version,
          'pending',
          queue_name,
          tbl_name,
          pgboss.job_table_format(command, tbl_name)
        );
        RETURN;
      END IF;

      INSERT INTO pgboss.bam (name, version, status, queue, table_name, command)
      SELECT
        command_name,
        version,
        'pending',
        NULL,
        'job_common',
        pgboss.job_table_format(command, 'job_common')
      UNION ALL
      SELECT
        command_name,
        version,
        'pending',
        queue.name,
        queue.table_name,
        pgboss.job_table_format(command, queue.table_name)
      FROM pgboss.queue
      WHERE partition = true;
    END;
    $$;


--
-- Name: resolve_card(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_card(input_id character varying) RETURNS character varying
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN COALESCE(
        (SELECT resolves_to FROM card_resolution WHERE id = input_id),
        input_id
    );
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bam; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.bam (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    version integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    queue text,
    table_name text NOT NULL,
    command text NOT NULL,
    error text,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    started_on timestamp with time zone,
    completed_on timestamp with time zone
);


--
-- Name: job; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    data jsonb,
    state pgboss.job_state DEFAULT 'created'::pgboss.job_state NOT NULL,
    retry_limit integer DEFAULT 2 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    retry_delay integer DEFAULT 0 NOT NULL,
    retry_backoff boolean DEFAULT false NOT NULL,
    retry_delay_max integer,
    expire_seconds integer DEFAULT 900 NOT NULL,
    deletion_seconds integer DEFAULT 604800 NOT NULL,
    singleton_key text,
    singleton_on timestamp without time zone,
    group_id text,
    group_tier text,
    start_after timestamp with time zone DEFAULT now() NOT NULL,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    started_on timestamp with time zone,
    completed_on timestamp with time zone,
    keep_until timestamp with time zone DEFAULT (now() + '336:00:00'::interval) NOT NULL,
    output jsonb,
    dead_letter text,
    policy text,
    heartbeat_on timestamp with time zone,
    heartbeat_seconds integer
)
PARTITION BY LIST (name);


--
-- Name: job_common; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.job_common (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT job_id_not_null NOT NULL,
    name text CONSTRAINT job_name_not_null NOT NULL,
    priority integer DEFAULT 0 CONSTRAINT job_priority_not_null NOT NULL,
    data jsonb,
    state pgboss.job_state DEFAULT 'created'::pgboss.job_state CONSTRAINT job_state_not_null NOT NULL,
    retry_limit integer DEFAULT 2 CONSTRAINT job_retry_limit_not_null NOT NULL,
    retry_count integer DEFAULT 0 CONSTRAINT job_retry_count_not_null NOT NULL,
    retry_delay integer DEFAULT 0 CONSTRAINT job_retry_delay_not_null NOT NULL,
    retry_backoff boolean DEFAULT false CONSTRAINT job_retry_backoff_not_null NOT NULL,
    retry_delay_max integer,
    expire_seconds integer DEFAULT 900 CONSTRAINT job_expire_seconds_not_null NOT NULL,
    deletion_seconds integer DEFAULT 604800 CONSTRAINT job_deletion_seconds_not_null NOT NULL,
    singleton_key text,
    singleton_on timestamp without time zone,
    group_id text,
    group_tier text,
    start_after timestamp with time zone DEFAULT now() CONSTRAINT job_start_after_not_null NOT NULL,
    created_on timestamp with time zone DEFAULT now() CONSTRAINT job_created_on_not_null NOT NULL,
    started_on timestamp with time zone,
    completed_on timestamp with time zone,
    keep_until timestamp with time zone DEFAULT (now() + '336:00:00'::interval) CONSTRAINT job_keep_until_not_null NOT NULL,
    output jsonb,
    dead_letter text,
    policy text,
    heartbeat_on timestamp with time zone,
    heartbeat_seconds integer,
    CONSTRAINT job_key_strict_fifo_singleton_key_check CHECK ((NOT ((policy = 'key_strict_fifo'::text) AND (singleton_key IS NULL))))
);


--
-- Name: queue; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.queue (
    name text NOT NULL,
    policy text NOT NULL,
    retry_limit integer NOT NULL,
    retry_delay integer NOT NULL,
    retry_backoff boolean NOT NULL,
    retry_delay_max integer,
    expire_seconds integer NOT NULL,
    retention_seconds integer NOT NULL,
    deletion_seconds integer NOT NULL,
    dead_letter text,
    partition boolean NOT NULL,
    table_name text NOT NULL,
    deferred_count integer DEFAULT 0 NOT NULL,
    queued_count integer DEFAULT 0 NOT NULL,
    warning_queued integer DEFAULT 0 NOT NULL,
    active_count integer DEFAULT 0 NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    heartbeat_seconds integer,
    singletons_active text[],
    monitor_on timestamp with time zone,
    maintain_on timestamp with time zone,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT queue_check CHECK ((dead_letter IS DISTINCT FROM name))
);


--
-- Name: schedule; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.schedule (
    name text NOT NULL,
    key text DEFAULT ''::text NOT NULL,
    cron text NOT NULL,
    timezone text,
    data jsonb,
    options jsonb,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.subscription (
    event text NOT NULL,
    name text NOT NULL,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: version; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.version (
    version integer NOT NULL,
    cron_on timestamp with time zone,
    bam_on timestamp with time zone
);


--
-- Name: warning; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.warning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    data jsonb,
    created_on timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT uuidv7() NOT NULL,
    name character varying(64) NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    profile_completed_at timestamp without time zone DEFAULT now(),
    last_activity_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: account_card_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_card_tag (
    account_id uuid NOT NULL,
    revision uuid DEFAULT uuidv7() NOT NULL,
    state jsonb NOT NULL,
    CONSTRAINT chk_account_card_tag_state_length CHECK ((octet_length(COALESCE((state)::text, ''::text)) <= 1048576))
);


--
-- Name: account_folder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_folder (
    account_id uuid NOT NULL,
    revision uuid DEFAULT uuidv7() NOT NULL,
    state jsonb NOT NULL
);


--
-- Name: account_identity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_identity (
    account_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT uuidv7() NOT NULL,
    provider character varying(64) NOT NULL,
    provider_user_id text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    verified_at timestamp without time zone,
    email character varying(255),
    password_hash text,
    pending_email character varying(255),
    state jsonb
);


--
-- Name: account_moderation_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_moderation_action (
    id uuid DEFAULT uuidv7() NOT NULL,
    account_id uuid NOT NULL,
    scope public.moderation_action_scope NOT NULL,
    type public.moderation_action_type NOT NULL,
    reason text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    ends_at timestamp without time zone,
    end_reason text,
    ended_by uuid,
    CONSTRAINT chk_account_moderation_action_end_fields CHECK (((ends_at IS NULL) = (end_reason IS NULL))),
    CONSTRAINT chk_account_moderation_action_ended_by CHECK (((ended_by IS NULL) OR (ends_at IS NOT NULL))),
    CONSTRAINT chk_account_moderation_action_ends_after_created CHECK (((ends_at IS NULL) OR (ends_at > created_at)))
);


--
-- Name: account_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_settings (
    account_id uuid NOT NULL,
    collection jsonb,
    revision uuid DEFAULT uuidv7() NOT NULL,
    settings jsonb,
    CONSTRAINT chk_account_settings_settings_length CHECK ((octet_length(COALESCE((settings)::text, ''::text)) <= 65536))
);


--
-- Name: arkhamdb_deck_additional_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkhamdb_deck_additional_metadata (
    id text DEFAULT (uuidv7())::text NOT NULL,
    deck_id integer NOT NULL,
    data jsonb NOT NULL
);


--
-- Name: arkhamdb_deck_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkhamdb_deck_snapshot (
    id uuid DEFAULT uuidv7() NOT NULL,
    account_identity_id uuid NOT NULL,
    last_modified text,
    decks jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_arkhamdb_deck_snapshot_decks_length CHECK ((octet_length((decks)::text) <= 52428800))
);


--
-- Name: arkhamdb_decklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkhamdb_decklist (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    date_creation timestamp without time zone NOT NULL,
    date_update timestamp without time zone,
    description_md text,
    user_id integer NOT NULL,
    investigator_code character varying(255) NOT NULL,
    investigator_name character varying(255) NOT NULL,
    is_duplicate boolean DEFAULT false,
    slots jsonb NOT NULL,
    side_slots jsonb,
    ignore_deck_limit_slots jsonb,
    version character varying(8),
    xp integer,
    xp_spent integer,
    xp_adjustment integer,
    exile_string text,
    taboo_id integer,
    meta jsonb,
    tags text,
    previous_deck integer,
    next_deck integer,
    canonical_investigator_code character varying(255) NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    is_searchable boolean GENERATED ALWAYS AS ((((like_count > 0) OR ((next_deck IS NULL) AND (previous_deck IS NULL))) AND ((name)::text <> ''::text) AND (length(description_md) >= 10))) STORED,
    description_word_count integer DEFAULT 0 NOT NULL,
    xp_required integer
);


--
-- Name: arkhamdb_ranking_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkhamdb_ranking_cache (
    id integer NOT NULL,
    max_like_count integer NOT NULL,
    max_reputation integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: arkhamdb_ranking_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arkhamdb_ranking_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: arkhamdb_ranking_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arkhamdb_ranking_cache_id_seq OWNED BY public.arkhamdb_ranking_cache.id;


--
-- Name: arkhamdb_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkhamdb_user (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    reputation integer DEFAULT 0 NOT NULL
);


--
-- Name: campaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign (
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    translations jsonb NOT NULL
);


--
-- Name: campaign_scenario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_scenario (
    campaign_code character varying(255) NOT NULL,
    scenario_code character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card (
    alternate_of character varying(255),
    back_illustrator character varying(255),
    back_link character varying(255),
    clues integer,
    clues_fixed boolean DEFAULT false,
    code character varying(255) NOT NULL,
    cost integer,
    customization_options jsonb,
    deck_limit integer,
    deck_options jsonb,
    deck_requirements text,
    doom integer,
    double_sided boolean DEFAULT false,
    duplicate_of character varying(255),
    encounter_code character varying(255),
    encounter_position integer,
    enemy_damage integer,
    enemy_evade integer,
    enemy_fight integer,
    enemy_horror integer,
    errata_date timestamp without time zone,
    exceptional boolean DEFAULT false,
    exile boolean DEFAULT false,
    faction_code character varying(36) NOT NULL,
    faction2_code character varying(36),
    faction3_code character varying(36),
    health integer,
    health_per_investigator boolean DEFAULT false,
    hidden boolean DEFAULT false,
    id character varying(255) NOT NULL,
    illustrator character varying(255),
    is_unique boolean DEFAULT false,
    myriad boolean DEFAULT false,
    official boolean DEFAULT true NOT NULL,
    pack_code character varying(255) NOT NULL,
    pack_position integer,
    permanent boolean DEFAULT false,
    "position" integer NOT NULL,
    preview boolean DEFAULT false,
    quantity integer NOT NULL,
    back_flavor text,
    back_name character varying(255),
    back_text text,
    back_traits character varying(255),
    customization_change text,
    customization_text text,
    flavor text,
    name character varying(255) CONSTRAINT card_real_name_not_null NOT NULL,
    slot character varying(36),
    subname character varying(255),
    taboo_text_change text,
    text text,
    traits character varying(255),
    restrictions text,
    sanity integer,
    shroud integer,
    side_deck_options jsonb,
    side_deck_requirements text,
    skill_agility integer,
    skill_combat integer,
    skill_intellect integer,
    skill_wild integer,
    skill_willpower integer,
    stage integer,
    subtype_code character varying(36),
    taboo_set_id integer,
    taboo_xp integer,
    tags text,
    translations jsonb,
    type_code character varying(36) NOT NULL,
    vengeance integer,
    victory integer,
    xp integer,
    abbreviation character varying(255),
    back_subname character varying(255),
    back_type character varying(255),
    bonded_count integer,
    bonded_to character varying(255),
    doom_per_investigator boolean,
    enemy_fight_per_investigator boolean,
    enemy_evade_per_investigator boolean,
    shroud_per_investigator boolean,
    starts_in_hand boolean,
    starts_in_play boolean,
    sticky_mulligan boolean,
    attachments jsonb,
    reprint_of character varying(255)
);


--
-- Name: card_resolution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_resolution (
    id character varying(255) NOT NULL,
    resolves_to character varying(255) NOT NULL
);


--
-- Name: cycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cycle (
    code character varying(255) NOT NULL,
    "position" integer NOT NULL,
    name character varying(255) CONSTRAINT cycle_real_name_not_null NOT NULL,
    translations jsonb NOT NULL
);


--
-- Name: data_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_version (
    card_count integer NOT NULL,
    cards_updated_at timestamp without time zone NOT NULL,
    locale character varying(10) NOT NULL,
    translation_updated_at timestamp without time zone NOT NULL,
    ingested_commit_id character varying(255)
);


--
-- Name: deck; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deck (
    account_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    description text DEFAULT ''::text,
    exile_string text,
    id text DEFAULT (uuidv7())::text NOT NULL,
    ignore_deck_limit jsonb,
    investigator_code character varying(255) NOT NULL,
    investigator_name character varying(255) NOT NULL,
    meta jsonb,
    name character varying(255) NOT NULL,
    next_deck text,
    prev_deck text,
    problem text,
    provider_type character varying(64) NOT NULL,
    side_slots jsonb,
    slots jsonb NOT NULL,
    taboo_set_id integer,
    tags text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    version character varying(8),
    xp integer,
    xp_adjustment integer,
    xp_spent integer,
    CONSTRAINT chk_deck_description_length CHECK ((octet_length(COALESCE(description, ''::text)) <= 131072)),
    CONSTRAINT chk_deck_exile_string_length CHECK ((octet_length(COALESCE(exile_string, ''::text)) <= 4096)),
    CONSTRAINT chk_deck_id_length CHECK ((char_length(id) <= 255)),
    CONSTRAINT chk_deck_next_deck_length CHECK ((char_length(COALESCE(next_deck, ''::text)) <= 255)),
    CONSTRAINT chk_deck_prev_deck_length CHECK ((char_length(COALESCE(prev_deck, ''::text)) <= 255)),
    CONSTRAINT chk_deck_problem_length CHECK ((char_length(COALESCE(problem, ''::text)) <= 255)),
    CONSTRAINT chk_deck_tags_length CHECK ((octet_length(COALESCE(tags, ''::text)) <= 1024))
);


--
-- Name: encounter_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounter_set (
    code character varying(255) NOT NULL,
    pack_code character varying(255) NOT NULL,
    name character varying(255) CONSTRAINT encounter_set_real_name_not_null NOT NULL,
    translations jsonb NOT NULL
);


--
-- Name: errata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.errata (
    id integer NOT NULL,
    "position" integer NOT NULL,
    type character varying(36) NOT NULL,
    section character varying(255),
    ruling text NOT NULL,
    citation character varying(255) NOT NULL,
    CONSTRAINT errata_rulebook_section_check CHECK (((((type)::text = 'rulebook_errata'::text) AND (section IS NOT NULL)) OR (((type)::text <> 'rulebook_errata'::text) AND (section IS NULL)))),
    CONSTRAINT errata_type_check CHECK (((type)::text = ANY ((ARRAY['campaign_errata'::character varying, 'card_errata'::character varying, 'rulebook_errata'::character varying])::text[])))
);


--
-- Name: errata_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.errata_card (
    errata_id integer NOT NULL,
    card_id character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: errata_cycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.errata_cycle (
    errata_id integer NOT NULL,
    cycle_code character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: errata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.errata ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.errata_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: errata_scenario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.errata_scenario (
    errata_id integer NOT NULL,
    scenario_code character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: faction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faction (
    code character varying(36) NOT NULL,
    is_primary boolean NOT NULL,
    name character varying(255) NOT NULL,
    translations jsonb NOT NULL
);


--
-- Name: fan_made_project_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fan_made_project_info (
    id uuid NOT NULL,
    bucket_path text NOT NULL,
    meta jsonb NOT NULL
);


--
-- Name: faq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq (
    id integer NOT NULL,
    "position" integer NOT NULL,
    type character varying(36) DEFAULT 'faq'::character varying NOT NULL,
    question text NOT NULL,
    ruling text NOT NULL,
    citation character varying(255) NOT NULL,
    CONSTRAINT faq_type_check CHECK (((type)::text = 'faq'::text))
);


--
-- Name: faq_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq_card (
    faq_id integer NOT NULL,
    card_id character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: faq_cycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq_cycle (
    faq_id integer NOT NULL,
    cycle_code character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: faq_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.faq ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.faq_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: faq_scenario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq_scenario (
    faq_id integer NOT NULL,
    scenario_code character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: grimoire_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grimoire_entry (
    id character varying(255) NOT NULL,
    section character varying(255) NOT NULL,
    title text NOT NULL,
    text text,
    translations jsonb NOT NULL,
    citation character varying(255) NOT NULL
);


--
-- Name: grimoire_entry_reference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grimoire_entry_reference (
    source_id character varying(255) NOT NULL,
    target_id character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: grimoire_section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grimoire_section (
    id character varying(255) NOT NULL,
    title text NOT NULL,
    "position" integer NOT NULL,
    text text,
    translations jsonb NOT NULL,
    citation character varying(255)
);


--
-- Name: oauth_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_token (
    account_identity_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pack; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pack (
    code character varying(255) NOT NULL,
    cycle_code character varying(255) NOT NULL,
    "position" integer NOT NULL,
    name character varying(255) CONSTRAINT pack_real_name_not_null NOT NULL,
    translations jsonb NOT NULL,
    type character varying(255),
    chapter integer,
    date_release timestamp without time zone,
    size integer,
    reprint_type character varying(255),
    reprint_packs jsonb
);


--
-- Name: pack_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pack_type (
    pack_type character varying(255) NOT NULL
);


--
-- Name: rules_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rules_version (
    citation character varying(255) NOT NULL,
    date date NOT NULL
);


--
-- Name: scenario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario (
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    translations jsonb NOT NULL,
    campaign_code character varying(255)
);


--
-- Name: scenario_encounter_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_encounter_set (
    scenario_code character varying(255) NOT NULL,
    encounter_code character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: scenario_encounter_set_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_encounter_set_card (
    scenario_code character varying(255) NOT NULL,
    encounter_code character varying(255) NOT NULL,
    card_id character varying(255) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    account_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    id uuid DEFAULT uuidv7() NOT NULL,
    last_activity_at timestamp without time zone DEFAULT now() NOT NULL,
    token_hash text NOT NULL
);


--
-- Name: subtype; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subtype (
    code character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    translations jsonb NOT NULL
);


--
-- Name: taboo_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taboo_set (
    card_count integer NOT NULL,
    id integer NOT NULL,
    date_start timestamp without time zone CONSTRAINT taboo_set_date_not_null NOT NULL,
    name character varying(255),
    code character varying(255) NOT NULL
);


--
-- Name: type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.type (
    code character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    translations jsonb NOT NULL
);


--
-- Name: verification_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_token (
    account_identity_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    email character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    id uuid DEFAULT uuidv7() NOT NULL,
    token_hash text NOT NULL,
    token_type character varying(32) NOT NULL
);


--
-- Name: job_common; Type: TABLE ATTACH; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job ATTACH PARTITION pgboss.job_common DEFAULT;


--
-- Name: arkhamdb_ranking_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_ranking_cache ALTER COLUMN id SET DEFAULT nextval('public.arkhamdb_ranking_cache_id_seq'::regclass);


--
-- Name: bam bam_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.bam
    ADD CONSTRAINT bam_pkey PRIMARY KEY (id);


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (name, id);


--
-- Name: job_common job_common_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_common
    ADD CONSTRAINT job_common_pkey PRIMARY KEY (name, id);


--
-- Name: queue queue_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue
    ADD CONSTRAINT queue_pkey PRIMARY KEY (name);


--
-- Name: schedule schedule_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.schedule
    ADD CONSTRAINT schedule_pkey PRIMARY KEY (name, key);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (event, name);


--
-- Name: version version_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.version
    ADD CONSTRAINT version_pkey PRIMARY KEY (version);


--
-- Name: warning warning_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.warning
    ADD CONSTRAINT warning_pkey PRIMARY KEY (id);


--
-- Name: account_card_tag account_card_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_card_tag
    ADD CONSTRAINT account_card_tag_pkey PRIMARY KEY (account_id);


--
-- Name: account_folder account_folder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_folder
    ADD CONSTRAINT account_folder_pkey PRIMARY KEY (account_id);


--
-- Name: account_identity account_identity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identity
    ADD CONSTRAINT account_identity_pkey PRIMARY KEY (id);


--
-- Name: account_identity account_identity_provider_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identity
    ADD CONSTRAINT account_identity_provider_email_key UNIQUE (provider, email);


--
-- Name: account_identity account_identity_provider_provider_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identity
    ADD CONSTRAINT account_identity_provider_provider_user_id_key UNIQUE (provider, provider_user_id);


--
-- Name: account_moderation_action account_moderation_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_moderation_action
    ADD CONSTRAINT account_moderation_action_pkey PRIMARY KEY (id);


--
-- Name: account account_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_name_key UNIQUE (name);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: account_settings account_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings
    ADD CONSTRAINT account_settings_pkey PRIMARY KEY (account_id);


--
-- Name: arkhamdb_deck_additional_metadata arkhamdb_deck_additional_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_deck_additional_metadata
    ADD CONSTRAINT arkhamdb_deck_additional_metadata_pkey PRIMARY KEY (id);


--
-- Name: arkhamdb_deck_snapshot arkhamdb_deck_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_deck_snapshot
    ADD CONSTRAINT arkhamdb_deck_snapshot_pkey PRIMARY KEY (id);


--
-- Name: arkhamdb_decklist arkhamdb_decklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_decklist
    ADD CONSTRAINT arkhamdb_decklist_pkey PRIMARY KEY (id);


--
-- Name: arkhamdb_ranking_cache arkhamdb_ranking_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_ranking_cache
    ADD CONSTRAINT arkhamdb_ranking_cache_pkey PRIMARY KEY (id);


--
-- Name: arkhamdb_user arkhamdb_user_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_user
    ADD CONSTRAINT arkhamdb_user_name_key UNIQUE (name);


--
-- Name: arkhamdb_user arkhamdb_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_user
    ADD CONSTRAINT arkhamdb_user_pkey PRIMARY KEY (id);


--
-- Name: campaign campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign
    ADD CONSTRAINT campaign_pkey PRIMARY KEY (code);


--
-- Name: campaign_scenario campaign_scenario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_scenario
    ADD CONSTRAINT campaign_scenario_pkey PRIMARY KEY (campaign_code, scenario_code);


--
-- Name: card card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_pkey PRIMARY KEY (id);


--
-- Name: card_resolution card_resolution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_resolution
    ADD CONSTRAINT card_resolution_pkey PRIMARY KEY (id, resolves_to);


--
-- Name: cycle cycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle
    ADD CONSTRAINT cycle_pkey PRIMARY KEY (code);


--
-- Name: data_version data_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_version
    ADD CONSTRAINT data_version_pkey PRIMARY KEY (locale);


--
-- Name: deck deck_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck
    ADD CONSTRAINT deck_pkey PRIMARY KEY (id);


--
-- Name: encounter_set encounter_set_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_set
    ADD CONSTRAINT encounter_set_pkey PRIMARY KEY (code);


--
-- Name: errata_card errata_card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_card
    ADD CONSTRAINT errata_card_pkey PRIMARY KEY (errata_id, card_id);


--
-- Name: errata_cycle errata_cycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_cycle
    ADD CONSTRAINT errata_cycle_pkey PRIMARY KEY (errata_id, cycle_code);


--
-- Name: errata errata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata
    ADD CONSTRAINT errata_pkey PRIMARY KEY (id);


--
-- Name: errata_scenario errata_scenario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_scenario
    ADD CONSTRAINT errata_scenario_pkey PRIMARY KEY (errata_id, scenario_code);


--
-- Name: account_moderation_action ex_account_moderation_action_no_overlapping_bans; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_moderation_action
    ADD CONSTRAINT ex_account_moderation_action_no_overlapping_bans EXCLUDE USING gist (account_id WITH =, scope WITH =, tsrange(created_at, COALESCE(ends_at, 'infinity'::timestamp without time zone), '[)'::text) WITH &&) WHERE ((type = 'ban'::public.moderation_action_type));


--
-- Name: faction faction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_pkey PRIMARY KEY (code);


--
-- Name: fan_made_project_info fan_made_project_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fan_made_project_info
    ADD CONSTRAINT fan_made_project_info_pkey PRIMARY KEY (id);


--
-- Name: faq_card faq_card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_card
    ADD CONSTRAINT faq_card_pkey PRIMARY KEY (faq_id, card_id);


--
-- Name: faq_cycle faq_cycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_cycle
    ADD CONSTRAINT faq_cycle_pkey PRIMARY KEY (faq_id, cycle_code);


--
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- Name: faq_scenario faq_scenario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_scenario
    ADD CONSTRAINT faq_scenario_pkey PRIMARY KEY (faq_id, scenario_code);


--
-- Name: grimoire_entry grimoire_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry
    ADD CONSTRAINT grimoire_entry_pkey PRIMARY KEY (id);


--
-- Name: grimoire_entry_reference grimoire_entry_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry_reference
    ADD CONSTRAINT grimoire_entry_reference_pkey PRIMARY KEY (source_id, target_id);


--
-- Name: grimoire_entry_reference grimoire_entry_reference_source_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry_reference
    ADD CONSTRAINT grimoire_entry_reference_source_id_position_key UNIQUE (source_id, "position");


--
-- Name: grimoire_section grimoire_section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_section
    ADD CONSTRAINT grimoire_section_pkey PRIMARY KEY (id);


--
-- Name: oauth_token oauth_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_token
    ADD CONSTRAINT oauth_token_pkey PRIMARY KEY (account_identity_id);


--
-- Name: pack pack_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pack
    ADD CONSTRAINT pack_pkey PRIMARY KEY (code);


--
-- Name: pack_type pack_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pack_type
    ADD CONSTRAINT pack_type_pkey PRIMARY KEY (pack_type);


--
-- Name: rules_version rules_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules_version
    ADD CONSTRAINT rules_version_pkey PRIMARY KEY (citation);


--
-- Name: scenario_encounter_set_card scenario_encounter_set_card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_encounter_set_card
    ADD CONSTRAINT scenario_encounter_set_card_pkey PRIMARY KEY (scenario_code, encounter_code, card_id);


--
-- Name: scenario_encounter_set scenario_encounter_set_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_encounter_set
    ADD CONSTRAINT scenario_encounter_set_pkey PRIMARY KEY (scenario_code, encounter_code);


--
-- Name: scenario scenario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario
    ADD CONSTRAINT scenario_pkey PRIMARY KEY (code);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_hash_key UNIQUE (token_hash);


--
-- Name: subtype subtype_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtype
    ADD CONSTRAINT subtype_pkey PRIMARY KEY (code);


--
-- Name: taboo_set taboo_set_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taboo_set
    ADD CONSTRAINT taboo_set_pkey PRIMARY KEY (id);


--
-- Name: type type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type
    ADD CONSTRAINT type_pkey PRIMARY KEY (code);


--
-- Name: verification_token verification_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_token
    ADD CONSTRAINT verification_token_pkey PRIMARY KEY (id);


--
-- Name: verification_token verification_token_token_type_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_token
    ADD CONSTRAINT verification_token_token_type_token_hash_key UNIQUE (token_type, token_hash);


--
-- Name: job_common_i1; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i1 ON pgboss.job_common USING btree (name, COALESCE(singleton_key, ''::text)) WHERE ((state = 'created'::pgboss.job_state) AND (policy = 'short'::text));


--
-- Name: job_common_i2; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i2 ON pgboss.job_common USING btree (name, COALESCE(singleton_key, ''::text)) WHERE ((state = 'active'::pgboss.job_state) AND (policy = 'singleton'::text));


--
-- Name: job_common_i3; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i3 ON pgboss.job_common USING btree (name, state, COALESCE(singleton_key, ''::text)) WHERE ((state <= 'active'::pgboss.job_state) AND (policy = 'stately'::text));


--
-- Name: job_common_i4; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i4 ON pgboss.job_common USING btree (name, singleton_on, COALESCE(singleton_key, ''::text)) WHERE ((state <> 'cancelled'::pgboss.job_state) AND (singleton_on IS NOT NULL));


--
-- Name: job_common_i5; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX job_common_i5 ON pgboss.job_common USING btree (name, start_after) INCLUDE (priority, created_on, id) WHERE (state < 'active'::pgboss.job_state);


--
-- Name: job_common_i6; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i6 ON pgboss.job_common USING btree (name, COALESCE(singleton_key, ''::text)) WHERE ((state <= 'active'::pgboss.job_state) AND (policy = 'exclusive'::text));


--
-- Name: job_common_i7; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX job_common_i7 ON pgboss.job_common USING btree (name, group_id) WHERE ((state = 'active'::pgboss.job_state) AND (group_id IS NOT NULL));


--
-- Name: job_common_i8; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i8 ON pgboss.job_common USING btree (name, singleton_key) WHERE ((state = ANY (ARRAY['active'::pgboss.job_state, 'retry'::pgboss.job_state, 'failed'::pgboss.job_state])) AND (policy = 'key_strict_fifo'::text));


--
-- Name: warning_i1; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX warning_i1 ON pgboss.warning USING btree (created_on DESC);


--
-- Name: idx_account_folder_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_folder_account_id ON public.account_folder USING btree (account_id);


--
-- Name: idx_account_identity_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_identity_account_id ON public.account_identity USING btree (account_id);


--
-- Name: idx_account_identity_provider_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_account_identity_provider_email ON public.account_identity USING btree (provider, email) WHERE (email IS NOT NULL);


--
-- Name: idx_account_identity_provider_pending_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_account_identity_provider_pending_email ON public.account_identity USING btree (provider, pending_email) WHERE (pending_email IS NOT NULL);


--
-- Name: idx_account_identity_provider_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_account_identity_provider_uid ON public.account_identity USING btree (provider, provider_user_id) WHERE (provider_user_id IS NOT NULL);


--
-- Name: idx_account_last_activity_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_last_activity_at ON public.account USING btree (last_activity_at);


--
-- Name: idx_account_moderation_action_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_moderation_action_account_id ON public.account_moderation_action USING btree (account_id);


--
-- Name: idx_account_moderation_action_account_type_scope_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_moderation_action_account_type_scope_created_at ON public.account_moderation_action USING btree (account_id, type, scope, created_at DESC);


--
-- Name: idx_account_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_account_name_lower ON public.account USING btree (lower((name)::text));


--
-- Name: idx_account_settings_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_settings_account_id ON public.account_settings USING btree (account_id);


--
-- Name: idx_arkhamdb_deck_snapshot_account_identity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_deck_snapshot_account_identity_id ON public.arkhamdb_deck_snapshot USING btree (account_identity_id);


--
-- Name: idx_arkhamdb_decklist_canonical_investigator_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_canonical_investigator_code ON public.arkhamdb_decklist USING btree (canonical_investigator_code);


--
-- Name: idx_arkhamdb_decklist_date_creation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_date_creation ON public.arkhamdb_decklist USING btree (date_creation);


--
-- Name: idx_arkhamdb_decklist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_id ON public.arkhamdb_decklist USING btree (id);


--
-- Name: idx_arkhamdb_decklist_investigator_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_investigator_code ON public.arkhamdb_decklist USING btree (investigator_code);


--
-- Name: idx_arkhamdb_decklist_side_slots; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_side_slots ON public.arkhamdb_decklist USING gin (side_slots);


--
-- Name: idx_arkhamdb_decklist_slots; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_slots ON public.arkhamdb_decklist USING gin (slots);


--
-- Name: idx_arkhamdb_decklist_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_user_id ON public.arkhamdb_decklist USING btree (user_id);


--
-- Name: idx_arkhamdb_decklist_user_like_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_user_like_date ON public.arkhamdb_decklist USING btree (user_id, like_count, date_creation);


--
-- Name: idx_arkhamdb_decklist_xp_required; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_decklist_xp_required ON public.arkhamdb_decklist USING btree (xp_required);


--
-- Name: idx_arkhamdb_user_reputation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arkhamdb_user_reputation ON public.arkhamdb_user USING btree (reputation);


--
-- Name: idx_campaign_scenario_scenario_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_scenario_scenario_code ON public.campaign_scenario USING btree (scenario_code);


--
-- Name: idx_card_alternate_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_alternate_of ON public.card USING btree (alternate_of);


--
-- Name: idx_card_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_code ON public.card USING btree (code);


--
-- Name: idx_card_duplicate_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_duplicate_of ON public.card USING btree (duplicate_of);


--
-- Name: idx_card_encounter_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_encounter_code ON public.card USING btree (encounter_code);


--
-- Name: idx_card_faction2_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_faction2_code ON public.card USING btree (faction2_code);


--
-- Name: idx_card_faction3_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_faction3_code ON public.card USING btree (faction3_code);


--
-- Name: idx_card_faction_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_faction_code ON public.card USING btree (faction_code);


--
-- Name: idx_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_id ON public.card USING btree (id);


--
-- Name: idx_card_pack_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_pack_code ON public.card USING btree (pack_code);


--
-- Name: idx_card_resolution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_resolution_id ON public.card_resolution USING btree (id);


--
-- Name: idx_card_resolution_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_resolution_target ON public.card_resolution USING btree (resolves_to);


--
-- Name: idx_card_subtype_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_subtype_code ON public.card USING btree (subtype_code);


--
-- Name: idx_card_taboo_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_taboo_set_id ON public.card USING btree (taboo_set_id);


--
-- Name: idx_card_type_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_type_code ON public.card USING btree (type_code);


--
-- Name: idx_deck_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deck_account_id ON public.deck USING btree (account_id);


--
-- Name: idx_deck_next_deck; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deck_next_deck ON public.deck USING btree (next_deck);


--
-- Name: idx_deck_prev_deck; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deck_prev_deck ON public.deck USING btree (prev_deck);


--
-- Name: idx_decklist_not_duplicate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decklist_not_duplicate ON public.arkhamdb_decklist USING btree (id) WHERE (NOT is_duplicate);


--
-- Name: idx_encounter_set_pack_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounter_set_pack_code ON public.encounter_set USING btree (pack_code);


--
-- Name: idx_errata_card_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_errata_card_card_id ON public.errata_card USING btree (card_id);


--
-- Name: idx_errata_cycle_cycle_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_errata_cycle_cycle_code ON public.errata_cycle USING btree (cycle_code);


--
-- Name: idx_errata_scenario_scenario_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_errata_scenario_scenario_code ON public.errata_scenario USING btree (scenario_code);


--
-- Name: idx_faq_card_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faq_card_card_id ON public.faq_card USING btree (card_id);


--
-- Name: idx_faq_cycle_cycle_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faq_cycle_cycle_code ON public.faq_cycle USING btree (cycle_code);


--
-- Name: idx_faq_scenario_scenario_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faq_scenario_scenario_code ON public.faq_scenario USING btree (scenario_code);


--
-- Name: idx_grimoire_entry_citation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grimoire_entry_citation ON public.grimoire_entry USING btree (citation);


--
-- Name: idx_grimoire_entry_reference_target_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grimoire_entry_reference_target_id ON public.grimoire_entry_reference USING btree (target_id);


--
-- Name: idx_grimoire_entry_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grimoire_entry_section ON public.grimoire_entry USING btree (section);


--
-- Name: idx_oauth_tokens_account_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_oauth_tokens_account_identity ON public.oauth_token USING btree (account_identity_id);


--
-- Name: idx_pack_cycle_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pack_cycle_code ON public.pack USING btree (cycle_code);


--
-- Name: idx_scenario_campaign_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenario_campaign_code ON public.scenario USING btree (campaign_code);


--
-- Name: idx_scenario_encounter_set_card_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenario_encounter_set_card_card_id ON public.scenario_encounter_set_card USING btree (card_id);


--
-- Name: idx_scenario_encounter_set_encounter_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenario_encounter_set_encounter_code ON public.scenario_encounter_set USING btree (encounter_code);


--
-- Name: idx_session_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_account_id ON public.session USING btree (account_id);


--
-- Name: idx_session_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_expires_at ON public.session USING btree (expires_at);


--
-- Name: idx_verification_token_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_token_email ON public.verification_token USING btree (email);


--
-- Name: idx_verification_token_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_token_expires_at ON public.verification_token USING btree (expires_at);


--
-- Name: idx_verification_token_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_token_token_hash ON public.verification_token USING btree (token_hash);


--
-- Name: job_common_pkey; Type: INDEX ATTACH; Schema: pgboss; Owner: -
--

ALTER INDEX pgboss.job_pkey ATTACH PARTITION pgboss.job_common_pkey;


--
-- Name: job_common dlq_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_common
    ADD CONSTRAINT dlq_fkey FOREIGN KEY (dead_letter) REFERENCES pgboss.queue(name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: job_common q_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_common
    ADD CONSTRAINT q_fkey FOREIGN KEY (name) REFERENCES pgboss.queue(name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: queue queue_dead_letter_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue
    ADD CONSTRAINT queue_dead_letter_fkey FOREIGN KEY (dead_letter) REFERENCES pgboss.queue(name);


--
-- Name: schedule schedule_name_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.schedule
    ADD CONSTRAINT schedule_name_fkey FOREIGN KEY (name) REFERENCES pgboss.queue(name) ON DELETE CASCADE;


--
-- Name: subscription subscription_name_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.subscription
    ADD CONSTRAINT subscription_name_fkey FOREIGN KEY (name) REFERENCES pgboss.queue(name) ON DELETE CASCADE;


--
-- Name: account_card_tag account_card_tag_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_card_tag
    ADD CONSTRAINT account_card_tag_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_folder account_folder_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_folder
    ADD CONSTRAINT account_folder_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_identity account_identity_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identity
    ADD CONSTRAINT account_identity_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_moderation_action account_moderation_action_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_moderation_action
    ADD CONSTRAINT account_moderation_action_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_moderation_action account_moderation_action_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_moderation_action
    ADD CONSTRAINT account_moderation_action_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: account_moderation_action account_moderation_action_ended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_moderation_action
    ADD CONSTRAINT account_moderation_action_ended_by_fkey FOREIGN KEY (ended_by) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: account_settings account_settings_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings
    ADD CONSTRAINT account_settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: arkhamdb_deck_snapshot arkhamdb_deck_snapshot_account_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_deck_snapshot
    ADD CONSTRAINT arkhamdb_deck_snapshot_account_identity_id_fkey FOREIGN KEY (account_identity_id) REFERENCES public.account_identity(id) ON DELETE CASCADE;


--
-- Name: arkhamdb_decklist arkhamdb_decklist_next_deck_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_decklist
    ADD CONSTRAINT arkhamdb_decklist_next_deck_fkey FOREIGN KEY (next_deck) REFERENCES public.arkhamdb_decklist(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: arkhamdb_decklist arkhamdb_decklist_previous_deck_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_decklist
    ADD CONSTRAINT arkhamdb_decklist_previous_deck_fkey FOREIGN KEY (previous_deck) REFERENCES public.arkhamdb_decklist(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: arkhamdb_decklist arkhamdb_decklist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_decklist
    ADD CONSTRAINT arkhamdb_decklist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.arkhamdb_user(id);


--
-- Name: campaign_scenario campaign_scenario_campaign_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_scenario
    ADD CONSTRAINT campaign_scenario_campaign_code_fkey FOREIGN KEY (campaign_code) REFERENCES public.campaign(code) ON DELETE CASCADE;


--
-- Name: campaign_scenario campaign_scenario_scenario_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_scenario
    ADD CONSTRAINT campaign_scenario_scenario_code_fkey FOREIGN KEY (scenario_code) REFERENCES public.scenario(code) ON DELETE CASCADE;


--
-- Name: card card_alternate_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_alternate_of_fkey FOREIGN KEY (alternate_of) REFERENCES public.card(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: card card_duplicate_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_duplicate_of_fkey FOREIGN KEY (duplicate_of) REFERENCES public.card(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: card card_encounter_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_encounter_code_fkey FOREIGN KEY (encounter_code) REFERENCES public.encounter_set(code);


--
-- Name: card card_faction2_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_faction2_code_fkey FOREIGN KEY (faction2_code) REFERENCES public.faction(code) ON DELETE SET NULL;


--
-- Name: card card_faction3_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_faction3_code_fkey FOREIGN KEY (faction3_code) REFERENCES public.faction(code) ON DELETE SET NULL;


--
-- Name: card card_faction_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_faction_code_fkey FOREIGN KEY (faction_code) REFERENCES public.faction(code);


--
-- Name: card card_pack_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_pack_code_fkey FOREIGN KEY (pack_code) REFERENCES public.pack(code);


--
-- Name: card_resolution card_resolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_resolution
    ADD CONSTRAINT card_resolution_id_fkey FOREIGN KEY (id) REFERENCES public.card(id);


--
-- Name: card_resolution card_resolution_resolves_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_resolution
    ADD CONSTRAINT card_resolution_resolves_to_fkey FOREIGN KEY (resolves_to) REFERENCES public.card(id);


--
-- Name: card card_subtype_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_subtype_code_fkey FOREIGN KEY (subtype_code) REFERENCES public.subtype(code) ON DELETE SET NULL;


--
-- Name: card card_taboo_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_taboo_set_id_fkey FOREIGN KEY (taboo_set_id) REFERENCES public.taboo_set(id);


--
-- Name: card card_type_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_type_code_fkey FOREIGN KEY (type_code) REFERENCES public.type(code) ON DELETE CASCADE;


--
-- Name: deck deck_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck
    ADD CONSTRAINT deck_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: deck deck_next_deck_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck
    ADD CONSTRAINT deck_next_deck_fkey FOREIGN KEY (next_deck) REFERENCES public.deck(id) ON DELETE SET NULL;


--
-- Name: deck deck_prev_deck_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck
    ADD CONSTRAINT deck_prev_deck_fkey FOREIGN KEY (prev_deck) REFERENCES public.deck(id) ON DELETE SET NULL;


--
-- Name: deck deck_taboo_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck
    ADD CONSTRAINT deck_taboo_set_id_fkey FOREIGN KEY (taboo_set_id) REFERENCES public.taboo_set(id) ON DELETE SET NULL;


--
-- Name: encounter_set encounter_set_pack_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_set
    ADD CONSTRAINT encounter_set_pack_code_fkey FOREIGN KEY (pack_code) REFERENCES public.pack(code);


--
-- Name: errata_card errata_card_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_card
    ADD CONSTRAINT errata_card_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: errata_card errata_card_errata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_card
    ADD CONSTRAINT errata_card_errata_id_fkey FOREIGN KEY (errata_id) REFERENCES public.errata(id) ON DELETE CASCADE;


--
-- Name: errata errata_citation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata
    ADD CONSTRAINT errata_citation_fkey FOREIGN KEY (citation) REFERENCES public.rules_version(citation) NOT VALID;


--
-- Name: errata_cycle errata_cycle_cycle_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_cycle
    ADD CONSTRAINT errata_cycle_cycle_code_fkey FOREIGN KEY (cycle_code) REFERENCES public.cycle(code) ON DELETE CASCADE;


--
-- Name: errata_cycle errata_cycle_errata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_cycle
    ADD CONSTRAINT errata_cycle_errata_id_fkey FOREIGN KEY (errata_id) REFERENCES public.errata(id) ON DELETE CASCADE;


--
-- Name: errata_scenario errata_scenario_errata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_scenario
    ADD CONSTRAINT errata_scenario_errata_id_fkey FOREIGN KEY (errata_id) REFERENCES public.errata(id) ON DELETE CASCADE;


--
-- Name: errata_scenario errata_scenario_scenario_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.errata_scenario
    ADD CONSTRAINT errata_scenario_scenario_code_fkey FOREIGN KEY (scenario_code) REFERENCES public.scenario(code) ON DELETE CASCADE;


--
-- Name: faq_card faq_card_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_card
    ADD CONSTRAINT faq_card_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: faq_card faq_card_faq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_card
    ADD CONSTRAINT faq_card_faq_id_fkey FOREIGN KEY (faq_id) REFERENCES public.faq(id) ON DELETE CASCADE;


--
-- Name: faq faq_citation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_citation_fkey FOREIGN KEY (citation) REFERENCES public.rules_version(citation) NOT VALID;


--
-- Name: faq_cycle faq_cycle_cycle_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_cycle
    ADD CONSTRAINT faq_cycle_cycle_code_fkey FOREIGN KEY (cycle_code) REFERENCES public.cycle(code) ON DELETE CASCADE;


--
-- Name: faq_cycle faq_cycle_faq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_cycle
    ADD CONSTRAINT faq_cycle_faq_id_fkey FOREIGN KEY (faq_id) REFERENCES public.faq(id) ON DELETE CASCADE;


--
-- Name: faq_scenario faq_scenario_faq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_scenario
    ADD CONSTRAINT faq_scenario_faq_id_fkey FOREIGN KEY (faq_id) REFERENCES public.faq(id) ON DELETE CASCADE;


--
-- Name: faq_scenario faq_scenario_scenario_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_scenario
    ADD CONSTRAINT faq_scenario_scenario_code_fkey FOREIGN KEY (scenario_code) REFERENCES public.scenario(code) ON DELETE CASCADE;


--
-- Name: grimoire_entry grimoire_entry_citation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry
    ADD CONSTRAINT grimoire_entry_citation_fkey FOREIGN KEY (citation) REFERENCES public.rules_version(citation);


--
-- Name: grimoire_entry_reference grimoire_entry_reference_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry_reference
    ADD CONSTRAINT grimoire_entry_reference_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.grimoire_entry(id) ON DELETE CASCADE;


--
-- Name: grimoire_entry_reference grimoire_entry_reference_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry_reference
    ADD CONSTRAINT grimoire_entry_reference_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.grimoire_entry(id) ON DELETE CASCADE;


--
-- Name: grimoire_entry grimoire_entry_section_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_entry
    ADD CONSTRAINT grimoire_entry_section_fkey FOREIGN KEY (section) REFERENCES public.grimoire_section(id) ON DELETE CASCADE;


--
-- Name: grimoire_section grimoire_section_citation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grimoire_section
    ADD CONSTRAINT grimoire_section_citation_fkey FOREIGN KEY (citation) REFERENCES public.rules_version(citation);


--
-- Name: oauth_token oauth_token_account_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_token
    ADD CONSTRAINT oauth_token_account_identity_id_fkey FOREIGN KEY (account_identity_id) REFERENCES public.account_identity(id) ON DELETE CASCADE;


--
-- Name: pack pack_cycle_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pack
    ADD CONSTRAINT pack_cycle_code_fkey FOREIGN KEY (cycle_code) REFERENCES public.cycle(code);


--
-- Name: pack pack_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pack
    ADD CONSTRAINT pack_type_fkey FOREIGN KEY (type) REFERENCES public.pack_type(pack_type);


--
-- Name: scenario scenario_campaign_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario
    ADD CONSTRAINT scenario_campaign_code_fkey FOREIGN KEY (campaign_code) REFERENCES public.campaign(code);


--
-- Name: scenario_encounter_set_card scenario_encounter_set_card_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_encounter_set_card
    ADD CONSTRAINT scenario_encounter_set_card_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: scenario_encounter_set_card scenario_encounter_set_card_scenario_code_encounter_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_encounter_set_card
    ADD CONSTRAINT scenario_encounter_set_card_scenario_code_encounter_code_fkey FOREIGN KEY (scenario_code, encounter_code) REFERENCES public.scenario_encounter_set(scenario_code, encounter_code) ON DELETE CASCADE;


--
-- Name: scenario_encounter_set scenario_encounter_set_encounter_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_encounter_set
    ADD CONSTRAINT scenario_encounter_set_encounter_code_fkey FOREIGN KEY (encounter_code) REFERENCES public.encounter_set(code) ON DELETE CASCADE;


--
-- Name: scenario_encounter_set scenario_encounter_set_scenario_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_encounter_set
    ADD CONSTRAINT scenario_encounter_set_scenario_code_fkey FOREIGN KEY (scenario_code) REFERENCES public.scenario(code) ON DELETE CASCADE;


--
-- Name: session session_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: verification_token verification_token_account_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_token
    ADD CONSTRAINT verification_token_account_identity_id_fkey FOREIGN KEY (account_identity_id) REFERENCES public.account_identity(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250803121609'),
    ('20250804132741'),
    ('20250804133251'),
    ('20250805131452'),
    ('20250826075406'),
    ('20250831084503'),
    ('20260113192307'),
    ('20260206184321'),
    ('20260227194035'),
    ('20260418123000'),
    ('20260505120000'),
    ('20260508231500'),
    ('20260705120000');
