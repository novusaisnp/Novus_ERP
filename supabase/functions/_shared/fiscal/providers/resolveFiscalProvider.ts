import {
  FiscalEnvironment,
  FiscalProvider,
  FiscalProviderName,
} from './FiscalProvider.ts';
import { FocusNFeProvider } from './FocusNFeProvider.ts';

/**
 * Instancia o provedor fiscal correspondente ao nome/ambiente.
 * Novos provedores (PlugNotas, eNotas, NFe.io) são adicionados aqui.
 */
export function resolveFiscalProvider(
  providerName: FiscalProviderName,
  environment: FiscalEnvironment,
): FiscalProvider {
  switch (providerName) {
    case 'focusnfe':
      return FocusNFeProvider.fromEnv(environment);
    case 'plugnotas':
    case 'enotas':
    case 'nfeio':
      throw new Error(`Provedor '${providerName}' ainda não implementado (previsto para Fase 4+).`);
    default: {
      const _exhaustive: never = providerName;
      throw new Error(`Provedor desconhecido: ${_exhaustive}`);
    }
  }
}
