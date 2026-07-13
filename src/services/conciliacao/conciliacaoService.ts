// P15.2 — Service da Conciliação Bancária
import { supabase } from "@/integrations/supabase/client";
import type {
  ExtratoImportado,
  LinhaExtrato,
  RegraConciliacao,
  RegraConciliacaoInput,
  SugestaoMatchResult,
} from "@/types/conciliacao";

export const conciliacaoService = {
  async listarExtratos(): Promise<ExtratoImportado[]> {
    const { data, error } = await supabase
      .from("banco_extratos_importados")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as ExtratoImportado[];
  },

  async obterExtrato(id: string): Promise<ExtratoImportado | null> {
    const { data, error } = await supabase
      .from("banco_extratos_importados")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ExtratoImportado | null) ?? null;
  },

  async listarLinhas(extratoId: string): Promise<LinhaExtrato[]> {
    const { data, error } = await supabase
      .from("banco_movimentacoes_extrato")
      .select("*")
      .eq("extrato_importado_id", extratoId)
      .order("data_movimento", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []) as LinhaExtrato[];
  },

  async listarCandidatosMovimentacao(params: {
    contaBancariaId: string;
    valor: number;
    dataMovimento: string;
    janelaDias?: number;
  }) {
    const janela = params.janelaDias ?? 5;
    const inicio = new Date(params.dataMovimento);
    const fim = new Date(params.dataMovimento);
    inicio.setDate(inicio.getDate() - janela);
    fim.setDate(fim.getDate() + janela);
    const { data, error } = await supabase
      .from("movimentacoes_bancarias")
      .select("id, data_lancamento, valor, tipo, descricao, conciliado")
      .eq("conta_bancaria_id", params.contaBancariaId)
      .is("deleted_at", null)
      .eq("conciliado", false)
      .is("movimentacao_extrato_id", null)
      .gte("data_lancamento", inicio.toISOString().slice(0, 10))
      .lte("data_lancamento", fim.toISOString().slice(0, 10))
      .order("data_lancamento", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  async sugerirMatches(extratoId: string): Promise<SugestaoMatchResult> {
    const { data, error } = await supabase.rpc("sugerir_matches_extrato", {
      p_extrato_id: extratoId,
    });
    if (error) throw error;
    return data as unknown as SugestaoMatchResult;
  },

  async confirmarMatch(linhaId: string, movimentacaoId: string) {
    const { data, error } = await supabase.rpc("confirmar_match", {
      p_extrato_linha_id: linhaId,
      p_movimentacao_id: movimentacaoId,
    });
    if (error) throw error;
    return data;
  },

  async desfazerConciliacao(linhaId: string) {
    const { data, error } = await supabase.rpc("desfazer_conciliacao", {
      p_extrato_linha_id: linhaId,
    });
    if (error) throw error;
    return data;
  },

  async reverterExtrato(extratoId: string) {
    const { data, error } = await supabase.rpc("reverter_extrato", {
      p_extrato_id: extratoId,
    });
    if (error) throw error;
    return data;
  },

  async criarLancamento(linhaId: string, payload: Record<string, string | number | null> = {}) {
    const { data, error } = await supabase.rpc("criar_lancamento_do_extrato", {
      p_extrato_linha_id: linhaId,
      p_payload: payload as never,
    });
    if (error) throw error;
    return data;
  },

  async listarRegras(): Promise<RegraConciliacao[]> {
    const { data, error } = await supabase
      .from("banco_regras_conciliacao")
      .select("*")
      .is("deleted_at", null)
      .order("prioridade", { ascending: true });
    if (error) throw error;
    return (data ?? []) as RegraConciliacao[];
  },

  async criarRegra(input: RegraConciliacaoInput): Promise<RegraConciliacao> {
    const { data: empresaId, error: empErr } = await supabase.rpc("get_user_empresa_id");
    if (empErr) throw empErr;
    if (!empresaId) throw new Error("Usuário sem empresa vinculada.");
    const { data, error } = await supabase
      .from("banco_regras_conciliacao")
      .insert({ ...input, empresa_representada_id: empresaId as string })
      .select("*")
      .single();
    if (error) throw error;
    return data as RegraConciliacao;
  },

  async atualizarRegra(id: string, input: Partial<RegraConciliacaoInput>): Promise<RegraConciliacao> {
    const { data, error } = await supabase
      .from("banco_regras_conciliacao")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as RegraConciliacao;
  },

  async excluirRegra(id: string): Promise<void> {
    const { error } = await supabase
      .from("banco_regras_conciliacao")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async listarNaturezasReceita() {
    const { data, error } = await supabase
      .from("naturezas_receita")
      .select("id, nome")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; nome: string }>;
  },

  async listarPlanoContas() {
    const { data, error } = await supabase
      .from("plano_contas")
      .select("id, nome, codigo")
      .order("codigo");
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; nome: string; codigo: string | null }>;
  },

  async listarCentrosCusto() {
    const { data, error } = await supabase
      .from("centros_custo")
      .select("id, nome")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; nome: string }>;
  },

  async importarExtrato(file: File, contaBancariaId: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("conta_bancaria_id", contaBancariaId);
    const { data, error } = await supabase.functions.invoke("banco-parse-extrato", {
      body: form,
    });
    if (error) throw error;
    return data;
  },
};
