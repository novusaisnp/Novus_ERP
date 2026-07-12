import { useState } from 'react';
import { BookmarkPlus, Star, Trash2, Pencil, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReportPreset, UseReportPresetsApi } from '@/hooks/useReportPresets';

interface PresetsMenuProps<S> {
  api: UseReportPresetsApi<S>;
  currentState: S;
  onApply: (state: S) => void;
}

export function PresetsMenu<S>({ api, currentState, onApply }: PresetsMenuProps<S>) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [renameFor, setRenameFor] = useState<ReportPreset<S> | null>(null);
  const [nameInput, setNameInput] = useState('');

  const handleSaveOpen = () => {
    setNameInput('');
    setSaveOpen(true);
  };

  const handleSaveConfirm = () => {
    const p = api.save(nameInput, currentState);
    if (p) setSaveOpen(false);
  };

  const handleRenameOpen = (p: ReportPreset<S>) => {
    setRenameFor(p);
    setNameInput(p.name);
  };

  const handleRenameConfirm = () => {
    if (renameFor) {
      api.rename(renameFor.id, nameInput);
      setRenameFor(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookmarkPlus className="h-4 w-4" />
            Visões
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={handleSaveOpen}>
            <BookmarkPlus className="h-4 w-4 mr-2" />
            Salvar visão atual
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Presets salvos</DropdownMenuLabel>
          {api.presets.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum preset salvo.</div>
          ) : (
            api.presets.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1 px-2 py-1 hover:bg-accent rounded-sm"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-sm truncate"
                  onClick={() => onApply(p.state)}
                  title={p.name}
                >
                  <span className="inline-flex items-center gap-1">
                    {p.isDefault && <Check className="h-3 w-3 text-primary" />}
                    {p.name}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Definir como padrão"
                  className="p-1 hover:text-primary"
                  onClick={() => api.setDefault(p.isDefault ? null : p.id)}
                >
                  <Star
                    className={`h-3 w-3 ${p.isDefault ? 'fill-primary text-primary' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Renomear preset"
                  className="p-1 hover:text-primary"
                  onClick={() => handleRenameOpen(p)}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Excluir preset"
                  className="p-1 hover:text-destructive"
                  onClick={() => api.remove(p.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar visão atual</DialogTitle>
            <DialogDescription>
              Salva filtros, agrupamento e comparação para reutilizar depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name">Nome</Label>
            <Input
              id="preset-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ex: Fechamento mensal"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfirm}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFor !== null} onOpenChange={(o) => !o && setRenameFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input">Novo nome</Label>
            <Input
              id="rename-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFor(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameConfirm}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
