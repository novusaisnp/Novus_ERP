import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Save } from 'lucide-react';
import { useMeuPerfil } from '@/hooks/useMeuPerfil';

const Perfil: React.FC = () => {
  const { perfil, loading, saving, savePerfil } = useMeuPerfil();
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome || '');
      setAvatarUrl(perfil.avatar_url || '');
    }
  }, [perfil]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePerfil({ nome: nome || null, avatar_url: avatarUrl || null });
  };

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-1">Meu Perfil</h1>
        <p className="text-muted-foreground">Edite seus dados pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" /> Dados do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{(nome || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                  {perfil?.email || 'Email não disponível'}
                </div>
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <Label>Avatar URL</Label>
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Perfil;
