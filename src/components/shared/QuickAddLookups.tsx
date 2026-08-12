import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QuickAddLookup, type QuickAddResult } from '@/components/shared/QuickAddDialog';
import { cargoService } from '@/services/cargoService';
import { departamentoService } from '@/services/departamentoService';
import { setorService } from '@/services/setorService';
import { centroCustoService } from '@/services/centroCustoService';
import { localizacaoService } from '@/services/localizacaoService';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

interface LookupProps {
  onCreated: (created: QuickAddResult) => void | Promise<void>;
}

interface RefreshableLookupProps extends LookupProps {
  onRefresh?: () => void | Promise<unknown>;
}

export const QuickAddCargo: React.FC<LookupProps> = ({ onCreated }) => {
  const queryClient = useQueryClient();
  return (
    <QuickAddLookup
      title="Novo Cargo"
      tooltip="Cadastrar cargo"
      onCreate={async ({ nome, descricao }) => {
        const created = await cargoService.createCargo({ nome, descricao, ativo: true });
        await queryClient.invalidateQueries({ queryKey: ['cargos'] });
        return { id: created.id, nome: created.nome };
      }}
      onCreated={onCreated}
    />
  );
};

export const QuickAddDepartamento: React.FC<LookupProps> = ({ onCreated }) => {
  const queryClient = useQueryClient();
  return (
    <QuickAddLookup
      title="Novo Departamento"
      tooltip="Cadastrar departamento"
      onCreate={async ({ nome, descricao }) => {
        const created = await departamentoService.createDepartamento({ nome, descricao, ativo: true });
        await queryClient.invalidateQueries({ queryKey: ['departamentos'] });
        return { id: created.id, nome: created.nome };
      }}
      onCreated={onCreated}
    />
  );
};

interface SetorProps extends RefreshableLookupProps {
  departamentoId?: string | null;
}

export const QuickAddSetor: React.FC<SetorProps> = ({ departamentoId, onCreated, onRefresh }) => {
  const queryClient = useQueryClient();
  return (
    <QuickAddLookup
      title="Novo Setor"
      tooltip="Cadastrar setor"
      onCreate={async ({ nome, descricao }) => {
        const created = await setorService.createSetor({
          nome,
          descricao,
          departamento_id: departamentoId || null,
          ativo: true,
        });
        await queryClient.invalidateQueries({ queryKey: ['setores'] });
        await onRefresh?.();
        return { id: created.id, nome: created.nome };
      }}
      onCreated={onCreated}
    />
  );
};

export const QuickAddCentroCusto: React.FC<LookupProps> = ({ onCreated }) => {
  const queryClient = useQueryClient();
  return (
    <QuickAddLookup
      title="Novo Centro de Custo"
      tooltip="Cadastrar centro de custo"
      showCode
      onCreate={async ({ nome, codigo, descricao }) => {
        const created = await centroCustoService.create({ nome, codigo, descricao, ativo: true });
        await queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
        await queryClient.invalidateQueries({ queryKey: ['conciliacao', 'lookup', 'centros-custo'] });
        return { id: created.id, nome: created.nome };
      }}
      onCreated={onCreated}
    />
  );
};

interface LocalizacaoProps extends LookupProps {
  empresaId?: string;
}

export const QuickAddLocalizacao: React.FC<LocalizacaoProps> = ({ empresaId, onCreated }) => {
  const queryClient = useQueryClient();
  return (
    <QuickAddLookup
      title="Nova Localização"
      tooltip="Cadastrar localização"
      onCreate={async ({ nome, descricao }) => {
        const empresa_representada_id = empresaId || await getEmpresaAtivaIdOuFalha();
        const created = await localizacaoService.create({
          empresa_representada_id,
          nome,
          descricao: descricao || null,
          ativo: true,
        });
        await queryClient.invalidateQueries({ queryKey: ['localizacoes'] });
        await queryClient.invalidateQueries({ queryKey: ['locs-select', empresa_representada_id] });
        return { id: created.id, nome: created.nome };
      }}
      onCreated={onCreated}
    />
  );
};
