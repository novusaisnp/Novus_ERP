import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Produto } from '@/types/produto';

interface Props {
  formData: Produto;
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
}

export const ImagemSection: React.FC<Props> = ({ formData, onChange }) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onChange('imagem_url', imageUrl);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagem do Produto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          {formData.imagem_url ? (
            <div className="text-center space-y-2">
              <img src={formData.imagem_url} alt="Preview" className="max-w-48 max-h-48 mx-auto rounded" />
              <Button type="button" variant="outline" onClick={() => onChange('imagem_url', '')}>
                Remover Imagem
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <span className="text-sm text-muted-foreground">
                    Clique para fazer upload ou arraste uma imagem
                  </span>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
