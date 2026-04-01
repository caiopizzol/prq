import { describe, expect, test } from "bun:test";
import { parseIdentifier } from "./identifier.js";

describe("parseIdentifier", () => {
	test("parses full GitHub PR URL", () => {
		const result = parseIdentifier(
			"https://github.com/superdoc-dev/superdoc/pull/2352",
		);
		expect(result).toEqual({
			kind: "url",
			owner: "superdoc-dev",
			repo: "superdoc",
			number: 2352,
			type: "pr",
		});
	});

	test("parses URL with trailing path segments", () => {
		const result = parseIdentifier(
			"https://github.com/org/repo/pull/123/files",
		);
		expect(result).toEqual({
			kind: "url",
			owner: "org",
			repo: "repo",
			number: 123,
			type: "pr",
		});
	});

	test("parses GitHub issue URL", () => {
		const result = parseIdentifier("https://github.com/org/repo/issues/456");
		expect(result).toEqual({
			kind: "url",
			owner: "org",
			repo: "repo",
			number: 456,
			type: "issue",
		});
	});

	test("parses repo#number format", () => {
		const result = parseIdentifier("superdoc-dev/superdoc#2352");
		expect(result).toEqual({
			kind: "repo-number",
			owner: "superdoc-dev",
			repo: "superdoc",
			number: 2352,
		});
	});

	test("parses simple repo#number", () => {
		const result = parseIdentifier("org/repo#42");
		expect(result).toEqual({
			kind: "repo-number",
			owner: "org",
			repo: "repo",
			number: 42,
		});
	});

	test("parses number-only", () => {
		const result = parseIdentifier("482");
		expect(result).toEqual({ kind: "number-only", number: 482 });
	});

	test("parses single digit", () => {
		const result = parseIdentifier("1");
		expect(result).toEqual({ kind: "number-only", number: 1 });
	});

	test("throws on invalid input", () => {
		expect(() => parseIdentifier("not-a-pr")).toThrow("Invalid identifier");
	});

	test("throws on empty string", () => {
		expect(() => parseIdentifier("")).toThrow("Invalid identifier");
	});

	test("throws on repo without number", () => {
		expect(() => parseIdentifier("org/repo")).toThrow("Invalid identifier");
	});
});
