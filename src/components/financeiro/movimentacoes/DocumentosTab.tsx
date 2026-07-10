import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  FileImage, 
  File,
  FilePlus,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { useDocumentosTitulo } from '@/hooks/useMovimentacoesCompletas';
import { TituloFinanceiro } from '@/types/movimentacoesFinanceiras';

interface DocumentosTabProps {
  titulo: TituloFinanceiro;
  podeEditar: boolean;
}

export const DocumentosTab = ({ titulo, podeEditar }: DocumentosTabProps) => {
  const { 
    documentos, 
    isLoading, 
    uploadDocumento, 
    deleteDocumento, 
    isUploading, 
    isDeleting 
  } = useDocumentosTitulo(titulo.id, titulo.tipo);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<string>('');
  const [descricao, setDescricao] = useState('');

  console.log('[DocumentosTab] Renderizando documentos para título:', titulo.id);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadDocumento({
        titulo_id: titulo.id,
        tipo_titulo: titulo.tipo,
        arquivo: selectedFile,
        categoria: categoria || 'OUTROS',
        descricao,
      });
      
      // Reset form
      setSelectedFile(null);
      setCategoria('');
      setDescricao('');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    }
  };

  const handleDelete = (documentoId: string) => {
    if (window.confirm('Tem certeza que deseja remover este documento?')) {
      deleteDocumento(documentoId);
    }
  };

  const getFileIcon = (tipoArquivo: string) => {
    if (tipoArquivo.startsWith('image/')) {
      return <FileImage className="w-8 h-8 text-blue-500" />;
    }
    if (tipoArquivo === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels = {
      'NOTA_FISCAL': 'Nota Fiscal',
      'CONTRATO': 'Contrato',
      'COMPROVANTE': 'Comprovante',
      'OUTROS': 'Outros',
    } as const;
    return labels[categoria as keyof typeof labels] || categoria;
  };

  const getCategoriaVariant = (categoria: string) => {
    const variants = {
      'NOTA_FISCAL': 'default',
      'CONTRATO': 'secondary',
      'COMPROVANTE': 'outline',
      'OUTROS': 'secondary',
    } as const;
    return variants[categoria as keyof typeof variants] || 'default';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Notas Fiscais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {documentos.filter(d => d.categoria === 'NOTA_FISCAL').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {documentos.filter(d => d.categoria === 'CONTRATO').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Comprovantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {documentos.filter(d => d.categoria === 'COMPROVANTE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de upload */}
      {podeEditar && (
        <div className="flex justify-end">
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Enviar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Arquivo</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOTA_FISCAL">Nota Fiscal</SelectItem>
                      <SelectItem value="CONTRATO">Contrato</SelectItem>
                      <SelectItem value="COMPROVANTE">Comprovante</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva o documento..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Lista de documentos */}
      {documentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FilePlus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Este título ainda não possui documentos anexados.
            </p>
            {podeEditar && (
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Enviar Primeiro Documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentos.map((documento) => (
            <Card key={documento.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(documento.tipo_arquivo)}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium truncate" title={documento.nome_original}>
                        {documento.nome_original}
                      </h4>
                      <Badge 
                        variant={getCategoriaVariant(documento.categoria)}
                        className="mt-1"
                      >
                        {getCategoriaLabel(documento.categoria)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(documento.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <File className="w-3 h-3" />
                    <span>{formatFileSize(documento.tamanho_bytes)}</span>
                  </div>

                  {documento.upload_usuario_id && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Enviado por usuário</span>
                    </div>
                  )}
                </div>

                {documento.descricao && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded-md">
                    {documento.descricao}
                  </p>
                )}

                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" title="Visualizar">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" title="Download">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {podeEditar && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(documento.id)}
                      disabled={isDeleting}
                      title="Remover"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};