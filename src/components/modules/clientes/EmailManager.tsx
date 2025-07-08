import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Mail } from 'lucide-react';

interface EmailManagerProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  className?: string;
}

export const EmailManager: React.FC<EmailManagerProps> = ({
  emails,
  onChange,
  className = ''
}) => {
  const addEmail = () => {
    console.log('[EmailManager] Adicionando novo email');
    onChange([...emails, '']);
  };

  const removeEmail = (index: number) => {
    console.log('[EmailManager] Removendo email no índice:', index);
    const newEmails = emails.filter((_, i) => i !== index);
    onChange(newEmails);
  };

  const updateEmail = (index: number, value: string) => {
    console.log('[EmailManager] Atualizando email no índice:', index, 'para:', value);
    const newEmails = [...emails];
    newEmails[index] = value;
    onChange(newEmails);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <Label className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          E-mails
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEmail}
          className="flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {emails.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p>Nenhum e-mail cadastrado</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addEmail}
              className="mt-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar primeiro e-mail
            </Button>
          </div>
        )}

        {emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
                placeholder={`E-mail ${index + 1}`}
                className={
                  email && !validateEmail(email) 
                    ? 'border-destructive focus:border-destructive' 
                    : ''
                }
              />
              {email && !validateEmail(email) && (
                <p className="text-sm text-destructive mt-1">
                  Formato de e-mail inválido
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeEmail(index)}
              className="px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};