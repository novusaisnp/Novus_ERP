import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImportarExtrato } from "@/hooks/conciliacao/useConciliacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, ArrowLeft } from "lucide-react";

export default function ImportarExtratoPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [contaId, setContaId] = useState<string>("");
  const importar = useImportarExtrato();

  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("id, descricao, numero_conta, nome_titular")
        .is("deleted_at", null)
        .order("descricao");
      if (error) throw error;
      return data ?? [];
    },
  });

  const canSubmit = !!file && !!contaId && !importar.isPending;

  async function handleSubmit() {
    if (!file || !contaId) return;
    const result = await importar.mutateAsync({ file, contaBancariaId: contaId });
    const extratoId = (result as { extrato_id?: string } | undefined)?.extrato_id;
    if (extratoId) navigate(`../${extratoId}`);
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("..")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Importar extrato bancário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Conta bancária</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {(contas ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.descricao ?? c.nome_titular ?? c.numero_conta ?? c.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Arquivo (OFX ou CSV, até 5MB)</Label>
            <Input
              type="file"
              accept=".ofx,.csv,.txt,application/x-ofx,text/csv,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              CSV esperado: <code>data;valor;descricao;documento</code> (ponto-e-vírgula ou vírgula;
              datas DD/MM/AAAA ou AAAA-MM-DD; valor negativo indica saída).
            </AlertDescription>
          </Alert>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            <FileUp className="h-4 w-4 mr-2" />
            {importar.isPending ? "Importando..." : "Importar e conciliar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
