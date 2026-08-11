import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CamposExtrasSection } from './CamposExtrasSection';
import { camposExtrasPreenchidos, formatarCampoExtra } from '@/utils/camposExtrasUtils';

describe('CamposExtrasSection', () => {
  it('fica invisível sem definições e entrega alterações pela chave técnica', () => {
    const onChange = vi.fn();
    const { rerender } = render(<CamposExtrasSection campos={[]} valores={{}} onChange={onChange} />);

    expect(screen.queryByText('Informações adicionais')).not.toBeInTheDocument();

    rerender(
      <CamposExtrasSection
        campos={[{ chave: 'segmento', rotulo: 'Segmento', tipo: 'texto', obrigatorio: true }]}
        valores={{}}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Segmento *'), { target: { value: 'Varejo' } });
    expect(onChange).toHaveBeenCalledWith('segmento', 'Varejo');
  });

  it('valida texto e confirmação booleana obrigatórios', () => {
    const campos = [
      { chave: 'segmento', rotulo: 'Segmento', tipo: 'texto' as const, obrigatorio: true },
      { chave: 'aceite', rotulo: 'Aceite', tipo: 'booleano' as const, obrigatorio: true },
    ];

    expect(camposExtrasPreenchidos(campos, { segmento: 'Varejo', aceite: false })).toBe(false);
    expect(camposExtrasPreenchidos(campos, { segmento: 'Varejo', aceite: true })).toBe(true);
  });

  it('formata valores personalizados para a listagem', () => {
    expect(formatarCampoExtra('booleano', true)).toBe('Sim');
    expect(formatarCampoExtra('data', '2026-08-11')).toBe('11/08/2026');
    expect(formatarCampoExtra('texto', undefined)).toBe('-');
  });
});
