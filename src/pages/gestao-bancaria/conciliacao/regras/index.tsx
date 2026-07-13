// P15.3 — CRUD Regras de Conciliação Bancária
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useRegrasConciliacao,
  useExcluirRegra,
} from "@/hooks/conciliacao/useConciliacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteWithDeps } from "@/components/shared/ConfirmDeleteWithDeps";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { RegraForm } from "./RegraForm";
import type { RegraConciliacao } from "@/types/conciliacao";

const TIPO_LABEL: Record<string, string> = {
  PALAVRA_CHAVE: "Palavra-chave",
  VALOR_EXATO: "Valor exato",
  REGEX: "Regex",
  CONTRAPARTE: "Contraparte",
};

export default function RegrasConciliacaoPage() {
  const navigate = useNavigate();
  const { data: regras, isLoading } = useRegrasConciliacao();
  const excluir = useExcluirRegra();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RegraConciliacao | null>(null);
  const [toDelete, setToDelete] = useState<RegraConciliacao | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: RegraConciliacao) => {
    setEditing(r);
    setFormOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("..")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Regras de conciliação</CardTitle>
          <Button size="sm" onClick={openNew} data-testid="btn-nova-regra">
            <Plus className="h-4 w-4 mr-1" /> Nova regra
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !regras || regras.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma regra cadastrada. Clique em "Nova regra" para criar a primeira.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Prior.</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Padrão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody data-testid="tabela-regras">
                  {regras.map((r) => (
                    <TableRow key={r.id} data-testid={`regra-row-${r.id}`}>
                      <TableCell className="font-mono">{r.prioridade}</TableCell>
                      <TableCell className="font-medium" data-testid={`regra-nome-${r.id}`}>{r.nome}</TableCell>
                      <TableCell>{TIPO_LABEL[r.tipo] ?? r.tipo}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground">
                        {r.padrao ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.ativa ? "default" : "secondary"}>
                          {r.ativa ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(r)}
                          aria-label="Editar"
                          data-testid={`btn-editar-regra-${r.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setToDelete(r)}
                          aria-label="Excluir"
                          data-testid={`btn-excluir-regra-${r.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RegraForm open={formOpen} onOpenChange={setFormOpen} regra={editing} />

      <ConfirmDeleteWithDeps
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        entidade="banco_regras_conciliacao"
        id={toDelete?.id ?? null}
        nomeRegistro={toDelete?.nome}
        loading={excluir.isPending}
        onConfirm={async () => {
          if (toDelete) {
            await excluir.mutateAsync(toDelete.id);
            setToDelete(null);
          }
        }}
      />
    </div>
  );
}
