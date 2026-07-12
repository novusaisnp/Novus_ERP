import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

export interface ReportScheduledDeliveryProps {
  scheduleName: string;
  scope: "vendas" | "financeiro";
  format: "csv" | "xlsx" | "pdf";
  signedUrl: string;
  expiresAt: string;
  runId: string;
  companyName?: string;
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
};
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const heading = { color: "#0f172a", fontSize: "20px", fontWeight: 700, margin: "0 0 16px" };
const paragraph = { color: "#334155", fontSize: "14px", lineHeight: "22px", margin: "0 0 12px" };
const label = { color: "#64748b", fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.06em" };
const value = { color: "#0f172a", fontSize: "14px", fontWeight: 600, margin: "0 0 12px" };
const button = {
  backgroundColor: "#1e293b",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
  fontWeight: 600,
  fontSize: "14px",
};
const footer = { color: "#94a3b8", fontSize: "11px", margin: "16px 0 0" };
const hr = { borderColor: "#e2e8f0", margin: "24px 0" };

const scopeLabel: Record<ReportScheduledDeliveryProps["scope"], string> = {
  vendas: "Vendas",
  financeiro: "Financeiro",
};

const Email = ({
  scheduleName,
  scope,
  format,
  signedUrl,
  expiresAt,
  runId,
  companyName,
}: ReportScheduledDeliveryProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu relatório agendado está pronto para download</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Relatório pronto</Heading>
        <Text style={paragraph}>
          {companyName ? `${companyName} — seu ` : "Seu "}
          relatório agendado <strong>{scheduleName}</strong> foi gerado e está disponível para download.
        </Text>

        <Section>
          <Text style={label}>Escopo</Text>
          <Text style={value}>{scopeLabel[scope]}</Text>
          <Text style={label}>Formato</Text>
          <Text style={value}>{format.toUpperCase()}</Text>
          <Text style={label}>Link expira em</Text>
          <Text style={value}>{expiresAt}</Text>
        </Section>

        <Section style={{ margin: "20px 0" }}>
          <Button href={signedUrl} style={button}>
            Baixar relatório
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Este link é temporário e restrito ao destinatário. Run ID: {runId}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email,
  subject: "Seu relatório agendado está pronto",
  displayName: "Report Scheduled Delivery",
  previewData: {
    scheduleName: "Vendas — Semanal",
    scope: "vendas",
    format: "xlsx",
    signedUrl: "https://example.com/signed",
    expiresAt: "2026-07-19 09:00 UTC",
    runId: "run_00000000-0000-0000-0000-000000000000",
    companyName: "Empresa Exemplo",
  },
};
