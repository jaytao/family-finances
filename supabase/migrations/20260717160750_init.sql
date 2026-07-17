--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.2

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: reject_child_under_valued_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_child_under_valued_parent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.parent_id is not null
     and exists (select 1 from snapshots where account_id = new.parent_id) then
    raise exception
      'The chosen parent account already has its own snapshot values. Remove them before giving it children.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;


--
-- Name: reject_parent_account_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_parent_account_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if exists (select 1 from accounts where parent_id = new.account_id) then
    raise exception
      'This account''s balance is derived from its child accounts, so it cannot have its own value.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    parent_id integer,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounts IS 'Chart of accounts. Supports hierarchy via parent_id.';


--
-- Name: COLUMN accounts.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts.type IS 'Asset types are further split to allow investment-only return calculations.';


--
-- Name: COLUMN accounts.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts.parent_id IS 'NULL = top-level account. Self-referencing for sub-accounts.';


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshots (
    id integer NOT NULL,
    account_id integer NOT NULL,
    snapshot_date date NOT NULL,
    balance numeric(19,4) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.snapshots IS 'End-of-month balances per account, entered manually once a month.';


--
-- Name: COLUMN snapshots.snapshot_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.snapshots.snapshot_date IS 'Use last day of month consistently, e.g. 2026-04-30.';


--
-- Name: snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.snapshots_id_seq OWNED BY public.snapshots.id;


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfers (
    id integer NOT NULL,
    account_id integer NOT NULL,
    date date NOT NULL,
    net_flow numeric(19,4) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transfers_investment_accounts CHECK (true)
);


--
-- Name: TABLE transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transfers IS 'Cash contributions and withdrawals for investment accounts. Used to strip out flows from return calculations.';


--
-- Name: COLUMN transfers.net_flow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transfers.net_flow IS 'Positive = money deposited into account. Negative = money withdrawn.';


--
-- Name: transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transfers_id_seq OWNED BY public.transfers.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots ALTER COLUMN id SET DEFAULT nextval('public.snapshots_id_seq'::regclass);


--
-- Name: transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers ALTER COLUMN id SET DEFAULT nextval('public.transfers_id_seq'::regclass);


--
-- Name: accounts accounts_name_parent_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_name_parent_unique UNIQUE (name, parent_id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: snapshots snapshots_account_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_account_date_unique UNIQUE (account_id, snapshot_date);


--
-- Name: snapshots snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_pkey PRIMARY KEY (id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: idx_accounts_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_parent ON public.accounts USING btree (parent_id);


--
-- Name: idx_accounts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_type ON public.accounts USING btree (type);


--
-- Name: idx_snapshots_account_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_account_date ON public.snapshots USING btree (account_id, snapshot_date DESC);


--
-- Name: idx_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_date ON public.snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_transfers_account_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_account_date ON public.transfers USING btree (account_id, date DESC);


--
-- Name: accounts accounts_reject_child_under_valued; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounts_reject_child_under_valued BEFORE INSERT OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.reject_child_under_valued_parent();


--
-- Name: snapshots snapshots_reject_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER snapshots_reject_parent BEFORE INSERT OR UPDATE ON public.snapshots FOR EACH ROW EXECUTE FUNCTION public.reject_parent_account_snapshot();


--
-- Name: accounts accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: snapshots snapshots_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: transfers transfers_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts authenticated full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated full access" ON public.accounts TO authenticated USING (true) WITH CHECK (true);


--
-- Name: snapshots authenticated full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated full access" ON public.snapshots TO authenticated USING (true) WITH CHECK (true);


--
-- Name: transfers authenticated full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated full access" ON public.transfers TO authenticated USING (true) WITH CHECK (true);


--
-- Name: snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

