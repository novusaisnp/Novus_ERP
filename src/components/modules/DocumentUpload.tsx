import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  label: string;
  value?: string;
  onChange: (value: string | null) => void;
  accept?: string;
  required?: boolean;
  description?: string;
  maxSize?: number; // em MB
  showPreview?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  label,
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  required = false,
  description,
  maxSize = 5,
  showPreview = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  console.log('[DocumentUpload] Iniciando upload para:', label);

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`Arquivo muito grande. Tamanho máximo: ${maxSize}MB`);
      return;
    }

    setUploading(true);
    console.log('[DocumentUpload] Processando arquivo:', file.name);

    try {
      // Simular upload - aqui você integraria com Supabase Storage
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onChange(base64);
        console.log('[DocumentUpload] Upload concluído:', file.name);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[DocumentUpload] Erro no upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const isImage = value && (value.includes('image/') || value.includes('data:image/'));

  return (
    <div className="space-y-2">
      <Label htmlFor={label.replace(/\s+/g, '')}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <Card className={`transition-colors duration-200 ${dragOver ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
        <CardContent className="p-4">
          {value ? (
            <div className="space-y-3">
              {showPreview && isImage ? (
                <div className="relative">
                  <img
                    src={value}
                    alt="Preview"
                    className="max-w-full h-32 object-cover rounded-md mx-auto"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <File className="h-4 w-4" />
                  <span className="text-sm font-medium">Arquivo enviado</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Arquivo carregado
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange(null);
                    console.log('[DocumentUpload] Arquivo removido:', label);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById(`file-${label.replace(/\s+/g, '')}`)?.click()}
            >
              {uploading ? (
                <div className="space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {showPreview ? (
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo</p>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: {accept.replace(/\./g, '').toUpperCase()}
                      <br />
                      Tamanho máximo: {maxSize}MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Input
            id={`file-${label.replace(/\s+/g, '')}`}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  );
};