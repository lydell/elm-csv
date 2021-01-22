"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mixed_1 = require("../helpers/mixed");
const parse_1 = require("../helpers/parse");
function validate(cwd, env, logger) {
    const parseResult = parse_1.findReadAndParseElmToolingJson(cwd, env);
    switch (parseResult.tag) {
        case "ElmToolingJsonNotFound":
            logger.error(parseResult.message);
            return 1;
        case "ReadAsJsonObjectError":
            logger.error(mixed_1.bold(parseResult.elmToolingJsonPath));
            logger.error(parseResult.message);
            return 1;
        case "Parsed": {
            const entrypointsErrors = parseResult.entrypoints === undefined
                ? []
                : getEntrypointsErrors(parseResult.entrypoints);
            const toolsErrors = parseResult.tools === undefined
                ? { tag: "Error", errors: [] }
                : getToolsErrors(parseResult.tools);
            const validationErrors = [
                ...parseResult.unknownFields.map((field) => ({
                    path: [field],
                    message: `Unknown field\nKnown fields: ${mixed_1.KNOWN_FIELDS.join(", ")}`,
                })),
                ...entrypointsErrors,
                ...toolsErrors.errors,
            ];
            if (validationErrors.length === 0) {
                logger.log(mixed_1.bold(parseResult.elmToolingJsonPath));
                logger.log("No errors found.");
                return 0;
            }
            else {
                logger.error(mixed_1.bold(parseResult.elmToolingJsonPath));
                logger.error("");
                logger.error(parse_1.printFieldErrors(validationErrors));
                if (toolsErrors.tag === "Missing" && toolsErrors.errors.length > 0) {
                    logger.error("");
                    logger.error(missingToolsText);
                }
                logger.error("");
                logger.error(mixed_1.elmToolingJsonDocumentationLink);
                return 1;
            }
        }
    }
}
exports.default = validate;
const missingToolsText = `
${mixed_1.dim("To download missing tools:")}
${mixed_1.indent("elm-tooling install")}
`.trim();
function getEntrypointsErrors(fieldResult) {
    switch (fieldResult.tag) {
        case "Error":
            return fieldResult.errors;
        case "Parsed":
            return [];
    }
}
function getToolsErrors(fieldResult) {
    switch (fieldResult.tag) {
        case "Error":
            return { tag: "Error", errors: fieldResult.errors };
        case "Parsed":
            return {
                tag: "Missing",
                errors: fieldResult.parsed.missing.map((tool) => ({
                    path: ["tools", tool.name],
                    message: `File does not exist: ${tool.absolutePath}`,
                })),
            };
    }
}
