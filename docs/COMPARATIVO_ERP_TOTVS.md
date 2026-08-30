# NOVUS ERP × ERPs consagrados no Brasil

## Diagnóstico competitivo, lacunas e estratégia para paridade ou superação da TOTVS

**Data da pesquisa:** 30 de agosto de 2026  
**Escopo:** comparação funcional e estratégica entre o NOVUS ERP, o ecossistema TOTVS e outros ERPs relevantes no mercado brasileiro.

## Diagnóstico executivo

Hoje, o NOVUS é uma base promissora de ERP operacional, mas ainda não está em paridade funcional com Protheus, Sankhya, Senior ou SAP Business One — antes mesmo de comparar com todo o ecossistema TOTVS.

A distância não está principalmente na quantidade de telas. Está na ausência de alguns motores estruturantes:

- contabilidade por partidas dobradas;
- compras e suprimentos;
- hierarquia grupo → empresa → estabelecimento;
- fiscal realmente homologado e continuamente atualizado;
- folha, ponto e eSocial;
- orçamento, alçadas e workflows;
- ativo fixo;
- produção, logística e verticais especializados;
- operação comprovada em escala empresarial.

Avaliação sintética considerando o código e os documentos atuais:

- **NOVUS hoje:** ERP horizontal operacional em maturidade inicial/intermediária, aproximadamente nível 2 de 5.
- **Paridade com ERP SMB moderno, como Omie/Bling:** alcançável em uma primeira grande etapa.
- **Paridade com SAP Business One/Sankhya:** exige completar todo o núcleo empresarial.
- **Paridade com Protheus Backoffice:** exige núcleo empresarial, fiscal, RH e suprimentos maduros.
- **Paridade com o portfólio completo TOTVS:** é um programa de produto multianual, envolvendo vários domínios especializados.

Esta pesquisa utiliza o código atual do NOVUS, os documentos do projeto, páginas oficiais dos fornecedores e fontes governamentais.

## Uma correção importante na definição da meta

“O ERP da TOTVS” não é um sistema único. A TOTVS combina diversas linhas — Protheus, RM, Datasul, Logix, Winthor e Consinco — com Fluig, RH, Techfin, Analytics e sistemas especializados para 12 segmentos.

O próprio Protheus Backoffice já inclui faturamento, call center, contratos, licitações, compras, estoque e custos, projetos, financeiro, ativo fixo, contabilidade, orçamento, fiscal e comércio exterior. Consulte o [portfólio oficial do Protheus](https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-backoffice-linha-protheus/).

Além disso, a TOTVS mantém produtos próprios para manufatura, varejo, logística, saúde, construção, educação, hotelaria, jurídico e outros segmentos. Consulte a [visão geral da TOTVS Gestão](https://www.totvs.com/gestao/).

Portanto, a meta viável deve ser:

> Um único NOVUS, com um único núcleo, identidade comercial e experiência integrada, contendo capacidades ativáveis por necessidade — sem edições diferentes e sem mostrar toda a complexidade para todos os clientes.

Isso não significa colocar hospital, fábrica, escola e hotel no mesmo menu. Significa que todos compartilham a mesma plataforma, cadastros, financeiro, contabilidade, fiscal, segurança, documentos, workflow e integrações, enquanto recursos especializados são ativados conforme o negócio.

Essa direção altera formalmente a estratégia atual. O [`PLANO_MESTRE.md`](./PLANO_MESTRE.md) declara que o NOVUS não pretende atender negócios com produção, BOM, MRP ou ordem de fabricação. A nova ambição é o oposto.

## Comparação funcional

| Domínio | NOVUS hoje | TOTVS e líderes | Lacuna |
|---|---|---|---|
| Cadastros centrais | Entidades, clientes, fornecedores, colaboradores, produtos e serviços; modelo unificado interessante | Cadastros amplos, grupos empresariais, filiais, parceiros, recursos, ativos e especializações verticais | Média |
| Estrutura empresarial | Multiempresa por tenant, mas modelo ainda essencialmente plano | Grupo econômico, empresas legais, estabelecimentos, filiais, unidades, centros, projetos, canais | Crítica |
| Financeiro | Pagar/receber, liquidação parcial, estorno, rateio, bancos, conciliação, caixa e competência | Tesouraria completa, aplicações, empréstimos, CNAB, cobrança, aprovações, previsão, intercompany, multimoeda | Alta |
| Contabilidade | Plano de contas e centros de custo, mas sem razão contábil completo | Livro diário, razão, balancete, DRE, balanço, fechamento, consolidação, ECD/ECF | Crítica |
| Compras e suprimentos | Praticamente ausente como ciclo integrado | Requisição, cotação, mapa comparativo, alçada, pedido, recebimento, devolução, avaliação de fornecedor | Crítica |
| Vendas e faturamento | Orçamentos, pedidos, contratos, produtos e serviços | CRM, crédito, política comercial, preços, comissão, separação, entrega, devolução, faturamento e pós-venda | Alta |
| Estoque e custos | Movimentos, inventário, localizações, Kardex e relatórios | Lote, série, validade, reserva, disponível para promessa, custos fiscal/gerencial, WMS, picking e rastreabilidade | Alta |
| Fiscal | Boa estrutura inicial, mas SPED incompleto e documentos ainda não constituem suíte fiscal plenamente homologada | Motor tributário, apuração, livros, obrigações, eventos e atualizações legais contínuas | Crítica |
| RH/DP | Colaboradores, cargos, departamentos e folha digitada manualmente | Folha calculada, férias, 13º, rescisão, dissídio, benefícios, ponto, SST, eSocial, recrutamento e autosserviço | Crítica |
| Orçamento e aprovações | Recursos pontuais | Orçamento empresarial, compromissado, bloqueios, alçadas, segregação e substituições | Alta |
| Ativo fixo | Ausente | Aquisição, tombamento, localização, depreciação, CIAP, reavaliação, manutenção e baixa | Alta |
| Produção | Ausente e atualmente excluída da estratégia | BOM, MRP, PCP, ordens, APS, chão de fábrica/MES, qualidade e custos industriais | Total |
| Logística | Estoque e movimentação básica | WMS, TMS, OMS, YMS, roteirização, frete, frota, EDI, CT-e e comprovante de entrega | Total |
| Varejo | Venda administrativa, sem PDV completo | Caixa offline, NFC-e, TEF, Pix, promoções, fidelidade, self-checkout e omnichannel | Muito alta |
| CRM e atendimento | Cadastro e histórico comercial limitados | Leads, oportunidades, campanhas, atendimento, call center, contratos de serviço e pós-venda | Alta |
| Projetos e serviços | Contratos básicos | EAP, orçamento, recursos, timesheet, medições, margem, faturamento e field service | Alta |
| Workflow e documentos | Permissões e fluxos específicos | BPM, formulários, ECM, portais, assinatura e central de tarefas | Alta |
| Analytics e IA | Dashboards e relatórios definidos pelo produto | BI ad hoc, previsões, alertas, IA operacional e indicadores verticais | Média/alta |
| Integrações | HMAC, webhooks, três portas e `source_system`: ótima fundação | APIs amplas, iPaaS, conectores, lojas de extensões e ecossistema de parceiros | Média |
| Segurança e operação | RLS multi-tenant bem trabalhada e melhorias recentes relevantes | MFA, segregação, auditoria empresarial, SLO, DR, certificações e operação em escala | Alta |
| Verticais | Educacional como primeiro satélite | Doze segmentos maduros e décadas de regras específicas | Muito alta |

## Onde a TOTVS realmente abre distância

### Backoffice completo

A própria oferta básica do ERP Cloud da TOTVS começa com compras, estoque, faturamento e financeiro; ativo fixo, contabilidade e fiscal aparecem na camada seguinte. Isso mostra que compras e contabilidade são considerados requisitos básicos, não extensões. Consulte o [TOTVS ERP Cloud](https://www.totvs.com/erp-cloud/).

O NOVUS tem boa profundidade financeira em construção, mas ainda não possui o ciclo:

> requisição → cotação → aprovação → pedido de compra → recebimento → documento fiscal → título → pagamento → lançamento contábil.

Sem isso, não existe procure-to-pay completo.

### Contabilidade

O maior bloqueador horizontal é a falta do livro contábil imutável. O próprio backlog já reconhece isso no programa FIN-4 do [`PLANO_MESTRE.md`](./PLANO_MESTRE.md).

Todos os demais módulos devem produzir lançamentos balanceados no mesmo razão:

- venda e devolução;
- compra e recebimento;
- baixa e estorno;
- folha e encargos;
- depreciação;
- produção e consumo;
- impostos;
- transferências e variação cambial.

Plano de contas sem lançamentos débito/crédito não constitui contabilidade.

### Fiscal brasileiro

Esta é a frente mais urgente porque mudou de patamar em 2026. A Receita determinou destaque de CBS e IBS e publicou um cronograma que abrange NF-e, NFC-e, CT-e, MDF-e, NFS-e, documentos setoriais e novos eventos. Consulte o [cronograma oficial da reforma tributária](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-e-comite-gestor-do-ibs-publicam-o-cronograma-de-implementacao-dos-documentos-fiscais-eletronicos-da-reforma-tributaria-do-consumo) e as [orientações oficiais para 2026](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026).

Além da emissão, um ERP completo precisa manter:

- regras tributárias versionadas por vigência;
- ICMS, IPI, ISS, PIS/Cofins durante a transição;
- CBS, IBS e Imposto Seletivo;
- regimes, benefícios, créditos, retenções e substituição tributária;
- apuração e conciliação fiscal;
- EFD ICMS/IPI, EFD-Reinf, ECD, ECF e obrigações aplicáveis;
- eventos, cancelamentos, cartas de correção, inutilização e contingência;
- ambiente de homologação e regressão com cenários fiscais.

O NOVUS é honesto ao impedir SPED parcial, mas isso também evidencia que o módulo ainda não pode ser vendido como fiscal completo.

### RH

A TOTVS processa folha, férias, 13º, rescisões, dissídios e benefícios, integrada a financeiro e contabilidade; também oferece ponto, SST, admissão, recrutamento e eSocial. Consulte o [portfólio TOTVS RH](https://www.totvs.com/rh/) e a [Folha de Pagamento TOTVS](https://www.totvs.com/rh/folha-de-pagamento/).

No NOVUS, a folha ainda é entrada manual e o ponto não tem fonte operacional. Para prometer “tudo embarcado”, será necessário um verdadeiro motor de departamento pessoal, com regras versionadas por competência e convenção coletiva.

### Produção e manutenção

A TOTVS cobre estruturas de produtos, PCP/MRP, capacidade, APS, MES, manutenção preventiva/corretiva, inspeção e qualidade. Consulte o [TOTVS Manufatura](https://www.totvs.com/manufatura/totvs-manufatura/).

Até o SAP Business One, voltado a empresas menores, possui BOM, ordens de produção e MRP. Consulte os [módulos do SAP Business One](https://help.sap.com/docs/SAP_BUSINESS_ONE/68a2e87fb29941b5bf959a184d9c6727/4510027ecf465d7ae1ee7a972f920d5.html?locale=pt-BR).

Logo, produção leve precisa entrar no núcleo de paridade; MES e APS avançados podem vir depois.

### Varejo e omnichannel

A TOTVS oferece caixa offline, TEF, Pix, NFC-e, venda móvel, promoções, fidelidade, e-commerce, self-checkout e estoque integrado entre canais. Consulte o [TOTVS Varejo](https://www.totvs.com/varejo/) e o [TOTVS PDV Omni](https://produtos.totvs.com/ficha-tecnica/totvs-varejo-pdv-omni/).

Bling e Omie também já entregam PDV, marketplace, meios de pagamento e integração logística. O Bling declara mais de 250 integrações. Consulte o [Bling](https://www.bling.com.br/integracoes-bling) e o [Omie](https://www.omie.com.br/funcionalidades/).

Portanto, antes de enfrentar a TOTVS, o NOVUS ainda precisa fechar uma lacuna competitiva importante contra ERPs SMB.

### Workflow e gestão documental

O Fluig adiciona BPM, formulários, gestão documental, portais, central de tarefas e aprovações integradas ao ERP. Consulte o [TOTVS Fluig](https://www.totvs.com/fluig/).

No NOVUS, cada aprovação não deve virar lógica isolada dentro de uma tela. Será necessário um motor comum de:

- estados e transições;
- alçadas por valor e dimensão;
- aprovadores e substitutos;
- prazos e escalonamento;
- anexos e pareceres;
- segregação de funções;
- histórico imutável.

### Verticais

A amplitude da TOTVS inclui, entre outros:

- saúde: prontuário, leitos, centro cirúrgico, TISS, glosas e repasse médico — [TOTVS Saúde](https://www.totvs.com/saude/);
- construção: EAP, BIM, orçamento, cronograma, empreiteiros e medições — [TOTVS Construção](https://www.totvs.com/construcao/);
- logística: TMS, fretes, viagens, seguros, EDI, frota e documentos de transporte — [TOTVS TMS](https://www.totvs.com/logistica/tms/);
- hotelaria: PMS, reservas, governança, channel manager, POS e revenue management — [TOTVS Hotelaria](https://www.totvs.com/hotelaria/);
- jurídico: processos, tribunais, prazos, contratos, timesheet e passivo jurídico — [TOTVS Jurídico](https://www.totvs.com/juridico/).

“Ter tudo” significa eventualmente cobrir esses domínios, mas eles não devem contaminar o núcleo horizontal.

## Comparação com outros ERPs de referência

### SAP Business One

O SAP Business One reúne contabilidade e finanças, compras, estoque, vendas, CRM, relatórios, ativos, reconciliação bancária, produção leve e MRP. Sua vantagem é a integração transacional madura e o ecossistema de parceiros. Consulte a [visão geral](https://www.sap.com/brazil/products/erp/business-one.html) e os [recursos do SAP Business One](https://www.sap.com/brazil/products/erp/business-one/features.html).

O NOVUS ainda precisa de compras, contabilidade, ativos e produção para competir funcionalmente com ele.

### Sankhya

O Sankhya apresenta uma plataforma web/mobile com financeiro, fiscal, estoque, logística, RH, produção, BI, WMS, PDV, contabilidade e patrimônio. Consulte o [ERP Sankhya](https://www.sankhya.com.br/software-de-gestao-erp/erp-para-gestao-empresarial/produtos/sankhya/) e a [documentação dos módulos](https://ajuda.sankhya.com.br/hc/pt-br/articles/21238784689943-Atualiza%C3%A7%C3%A3o-do-sistema-Sankhya-Om-via-WPM).

É provavelmente a referência mais próxima para o objetivo “um único produto moderno e completo”, enquanto a TOTVS representa a referência máxima de amplitude de portfólio.

### Senior

A Senior tem força especialmente em gestão empresarial, indústria, logística, RH e mobilidade. O aplicativo ERP Senior X já reúne analytics de suprimentos, finanças e gestão industrial, além de requisições. Consulte o [ERP Senior](https://site.senior.com.br/erp/) e a [documentação do aplicativo Senior X](https://documentacao.senior.com.br/gestaoempresarialerp/7.0.0/app-erp-seniorx/app-erp-seniorx.htm).

### Omie e Bling

Omie e Bling são referências de simplicidade, implantação rápida, conectividade, PDV, pagamentos, fiscal e canais digitais. Não possuem a mesma profundidade empresarial da TOTVS, mas são concorrentes muito relevantes no mercado de pequenas e médias empresas.

O NOVUS pode superar esses produtos em profundidade financeira, arquitetura multi-tenant e integração com satélites, mas atualmente ainda fica atrás em fiscal pronto, PDV, meios de pagamento, marketplaces e ecossistema de conectores.

## Arquitetura necessária para um ERP universal

Antes de criar dezenas de módulos, é necessário consolidar dez fundações.

### 1. Estrutura organizacional universal

Grupo econômico, empresa legal, estabelecimento, unidade de negócio, centro de custo, projeto, canal e local operacional.

### 2. Razão contábil imutável

Partidas dobradas, períodos, fechamento, reversões, moedas, dimensões e regras automáticas de contabilização.

### 3. Motor tributário versionado

Regra, vigência, jurisdição, regime, classificação, memória de cálculo, fonte legal e conjunto de testes.

### 4. Cadeia documental comum

Requisição, cotação, pedido, contrato, recebimento, entrega, documento fiscal, título, liquidação e lançamento contábil, sempre com rastreabilidade entre origem e destino.

### 5. Workflow e políticas

Aprovações, orçamento, crédito, descontos, pagamentos, compras e exceções usando o mesmo mecanismo.

### 6. Inbox/outbox e eventos idempotentes

Evolução natural das três portas já existentes, com replay, fila de falhas, observabilidade e versionamento de contratos.

### 7. Documentos e assinatura

Repositório, versões, retenção, taxonomia, templates, assinatura e vínculos com qualquer objeto do ERP.

### 8. Extensibilidade segura

Campos adicionais, regras, relatórios, webhooks e aplicativos externos sem alterações diretas no banco nem linguagem proprietária.

### 9. Segurança empresarial

RBAC mais escopo organizacional, segregação de funções, MFA/step-up, trilhas completas, LGPD e gestão de acesso temporário.

### 10. Ativação progressiva

O produto é um só, mas a empresa simples vê dez operações; uma indústria pode habilitar centenas. Complexidade disponível não precisa ser complexidade exposta.

## Roadmap recomendado

Os prazos abaixo são direcionais e pressupõem pelo menos quatro squads funcionais, além de especialistas fiscal, contábil e trabalhista. Com uma única equipe pequena, isso deixa de ser um roadmap de três a cinco anos e passa facilmente de oito anos.

### Onda 0 — redefinição do produto

Antes de novas telas:

- alterar formalmente o posicionamento que hoje exclui manufatura;
- publicar uma matriz canônica de capacidades;
- definir o que pertence ao núcleo e o que é especialização;
- selecionar três segmentos iniciais para validação;
- estabelecer critérios objetivos de maturidade e homologação.

Segmentos iniciais recomendados:

1. serviços e comércio geral;
2. varejo;
3. educação, aproveitando o satélite existente.

Saúde, agro e indústria pesada não devem ser os primeiros porque combinam grande profundidade regulatória e operacional.

### Onda 1 — direito de se chamar ERP completo

Prioridade crítica:

- grupo, empresa e estabelecimento;
- razão contábil e contabilização automática;
- compras e suprimentos completos;
- ativo fixo;
- orçamento e alçadas;
- fechamento integral do FIN-1;
- fiscal homologado para NF-e, NFC-e e NFS-e;
- CBS/IBS e memória de cálculo;
- SPED, ECD e ECF conforme aplicabilidade;
- segurança operacional, backup, restauração, SLO e MFA;
- E2E de order-to-cash, procure-to-pay e record-to-report.

**Critério de saída:** uma empresa comercial deve conseguir comprar, receber, vender, faturar, pagar, receber, contabilizar, fechar e cumprir as obrigações sem planilha paralela.

### Onda 2 — paridade forte no mercado médio

- tesouraria, CNAB, Pix, boleto e Open Finance;
- crédito, cobrança e inadimplência;
- intercompany, consolidação e multifilial;
- folha, férias, rescisão, 13º, benefícios e eSocial;
- ponto integrado e portal do colaborador;
- PDV online/offline, TEF e fechamento de caixa;
- CRM, oportunidades, comissões e pós-venda;
- e-commerce, marketplaces e logística de pedidos;
- BPM, documentos e assinatura;
- BI self-service e relatórios assíncronos;
- aplicativos móveis para operação e aprovação.

**Critério de saída:** competir de forma séria com Sankhya, SAP Business One, Omie avançado e o núcleo do Protheus.

### Onda 3 — cadeia operacional

- WMS: endereço, lote, série, validade, picking, packing e inventário rotativo;
- TMS e gestão de frete;
- produção leve: BOM, MRP, ordens, consumo, apontamento e custos;
- qualidade e inspeção;
- manutenção e gestão de ativos;
- projetos, timesheet, medições e serviços de campo;
- comércio exterior;
- previsão de demanda e planejamento de suprimentos.

**Critério de saída:** atender distribuição, indústria leve, manutenção, serviços técnicos e operações multicanal.

### Onda 4 — profundidade vertical

Construir especializações sobre o núcleo, uma por vez:

- construção e incorporação;
- agro;
- saúde;
- hotelaria;
- jurídico;
- logística pesada;
- indústria avançada com APS/MES;
- demais verticais.

Cada vertical precisa de equipe de domínio, clientes cocriadores e homologação própria. Não é seguro construir prontuário, folha, fiscal, agro ou chão de fábrica apenas por analogia técnica.

## Como o NOVUS pode superar a TOTVS

Copiar toda a TOTVS produziria uma TOTVS menor e atrasada. A vantagem deve vir de pontos onde uma plataforma nova pode ser estruturalmente melhor.

### 1. Um único modelo canônico

A fragmentação em diversas linhas é uma consequência histórica do portfólio TOTVS. O NOVUS pode ter um único modelo de empresa, entidade, produto, evento financeiro, documento fiscal e lançamento contábil.

### 2. Configuração sem projeto interminável

- onboarding orientado;
- planos de contas e políticas sugeridos;
- simulador antes da ativação;
- importação validada;
- diagnóstico automático de inconsistências;
- ambientes de homologação reproduzíveis.

### 3. Fiscal explicável

Todo imposto deveria responder:

- qual regra foi aplicada;
- qual vigência;
- qual base;
- qual classificação;
- qual fundamento;
- como reproduzir o cálculo.

Isso seria um diferencial real diante de ERPs em que a regra fiscal vira parametrização opaca.

### 4. API e eventos como produto

As três portas e o `source_system` são uma das melhores decisões atuais do NOVUS. Elas devem evoluir para um catálogo completo de eventos, SDK, sandbox, replay e marketplace de conectores.

### 5. IA com controle humano

IA útil, não decorativa:

- conciliação sugerida;
- detecção de duplicidade e fraude;
- classificação contábil;
- previsão de caixa e demanda;
- leitura de documentos;
- explicação de rejeições fiscais;
- criação assistida de workflows;
- alertas de desvios.

Nenhuma IA deve calcular folha, imposto, contabilização ou pagamento sem regra determinística, memória de cálculo e aprovação.

### 6. UX por tarefa, não por módulo

O usuário não deveria precisar conhecer a árvore do ERP. O produto pode apresentar jornadas:

- “comprar material”;
- “fechar o mês”;
- “receber do cliente”;
- “admitir colaborador”;
- “resolver rejeição fiscal”.

### 7. Dados portáveis e extensibilidade moderna

APIs abertas, exportação integral, webhooks confiáveis, esquema documentado e extensões isoladas. Isso reduz dependência de consultoria e customizações frágeis.

## Decisão recomendada

A visão de “um NOVUS com tudo disponível” é viável como direção de portfólio, mas não como “todos os módulos construídos simultaneamente e visíveis para todos”.

A ordem correta é:

1. núcleo contábil, fiscal, organizacional e de suprimentos;
2. paridade SMB/midmarket;
3. produção, logística, varejo e serviços;
4. profundidade vertical;
5. diferenciação por experiência, integração, explicabilidade e IA.

A próxima ação concreta deve ser substituir o backlog predominantemente financeiro atual por um **Mapa Mestre de Capacidades do ERP**, mantendo os itens existentes, mas reorganizando-os pelos ciclos completos de negócio e incluindo compras, contabilidade, fiscal, RH, produção, logística, varejo e verticais.

Nenhum novo grande módulo deveria começar antes dessa redefinição, porque a nova ambição muda a arquitetura e a sequência do produto.

## Fontes principais

### NOVUS

- [`PLANO_MESTRE.md`](./PLANO_MESTRE.md)
- [`STATUS.md`](./STATUS.md)
- [`src/App.tsx`](../src/App.tsx)

### TOTVS

- [TOTVS Backoffice — Linha Protheus](https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-backoffice-linha-protheus/)
- [TOTVS ERP Cloud](https://www.totvs.com/erp-cloud/)
- [TOTVS Gestão](https://www.totvs.com/gestao/)
- [TOTVS RH](https://www.totvs.com/rh/)
- [TOTVS Fluig](https://www.totvs.com/fluig/)
- [TOTVS Manufatura](https://www.totvs.com/manufatura/totvs-manufatura/)
- [TOTVS Varejo](https://www.totvs.com/varejo/)
- [TOTVS Distribuição](https://www.totvs.com/distribuicao/totvs-distribuicao-e-varejo/)
- [TOTVS Logística TMS](https://www.totvs.com/logistica/tms/)
- [TOTVS Saúde](https://www.totvs.com/saude/)
- [TOTVS Construção](https://www.totvs.com/construcao/)
- [TOTVS Hotelaria](https://www.totvs.com/hotelaria/)
- [TOTVS Jurídico](https://www.totvs.com/juridico/)

### Outros ERPs

- [SAP Business One](https://www.sap.com/brazil/products/erp/business-one.html)
- [Recursos do SAP Business One](https://www.sap.com/brazil/products/erp/business-one/features.html)
- [ERP Sankhya](https://www.sankhya.com.br/software-de-gestao-erp/erp-para-gestao-empresarial/produtos/sankhya/)
- [ERP Senior](https://site.senior.com.br/erp/)
- [Omie](https://www.omie.com.br/funcionalidades/)
- [Bling](https://www.bling.com.br/integracoes-bling)

### Fontes regulatórias

- [Cronograma dos documentos fiscais eletrônicos da Reforma Tributária](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-e-comite-gestor-do-ibs-publicam-o-cronograma-de-implementacao-dos-documentos-fiscais-eletronicos-da-reforma-tributaria-do-consumo)
- [Orientações da Reforma Tributária para 2026](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026)
- [Legislação da Reforma Tributária do Consumo](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/legislacao/legislacao-da-reforma-tributaria-do-consumo)
- [Perguntas frequentes da ECD](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/ecd/ecd/)
- [Documentação técnica do eSocial](https://www.gov.br/esocial/pt-br/documentacao-tecnica)
