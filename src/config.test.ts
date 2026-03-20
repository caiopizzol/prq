import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";

const tmpDir = path.join(import.meta.dir, "../.test-tmp");
const globalConfigDir = path.join(tmpDir, ".config", "prq");
const globalConfigPath = path.join(globalConfigDir, "config.json");
const localConfigPath = path.join(tmpDir, ".prqrc.json");

const origHome = process.env.HOME;
const origCwd = process.cwd();

beforeEach(() => {
	fs.mkdirSync(globalConfigDir, { recursive: true });
	process.env.HOME = tmpDir;
	process.chdir(tmpDir);
});

afterEach(() => {
	process.env.HOME = origHome;
	process.chdir(origCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("loadConfig", () => {
	test("returns defaults when no config files exist", () => {
		const config = loadConfig({});
		expect(config.repos).toEqual([]);
		expect(config.staleDays).toBe(3);
		expect(config.user).toBeUndefined();
	});

	test("loads global config", () => {
		fs.writeFileSync(
			globalConfigPath,
			JSON.stringify({ repos: ["org/repo"], staleDays: 7 }),
		);

		const config = loadConfig({});
		expect(config.repos).toEqual(["org/repo"]);
		expect(config.staleDays).toBe(7);
	});

	test("local .prqrc.json overrides global config", () => {
		fs.writeFileSync(
			globalConfigPath,
			JSON.stringify({ repos: ["org/global"], staleDays: 7 }),
		);
		fs.writeFileSync(localConfigPath, JSON.stringify({ repos: ["org/local"] }));

		const config = loadConfig({});
		expect(config.repos).toEqual(["org/local"]);
		expect(config.staleDays).toBe(7); // kept from global
	});

	test("CLI overrides take highest priority", () => {
		fs.writeFileSync(
			globalConfigPath,
			JSON.stringify({ repos: ["org/global"], staleDays: 7 }),
		);
		fs.writeFileSync(
			localConfigPath,
			JSON.stringify({ repos: ["org/local"], staleDays: 5 }),
		);

		const config = loadConfig({ repos: ["org/cli"], staleDays: 1 });
		expect(config.repos).toEqual(["org/cli"]);
		expect(config.staleDays).toBe(1);
	});

	test("rejects invalid staleDays type", () => {
		fs.writeFileSync(
			globalConfigPath,
			JSON.stringify({ staleDays: "not-a-number" }),
		);

		expect(() => loadConfig({})).toThrow();
	});

	test("rejects invalid repos type", () => {
		fs.writeFileSync(
			globalConfigPath,
			JSON.stringify({ repos: "not-an-array" }),
		);

		expect(() => loadConfig({})).toThrow();
	});

	test("handles malformed JSON in config file", () => {
		fs.writeFileSync(globalConfigPath, "{ broken json }}}");

		expect(() => loadConfig({})).toThrow();
	});

	test("ignores undefined CLI overrides", () => {
		fs.writeFileSync(
			globalConfigPath,
			JSON.stringify({ repos: ["org/repo"], staleDays: 5 }),
		);

		const config = loadConfig({ repos: undefined, staleDays: undefined });
		expect(config.repos).toEqual(["org/repo"]);
		expect(config.staleDays).toBe(5);
	});
});
