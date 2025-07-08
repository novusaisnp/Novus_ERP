-- Fix the corrupted hierarchical data in plano_contas
-- Step 1: Update parent relationships based on code structure

-- Set parent for level 2 accounts (e.g., 1.1 -> parent is 1)
UPDATE plano_contas 
SET id_pai = (
  SELECT id FROM plano_contas p2 
  WHERE p2.codigo = split_part(plano_contas.codigo, '.', 1)
  AND p2.nivel = 1
)
WHERE nivel = 2;

-- Set parent for level 3 accounts (e.g., 1.1.1 -> parent is 1.1)
UPDATE plano_contas 
SET id_pai = (
  SELECT id FROM plano_contas p2 
  WHERE p2.codigo = split_part(plano_contas.codigo, '.', 1) || '.' || split_part(plano_contas.codigo, '.', 2)
  AND p2.nivel = 2
)
WHERE nivel = 3;