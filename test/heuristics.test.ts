import test from "node:test";
import assert from "node:assert/strict";
import { registerHeuristicsTools } from "../src/slices/heuristics/index.js";

function captureTool(): { name: string; execute: (id: string, params: any) => Promise<any> } {
	let captured: { name: string; execute: (id: string, params: any) => Promise<any> } | undefined;
	const pi = {
		registerTool: (def: { name: string; execute: (id: string, params: any) => Promise<any> }) => {
			captured = def;
		},
	} as never;
	registerHeuristicsTools(pi, {} as never);
	assert.ok(captured, "heuristics tool must be registered");
	return captured!;
}

const BAD_CODE = 'UseLSX "*lsxlib"\n%REM\nheader\n%END REM\nSub Init\nlsp_status = "ok"\nlsp_status = "ok"\nEnd Sub';
const GOOD_CODE = '%REM\nheader\n%END REM\n\nUseLSX "*lsxlib"\nSub Init\nlsp_status = "ok"\nlsp_status = "done"\nEnd Sub';

test("LS-0xd001: UseLSX before %REM header is flagged", async () => {
	const tool = captureTool();
	const r = await tool.execute("t1", { code: BAD_CODE });
	assert.match(r.content[0].text, /LS-0xd001 %REM header/);
});

test("LS-0xd001: lsp_status duplicate string is flagged", async () => {
	const tool = captureTool();
	const r = await tool.execute("t2", { code: BAD_CODE });
	assert.match(r.content[0].text, /lsp_status dup-string/);
});

test("correctly ordered header + unique status is clean", async () => {
	const tool = captureTool();
	const r = await tool.execute("t3", { code: GOOD_CODE });
	assert.match(r.content[0].text, /No issues detected/);
});

test("SPAI-008: error-code help pages render for all six codes", async () => {
	const tool = captureTool();
	for (const code of ["d001", "d00a", "d019", "d01a", "d028", "d06c"]) {
		const r = await tool.execute("t4", { code: "", errorCode: code });
		assert.match(r.content[0].text, new RegExp(`LS-0x${code}`, "i"), `help page for ${code}`);
		assert.match(r.content[0].text, /IBM message template/);
	}
});
