# Ativação fiscal real — Focus NFe

Estado interno em 2026-08-11: NF-e, NFC-e e MDF-e rodoviário têm emissão, consulta, cancelamento, eventos aplicáveis, arquivamento, RLS e integridade implementados. O que resta abaixo depende de credenciais, cadastros e homologação externos.

## 1. Preparar a Focus NFe

1. Cadastrar a empresa emitente na Focus, primeiro em homologação.
2. Vincular e validar o certificado A1 no painel da Focus. O ERP não guarda senha ou arquivo do certificado.
3. Configurar CSC da NFC-e e habilitar NF-e/NFC-e/MDF-e para o CNPJ.
4. Obter os tokens de homologação e produção.

Referências oficiais: [autenticação](https://doc.focusnfe.com.br/reference/autenticacao), [NF-e](https://doc.focusnfe.com.br/reference/emitir_nfe), [NFC-e](https://doc.focusnfe.com.br/reference/emitir_nfce) e [MDF-e](https://doc.focusnfe.com.br/reference/emitir_mdfe).

## 2. Configurar secrets das Edge Functions

```text
FISCAL_PROVIDER_API_KEY_HOM=<token de homologação>
FISCAL_PROVIDER_API_KEY_PROD=<token de produção>
FISCAL_MOCK=false
```

Não cadastrar tokens no frontend ou no banco. `FISCAL_MOCK` deve permanecer `true` até o início formal da homologação.

## 3. Configurar a empresa no ERP

Em **Fiscal → Tributos → Configurações**:

- ambiente `HOMOLOGACAO`;
- provedor Focus NFe;
- CNPJ e Inscrição Estadual do emitente;
- regime tributário;
- séries autorizadas e RNTRC com 8 dígitos para MDF-e. A numeração fiscal fica sob controle do provedor; número de venda nunca é reaproveitado como número fiscal.

O cadastro do cliente exige indicador de IE e consumidor final. Cada produto exige NCM, origem, CST/CSOSN, PIS, COFINS e classificação/alíquotas IBS/CBS. A emissão bloqueia dados incompletos; não há valores fiscais inventados.

## 4. Publicar as funções

Deploy separado do Git:

```text
fiscal-emitir-nfe
fiscal-consultar-nfe
fiscal-cancelar-nfe
fiscal-cce-nfe
fiscal-emitir-mdfe
fiscal-evento-mdfe
fiscal-signed-url
fiscal-smoke-run
```

## 5. Homologar

1. Criar cliente, produto e pagamentos sintéticos, com enquadramento fornecido pela contabilidade.
2. Emitir NF-e em homologação.
3. Confirmar autorização após emissão ou consulta assíncrona.
4. Baixar XML e DANFE dos buckets privados.
5. Registrar CC-e permitida.
6. Cancelar dentro do prazo da UF.
7. Conferir timeline, protocolo, código/motivo SEFAZ e resposta bruta do provedor.
8. Emitir NFC-e com pagamento realista; conferir QR Code/DANFCE e cancelar dentro do prazo aplicável.
9. Emitir MDF-e com NF-e autorizada, seguro, veículo e condutor; consultar até autorização, incluir condutor, encerrar e testar cancelamento em documento separado.

Não há dependência de webhook para consistência: o ERP consulta a Focus enquanto o documento estiver em processamento. Webhook pode ser adicionado depois como redução de latência, seguindo o mecanismo de autenticação efetivamente disponibilizado pelo provedor; não presumir HMAC inexistente.

## 6. Virar produção

Somente após aceite escrito da contabilidade:

1. conferir série/numeração e cadastro da empresa na Focus Produção;
2. garantir `FISCAL_PROVIDER_API_KEY_PROD`;
3. alterar o ambiente da configuração para `PRODUCAO`;
4. emitir uma operação real controlada;
5. conciliar chave, protocolo, XML, DANFE e valores com o portal/contabilidade.

Rollback operacional: voltar a configuração para homologação ou `FISCAL_MOCK=true`. Isso interrompe chamadas novas; nunca altera documentos já autorizados.

## Fora do escopo seguro atual

- NFS-e, importação, devolução e substituição tributária avançada;
- NFC-e anônima/PDV e contingência offline ainda não aparecem na UI; o contrato do provedor já suporta contingência, mas exige controle local de numeração/código único antes de uso real;
- MDF-e nos modais aéreo, aquaviário e ferroviário, CIOT, vale-pedágio, reboques e produto perigoso;
- inutilização de faixa numérica;
- geração válida de EFD ICMS/IPI, ECD e ECF.

Esses fluxos exigem modelos próprios e não podem reaproveitar a venda normal por aproximação.
