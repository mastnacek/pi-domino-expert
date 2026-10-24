/**
 * Export slice for @pi-domino-expert/pi-domino-expert.
 *
 * Export conversation/analysis output to DOCX/PDF/TXT with environment
 * front matter derived from the project context (SPAI-008 deliverable lane).
 *
 * Model-facing text stays English. Format generation is text-based: DOCX and
 * PDF payloads are produced without third-party dependencies (DOCX as
 * flattened WordprocessingML, PDF as a minimal single-page text PDF).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { PluginState } from "../../shared/state.js";

const FormatSchema = StringEnum(["docx", "pdf", "txt"] as const);

function escapeXml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapePdfText(s: string): string {
	return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLines(text: string, width: number): string[] {
	const out: string[] = [];
	for (const raw of text.split(/\r?\n/)) {
		if (raw.length <= width) { out.push(raw); continue; }
		let line = raw;
		while (line.length > width) {
			let cut = line.lastIndexOf(" ", width);
			if (cut <= 0) cut = width;
			out.push(line.slice(0, cut));
			line = line.slice(cut).trimStart();
		}
		if (line.length > 0) out.push(line);
	}
	return out;
}

function frontMatter(state: PluginState, title: string): string {
	const p = state.project;
	return [
		title,
		`Domino: ${p.dominoVersion} | OS: ${p.os} | Topology: ${p.topology}`,
		`Native oracle lane: ${p.nativeOracleLaneDisabled ? "disabled (SPAI-007)" : "ENABLED (dangerous)"}`,
		`Generated: ${new Date().toISOString()}`,
		"".padEnd(60, "-"),
	].join("\n");
}

function buildDocx(title: string, body: string): string {
	const paragraphs = [...wrapLines(body, 90)]
		.map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
<w:body>
<w:p><w:r><w:b/><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>
${paragraphs}
</w:body>
</w:wordDocument>`;
}

function buildPdf(body: string): string {
	const lines = wrapLines(body, 90);
	const contentOps = lines
		.map((line, i) => `BT /F1 10 Tf 40 ${760 - i * 12} Td (${escapePdfText(line)}) Tj ET`)
		.join("\n");
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
		`<< /Length ${contentOps.length} >>\nstream\n${contentOps}\nendstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
	];
	let pdf = "%PDF-1.4\n";
	const offsets: number[] = [];
	objects.forEach((obj, i) => {
		offsets.push(pdf.length);
		pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
	});
	const xrefOffset = pdf.length;
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
	return pdf;
}

export function registerExportTools(pi: ExtensionAPI, getState: () => PluginState): void {
	pi.registerTool({
		name: "pi_domino_expert_export_report",
		label: "Domino Expert tool",
		description:
			"Export analysis/report text to DOCX (WordprocessingML), PDF (minimal text PDF) or TXT, prepending the active project context (Domino version, OS, topology, SPAI-007 lane state) as front matter. Returns the document content; the caller writes it to a file.",
		parameters: Type.Object({
			format: FormatSchema,
			title: Type.Optional(Type.String({ description: "Document title (default: Notes/Domino Expert Report)" })),
			body: Type.String({ description: "Report body text to embed" }),
		}),
		async execute(_toolCallId, params) {
			const state = getState();
			const title = params.title ?? "Notes/Domino Expert Report";
			const full = `${frontMatter(state, title)}\n\n${params.body}`;

			const details: { format: string; suggestedExtension?: string; note?: string } =
				params.format === "txt"
					? { format: "txt" }
					: params.format === "docx"
					? { format: "docx", suggestedExtension: ".xml", note: "WordprocessingML — save as .xml or convert; opens in Word." }
					: { format: "pdf", suggestedExtension: ".pdf" };
			const text = params.format === "txt"
				? full
				: params.format === "docx"
				? buildDocx(title, full)
				: buildPdf(full);
			return { content: [{ type: "text", text }], details };
		},
	});
}
