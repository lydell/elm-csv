#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const help_1 = require("./commands/help");
const init_1 = require("./commands/init");
const install_1 = require("./commands/install");
const tools_1 = require("./commands/tools");
const validate_1 = require("./commands/validate");
const logger_1 = require("./helpers/logger");
async function elmToolingCli(args, 
// istanbul ignore next
{ cwd = process.cwd(), env = process.env, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr, } = {}) {
    const logger = logger_1.makeLogger({ env, stdout, stderr });
    const isHelp = args.some((arg) => arg === "-h" || arg === "-help" || arg === "--help");
    if (isHelp) {
        logger.log(help_1.default(cwd, env));
        return 0;
    }
    // So far no command takes any further arguments.
    // Let each command handle this when needed.
    if (args.length > 1) {
        logger.error(`Expected a single argument but got: ${args.slice(1).join(" ")}`);
        return 1;
    }
    switch (args[0]) {
        case undefined:
        case "help":
            logger.log(help_1.default(cwd, env));
            return 0;
        case "init":
            return init_1.default(cwd, env, logger);
        case "validate":
            return validate_1.default(cwd, env, logger);
        case "install":
            return install_1.default(cwd, env, logger);
        case "tools":
            return tools_1.default(cwd, env, logger, stdin, stdout);
        default:
            logger.error(`Unknown command: ${args[0]}`);
            return 1;
    }
}
module.exports = elmToolingCli;
// istanbul ignore if
if (require.main === module) {
    elmToolingCli(process.argv.slice(2)).then((exitCode) => {
        process.exit(exitCode);
    }, (error) => {
        var _a;
        process.stderr.write(`Unexpected error:\n${(_a = error.stack) !== null && _a !== void 0 ? _a : error.message}\n`);
        process.exit(1);
    });
}
