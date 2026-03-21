import { describe, expect, test } from "bun:test";
import { Command } from "commander";

// Test the CLI flag configuration in isolation to avoid
// Commander parsing process.argv during module import
describe("interactive flag", () => {
	function createStatusCommand() {
		const cmd = new Command("status").option(
			"--no-interactive",
			"Disable interactive mode",
		);
		return cmd;
	}

	test("interactive defaults to true", () => {
		const cmd = createStatusCommand();
		cmd.parse([], { from: "user" });
		expect(cmd.opts().interactive).toBe(true);
	});

	test("--no-interactive sets interactive to false", () => {
		const cmd = createStatusCommand();
		cmd.parse(["--no-interactive"], { from: "user" });
		expect(cmd.opts().interactive).toBe(false);
	});
});
