# Roadmap futuro — motor regulatório assistido por IA

## Ideia

Transformar normas fiscais mutáveis em regras versionadas, mantendo o código de cálculo estável. IA auxilia descoberta, comparação e proposta; nunca publica regra tributária autonomamente.

## Fluxo seguro proposto

1. Ingerir apenas fontes oficiais, preservando URL, órgão, publicação, vigência e hash do documento.
2. IA extrair mudanças e produzir uma proposta estruturada com citações por campo.
3. Comparar proposta com a versão vigente e listar operações, UFs, regimes e NCMs afetados.
4. Executar cenários de regressão e simulações retroativas, sem alterar documentos autorizados.
5. Aprovação dupla: responsável fiscal/contábil e administrador NOVUS.
6. Publicar nova versão com início/fim de vigência, rollout e rollback.
7. Registrar em cada cálculo a versão da regra e a base normativa usada.

## Guardrails obrigatórios

- fonte sem origem oficial não entra no motor;
- conflito ou ambiguidade bloqueia publicação;
- regra nova nunca reprocessa silenciosamente período fechado;
- toda alteração é auditável, reversível e reproduzível;
- cálculo determinístico: IA não decide imposto no momento da emissão;
- dados de clientes e documentos fiscais não alimentam modelos públicos.

## Primeiro recorte quando priorizado

Monitorar Portal NF-e, Receita/SPED e legislação RTC; gerar somente relatório de impacto e casos de teste. Automatização de regra vem depois de precisão medida e aprovação jurídica/contábil.

Fontes iniciais: [Portal NF-e](https://www.nfe.fazenda.gov.br/portal/principal.aspx), [SPED](https://sped.rfb.gov.br/) e [EFD-Contribuições](https://www.gov.br/sped/pt-br/assuntos/escrituracoes-digitais/efd-contribuicoes).
