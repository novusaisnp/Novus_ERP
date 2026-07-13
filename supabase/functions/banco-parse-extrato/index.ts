// P15.2 — Parser de extrato bancário (OFX / CSV)
// Recebe multipart/form-data com: file, conta_bancaria_id
// Faz parse, deduplica por hash_arquivo, persiste header + linhas.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LINES = 10_000;
const ALLOWED_MIME = new Set([
  "application/x-ofx",
  "application/ofx",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/octet-stream",
]);

interface ParsedLine {
  fit_id: string | null;
  data_movimento: string; // YYYY-MM-DD
  valor: number;
  descricao: string;
  historico: string | null;
  tipo: string;
  documento: string | null;
}

interface ParsedExtrato {
  formato: "OFX" | "CSV";
  data_inicial: string | null;
  data_final: string | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  lines: ParsedLine[];
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- OFX ----------
function parseOfxDate(s: string): string | null {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function stripSgml(tag: string, block: string): string | null {
  const re = new RegExp(`<${tag}>([^<\r\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function parseOFX(content: string): ParsedExtrato {
  // Suporta OFX 1.x SGML e 2.x XML (com tags <TAG>valor</TAG> ou <TAG>valor)
  const normalized = content.replace(/\r\n/g, "\n");
  const trnBlocks = [...normalized.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  const bareTrn = normalized.match(/<STMTTRN>/gi);
  const useBare = trnBlocks.length === 0 && (bareTrn?.length ?? 0) > 0;

  const rawBlocks: string[] = [];
  if (useBare) {
    const parts = normalized.split(/<STMTTRN>/i).slice(1);
    for (const p of parts) {
      const end = p.search(/<STMTTRN>|<\/BANKTRANLIST>|<\/OFX>/i);
      rawBlocks.push(end === -1 ? p : p.substring(0, end));
    }
  } else {
    for (const m of trnBlocks) rawBlocks.push(m[1]);
  }

  const lines: ParsedLine[] = [];
  for (const b of rawBlocks) {
    const dtposted = stripSgml("DTPOSTED", b);
    const trnamt = stripSgml("TRNAMT", b);
    const fitid = stripSgml("FITID", b);
    const memo = stripSgml("MEMO", b) ?? stripSgml("NAME", b) ?? "";
    const trntype = stripSgml("TRNTYPE", b) ?? "OTHER";
    const checknum = stripSgml("CHECKNUM", b);
    if (!dtposted || !trnamt) continue;
    const dt = parseOfxDate(dtposted);
    if (!dt) continue;
    const valor = parseFloat(trnamt);
    if (Number.isNaN(valor)) continue;
    lines.push({
      fit_id: fitid,
      data_movimento: dt,
      valor,
      descricao: (memo || trntype).slice(0, 500),
      historico: memo || null,
      tipo: trntype,
      documento: checknum,
    });
  }

  const dtstart = stripSgml("DTSTART", normalized);
  const dtend = stripSgml("DTEND", normalized);
  const balamt = stripSgml("BALAMT", normalized);
  return {
    formato: "OFX",
    data_inicial: dtstart ? parseOfxDate(dtstart) : null,
    data_final: dtend ? parseOfxDate(dtend) : null,
    saldo_inicial: null,
    saldo_final: balamt ? parseFloat(balamt) : null,
    lines,
  };
}

// ---------- CSV ----------
// Formato esperado: data;valor;descricao[;documento]
// Datas: DD/MM/YYYY ou YYYY-MM-DD. Valores: 1.234,56 ou 1234.56
function parseBrDate(s: string): string | null {
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function parseBrNumber(s: string): number {
  s = s.trim().replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  return parseFloat(s);
}

function splitCsvLine(l: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === sep && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseCSV(content: string): ParsedExtrato {
  const lines: ParsedLine[] = [];
  const rows = content.replace(/\r\n/g, "\n").split("\n").filter((r) => r.trim().length > 0);
  const first = rows[0] ?? "";
  const sep = first.includes(";") ? ";" : ",";
  const start = /^\s*(data|date)/i.test(first) ? 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const cols = splitCsvLine(rows[i], sep);
    if (cols.length < 3) continue;
    const dt = parseBrDate(cols[0]);
    const val = parseBrNumber(cols[1]);
    if (!dt || Number.isNaN(val)) continue;
    lines.push({
      fit_id: null,
      data_movimento: dt,
      valor: val,
      descricao: (cols[2] ?? "").trim().slice(0, 500) || "SEM DESCRICAO",
      historico: null,
      tipo: val < 0 ? "DEBIT" : "CREDIT",
      documento: cols[3]?.trim() || null,
    });
  }

  const datas = lines.map((l) => l.data_movimento).sort();
  return {
    formato: "CSV",
    data_inicial: datas[0] ?? null,
    data_final: datas[datas.length - 1] ?? null,
    saldo_inicial: null,
    saldo_final: null,
    lines,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const contaId = form.get("conta_bancaria_id");
    if (!(file instanceof File) || typeof contaId !== "string") {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "file_too_large", max: MAX_FILE_SIZE }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      // best-effort — muitos navegadores enviam mimes inesperados
    }

    // Descobre empresa do usuário e valida conta
    const { data: conta, error: contaErr } = await client
      .from("contas_bancarias")
      .select("id, empresa_representada_id")
      .eq("id", contaId)
      .maybeSingle();
    if (contaErr || !conta) {
      return new Response(JSON.stringify({ error: "conta_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await file.arrayBuffer();
    const hash = await sha256Hex(buf);
    const content = new TextDecoder("utf-8", { fatal: false }).decode(buf);

    const looksOfx = /<OFX|<STMTTRN>/i.test(content);
    const parsed = looksOfx ? parseOFX(content) : parseCSV(content);

    if (parsed.lines.length === 0) {
      return new Response(JSON.stringify({ error: "no_transactions_found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed.lines.length > MAX_LINES) {
      return new Response(JSON.stringify({ error: "too_many_lines", max: MAX_LINES }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência: se hash já existe → retornar o extrato existente
    const { data: existing } = await client
      .from("banco_extratos_importados")
      .select("id")
      .eq("hash_arquivo", hash)
      .eq("conta_bancaria_id", contaId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, extrato_id: existing.id, replay: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const storagePath = `${conta.empresa_representada_id}/${hash}-${file.name.slice(0, 80)}`;
    const { error: upErr } = await client.storage
      .from("banco-extratos")
      .upload(storagePath, new Blob([buf], { type: file.type || "application/octet-stream" }), {
        upsert: true,
      });
    if (upErr) {
      console.error("storage_upload_error", upErr);
    }

    // Header
    const { data: header, error: hdrErr } = await client
      .from("banco_extratos_importados")
      .insert({
        empresa_representada_id: conta.empresa_representada_id,
        conta_bancaria_id: contaId,
        nome_arquivo: file.name,
        hash_arquivo: hash,
        formato: parsed.formato,
        data_inicial: parsed.data_inicial,
        data_final: parsed.data_final,
        saldo_inicial: parsed.saldo_inicial,
        saldo_final: parsed.saldo_final,
        status: "IMPORTADO",
        total_lancamentos: parsed.lines.length,
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (hdrErr || !header) {
      return new Response(JSON.stringify({ error: "header_insert_failed", detail: hdrErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk insert das linhas (chunks de 500)
    const rows = parsed.lines.map((l) => ({
      empresa_representada_id: conta.empresa_representada_id,
      extrato_importado_id: header.id,
      conta_bancaria_id: contaId,
      fit_id: l.fit_id,
      data_movimento: l.data_movimento,
      valor: l.valor,
      descricao: l.descricao,
      historico: l.historico,
      tipo: l.tipo,
      documento: l.documento,
      status_conciliacao: "PENDENTE",
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error: linErr } = await client.from("banco_movimentacoes_extrato").insert(chunk);
      if (linErr) {
        await client
          .from("banco_extratos_importados")
          .update({ status: "ERRO", erro_mensagem: linErr.message })
          .eq("id", header.id);
        return new Response(JSON.stringify({ error: "lines_insert_failed", detail: linErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Dispara matching automático
    const { data: matchResult, error: matchErr } = await client.rpc("sugerir_matches_extrato", {
      p_extrato_id: header.id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        extrato_id: header.id,
        total_linhas: parsed.lines.length,
        match: matchErr ? { error: matchErr.message } : matchResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("banco-parse-extrato error", e);
    return new Response(JSON.stringify({ error: "internal", detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
