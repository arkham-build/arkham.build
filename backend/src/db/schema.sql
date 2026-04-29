\restrict dbmate

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3 (Homebrew)

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
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT uuidv7() NOT NULL,
    name character varying(64) NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: account_identity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_identity (
    account_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT uuidv7() NOT NULL,
    provider character varying(64) NOT NULL,
    provider_user_id text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    verified_at timestamp without time zone,
    email character varying(255),
    password_hash text
);


--
-- Name: account_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_settings (
    account_id uuid NOT NULL,
    collection jsonb,
    revision uuid DEFAULT uuidv7() NOT NULL,
    settings jsonb
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
    xp_spent integer
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
    last_activity_at timestamp without time zone DEFAULT now() NOT NULL
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
-- Name: arkhamdb_ranking_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkhamdb_ranking_cache ALTER COLUMN id SET DEFAULT nextval('public.arkhamdb_ranking_cache_id_seq'::regclass);


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
-- Name: idx_account_identity_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_identity_account_id ON public.account_identity USING btree (account_id);


--
-- Name: idx_account_identity_provider_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_account_identity_provider_email ON public.account_identity USING btree (provider, email) WHERE (email IS NOT NULL);


--
-- Name: idx_account_identity_provider_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_account_identity_provider_uid ON public.account_identity USING btree (provider, provider_user_id) WHERE (provider_user_id IS NOT NULL);


--
-- Name: idx_account_settings_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_settings_account_id ON public.account_settings USING btree (account_id);


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
-- Name: idx_oauth_tokens_account_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_oauth_tokens_account_identity ON public.oauth_token USING btree (account_identity_id);


--
-- Name: idx_pack_cycle_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pack_cycle_code ON public.pack USING btree (cycle_code);


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
-- Name: account_identity account_identity_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identity
    ADD CONSTRAINT account_identity_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_settings account_settings_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings
    ADD CONSTRAINT account_settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


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
    ('20260429184500');
