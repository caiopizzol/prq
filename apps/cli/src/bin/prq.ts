#!/usr/bin/env node
import { createCLI } from "../cli.js";

const program = createCLI();
program.parseAsync(process.argv).catch((err) => {
	console.error(err.message);
	process.exit(1);
});
