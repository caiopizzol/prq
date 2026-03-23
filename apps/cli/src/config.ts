import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
	repos: z.array(z.string()).default([]),
	staleDays: z.number().default(3),
	showAllOpen: z.boolean().default(false),
	user: z.string().optional(),
	actions: z.record(z.string()).default({}),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(cliOverrides: Partial<Config>): Config {
	const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
	const globalPath = path.join(home, ".config", "prq", "config.json");
	const localPath = path.join(process.cwd(), ".prqrc.json");

	let config: Record<string, unknown> = {};

	if (fs.existsSync(globalPath)) {
		config = JSON.parse(fs.readFileSync(globalPath, "utf8"));
	}
	if (fs.existsSync(localPath)) {
		config = { ...config, ...JSON.parse(fs.readFileSync(localPath, "utf8")) };
	}

	for (const [key, value] of Object.entries(cliOverrides)) {
		if (value !== undefined) {
			config[key] = value;
		}
	}

	return configSchema.parse(config);
}
