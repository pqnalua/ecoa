-- ============================================================
-- ECOA - Banco de dados (PostgreSQL / Supabase)
-- Arquivo: CTDS-2026-02-BD-ECOA-Sophia-Maria-Luiza.sql-- ============================================================

-- ------------------------------------------------------------
-- 0. Compatibilidade com o Supabase
-- No Supabase, o schema "auth", a tabela auth.users e a função
-- auth.uid() já existem e este bloco não altera nada.
-- Em um PostgreSQL comum, ele cria versões mínimas para que o
-- restante do script rode sem erros.
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
             $f$ SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::uuid $f$';
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 1. usuario
-- ------------------------------------------------------------
CREATE TABLE public.usuario (
  id_usuario uuid NOT NULL,
  nome character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  fotoavatar_url text,
  data_nascimento date,
  tipo_consumidor character varying CHECK (tipo_consumidor::text = ANY (ARRAY['consumista'::character varying, 'endividado'::character varying, 'controlado'::character varying]::text[])),
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  deletado_em timestamp with time zone,
  cpf text CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'::text),
  idade integer CHECK (idade IS NULL OR idade >= 13 AND idade <= 120),
  CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuario_auth_fk FOREIGN KEY (id_usuario) REFERENCES auth.users(id)
);

-- ------------------------------------------------------------
-- 2. perfil_financeiro (depende de usuario)
-- ------------------------------------------------------------
CREATE TABLE public.perfil_financeiro (
  id_perfil uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL UNIQUE,
  renda_mensal numeric,
  gasto_fixo_mensal numeric,
  percentual_investimento numeric,
  objetivo_principal character varying,
  nivel_formulario character varying,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  faixa_renda text,
  dia_pagamento text,
  sustenta_alguem boolean,
  qtd_dependentes text,
  moradia text,
  CONSTRAINT perfil_financeiro_pkey PRIMARY KEY (id_perfil),
  CONSTRAINT perfil_financeiro_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 3. categoria (depende de usuario)
-- ------------------------------------------------------------
CREATE TABLE public.categoria (
  id_categoria uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid,
  nome character varying NOT NULL,
  tipo character varying NOT NULL,
  is_sistema boolean DEFAULT false,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT categoria_pkey PRIMARY KEY (id_categoria),
  CONSTRAINT categoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 4. conta_bancaria (depende de usuario)
-- ------------------------------------------------------------
CREATE TABLE public.conta_bancaria (
  id_conta uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  banco character varying NOT NULL,
  tipo_conta character varying NOT NULL,
  saldo_atual numeric DEFAULT 0,
  saldo_inicial numeric DEFAULT 0,
  cor character varying,
  ativa boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  deletado_em timestamp with time zone,
  pluggy_item_id text,
  pluggy_account_id text,
  CONSTRAINT conta_bancaria_pkey PRIMARY KEY (id_conta),
  CONSTRAINT conta_bancaria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 5. movimentacao (depende de usuario, conta_bancaria e categoria)
-- ------------------------------------------------------------
CREATE TABLE public.movimentacao (
  id_movimentacao uuid NOT NULL DEFAULT gen_random_uuid(),
  id_conta uuid,
  id_categoria uuid,
  valor numeric NOT NULL CHECK (valor > 0::numeric),
  descricao character varying,
  data_transacao date DEFAULT CURRENT_DATE,
  data_prevista date,
  tipo character varying NOT NULL CHECK (tipo::text = ANY (ARRAY['despesa'::character varying, 'receita'::character varying]::text[])),
  status character varying DEFAULT 'concluida'::character varying,
  recorrente boolean DEFAULT false,
  parcela_total integer DEFAULT 1,
  parcela_atual integer DEFAULT 1,
  anexo_url text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  deletado_em timestamp with time zone,
  id_usuario uuid NOT NULL DEFAULT auth.uid(),
  natureza text CHECK (natureza = ANY (ARRAY['fixo'::text, 'variavel'::text, 'extra'::text])),
  humor text CHECK (humor = ANY (ARRAY['alegria'::text, 'tristeza'::text, 'ansiedade'::text, 'tedio'::text, 'raiva'::text])),
  origem text NOT NULL DEFAULT 'manual'::text CHECK (origem = ANY (ARRAY['manual'::text, 'voz'::text, 'pluggy'::text])),
  texto_original text,
  id_externo text,
  id_agrupamento uuid,
  CONSTRAINT movimentacao_pkey PRIMARY KEY (id_movimentacao),
  CONSTRAINT movimentacao_id_conta_fkey FOREIGN KEY (id_conta) REFERENCES public.conta_bancaria(id_conta),
  CONSTRAINT movimentacao_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categoria(id_categoria),
  CONSTRAINT movimentacao_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 6. meta (depende de usuario)
-- ------------------------------------------------------------
CREATE TABLE public.meta (
  id_meta uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  nome character varying NOT NULL,
  descricao text,
  valor_alvo numeric NOT NULL,
  valor_atual numeric DEFAULT 0,
  data_inicio date DEFAULT CURRENT_DATE,
  data_fim date,
  prioridade integer DEFAULT 1,
  status character varying DEFAULT 'ativa'::character varying,
  progresso numeric DEFAULT 0,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  deletado_em timestamp with time zone,
  favorita boolean DEFAULT false,
  concluida boolean DEFAULT false,
  icone text,
  CONSTRAINT meta_pkey PRIMARY KEY (id_meta),
  CONSTRAINT meta_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 7. humor_financeiro (depende de usuario)
-- ------------------------------------------------------------
CREATE TABLE public.humor_financeiro (
  id_humor uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  humor character varying NOT NULL,
  descricao text,
  motivacao character varying,
  data_registro timestamp with time zone DEFAULT now(),
  CONSTRAINT humor_financeiro_pkey PRIMARY KEY (id_humor),
  CONSTRAINT humor_financeiro_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 8. orcamento (depende de usuario e categoria)
-- ------------------------------------------------------------
CREATE TABLE public.orcamento (
  id_orcamento uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  id_categoria uuid,
  mes integer NOT NULL,
  ano integer NOT NULL,
  valor_planejado numeric NOT NULL,
  valor_gasto numeric DEFAULT 0,
  alerta_percentual integer DEFAULT 80,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT orcamento_pkey PRIMARY KEY (id_orcamento),
  CONSTRAINT orcamento_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categoria(id_categoria),
  CONSTRAINT orcamento_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 9. notificacao (depende de usuario)
-- ------------------------------------------------------------
CREATE TABLE public.notificacao (
  id_notificacao uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  titulo character varying NOT NULL,
  mensagem text NOT NULL,
  tipo character varying NOT NULL,
  lida boolean DEFAULT false,
  link character varying,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT notificacao_pkey PRIMARY KEY (id_notificacao),
  CONSTRAINT notificacao_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 10. assinatura (depende de auth.users)
-- ------------------------------------------------------------
CREATE TABLE public.assinatura (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  nome_plano text NOT NULL,
  categoria text NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT assinatura_pkey PRIMARY KEY (id),
  CONSTRAINT assinatura_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ------------------------------------------------------------
-- 11. aporte_meta (depende de meta)
-- ------------------------------------------------------------
CREATE TABLE public.aporte_meta (
  id_aporte uuid NOT NULL DEFAULT gen_random_uuid(),
  id_meta uuid NOT NULL,
  id_usuario uuid NOT NULL DEFAULT auth.uid(),
  valor numeric NOT NULL,
  tipo text NOT NULL DEFAULT 'deposito'::text CHECK (tipo = ANY (ARRAY['deposito'::text, 'retirada'::text, 'ajuste'::text])),
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aporte_meta_pkey PRIMARY KEY (id_aporte),
  CONSTRAINT aporte_meta_id_meta_fkey FOREIGN KEY (id_meta) REFERENCES public.meta(id_meta)
);

-- ============================================================
-- Fim do script
-- ============================================================