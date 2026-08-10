-- Separado da migration seguinte de propósito: Postgres não permite usar um valor de enum
-- novo (ADD VALUE) na mesma transação em que ele foi adicionado.
ALTER TYPE public.app_role ADD VALUE 'novus_owner';
