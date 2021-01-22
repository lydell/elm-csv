"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const readline = require("readline");
const known_tools_1 = require("../helpers/known-tools");
const mixed_1 = require("../helpers/mixed");
const parse_1 = require("../helpers/parse");
async function toolsCommand(cwd, env, logger, stdin, stdout) {
    var _a;
    if (!stdin.isTTY) {
        logger.error("This command requires stdin to be a TTY.");
        return 1;
    }
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
            const save = (tools) => {
                updateElmToolingJson(parseResult.elmToolingJsonPath, parseResult.originalObject, tools);
            };
            switch ((_a = parseResult.tools) === null || _a === void 0 ? void 0 : _a.tag) {
                case "Error":
                    logger.error(mixed_1.bold(parseResult.elmToolingJsonPath));
                    logger.error("");
                    logger.error(parse_1.printFieldErrors(parseResult.tools.errors));
                    logger.error("");
                    logger.error(mixed_1.elmToolingJsonDocumentationLink);
                    return 1;
                case undefined:
                    logger.log(mixed_1.bold(parseResult.elmToolingJsonPath));
                    return start(logger, stdin, stdout, [], save);
                case "Parsed":
                    logger.log(mixed_1.bold(parseResult.elmToolingJsonPath));
                    return start(logger, stdin, stdout, sortTools(parseResult.tools.parsed.existing.concat(parseResult.tools.parsed.missing)), save);
            }
        }
    }
}
exports.default = toolsCommand;
async function start(logger, stdin, stdout, tools, save) {
    return new Promise((resolve) => {
        let state = {
            tools,
            cursorTool: tools.length > 0 ? tools[0] : getDefaultCursorTool(),
        };
        let cursor = { x: 0, y: 0 };
        const redraw = ({ moveCursor }) => {
            // Temporarily hide cursor to avoid seeing it briefly jump around on Windows.
            stdout.write(mixed_1.HIDE_CURSOR);
            readline.moveCursor(stdout, -cursor.x, -cursor.y);
            const content = logger.handleColor(`${draw(state.tools)}\n\n${instructions}\n`);
            stdout.write(content);
            const y = getCursorLine(state.cursorTool);
            cursor = { x: 3, y };
            if (moveCursor) {
                readline.moveCursor(stdout, cursor.x, -(content.split("\n").length - 1 - cursor.y));
            }
            stdout.write(mixed_1.SHOW_CURSOR);
        };
        logger.log("");
        redraw({ moveCursor: true });
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on("data", (buffer) => {
            const [nextState, cmd] = update(buffer.toString(), state);
            state = nextState;
            switch (cmd) {
                case "None":
                    redraw({ moveCursor: true });
                    break;
                case "Exit":
                    redraw({ moveCursor: false });
                    logger.log("");
                    logger.log("Nothing changed.");
                    resolve(0);
                    break;
                case "Save":
                    redraw({ moveCursor: false });
                    logger.log("");
                    if (toolsEqual(tools, state.tools)) {
                        logger.log("Nothing changed.");
                    }
                    else {
                        try {
                            save(state.tools);
                        }
                        catch (errorAny) {
                            const error = errorAny;
                            logger.error(`Failed to save: ${error.message}`);
                            resolve(1);
                            break;
                        }
                        const verb = toolHasBeenAdded(tools, state.tools)
                            ? "install"
                            : "unlink";
                        logger.log(`Saved! To ${verb}: elm-tooling install`);
                    }
                    resolve(0);
                    break;
                case "TestExit":
                    redraw({ moveCursor: true });
                    resolve(0);
                    break;
            }
        });
    });
}
function draw(tools) {
    return Object.keys(known_tools_1.KNOWN_TOOLS)
        .map((name) => {
        const versions = Object.keys(known_tools_1.KNOWN_TOOLS[name]);
        const selectedIndex = versions.findIndex((version) => tools.some((tool) => tool.name === name && tool.version === version));
        const versionsString = versions
            .map((version, index) => {
            const marker = index === selectedIndex ? mixed_1.bold("x") : " ";
            return `  ${mixed_1.dim("[")}${marker}${mixed_1.dim("]")} ${index === selectedIndex ? version : mixed_1.dim(version)}`;
        })
            .join("\n");
        return `${mixed_1.bold(name)}\n${versionsString}`;
    })
        .join("\n\n");
}
const instructions = `
${mixed_1.bold("Up")}/${mixed_1.bold("Down")} to move
${mixed_1.bold("Space")} to toggle
${mixed_1.bold("Enter")} to save
`.trim();
function getCursorLine(cursorTool) {
    const names = Object.keys(known_tools_1.KNOWN_TOOLS);
    const nameIndex = names.indexOf(cursorTool.name);
    // istanbul ignore if
    if (nameIndex === -1) {
        return 1;
    }
    const name = names[nameIndex];
    const versions = Object.keys(known_tools_1.KNOWN_TOOLS[name]);
    const versionIndex = versions.indexOf(cursorTool.version);
    // istanbul ignore if
    if (versionIndex === -1) {
        return 1;
    }
    return (1 +
        2 * nameIndex +
        versionIndex +
        names
            .slice(0, nameIndex)
            .reduce((sum, name2) => sum + Object.keys(known_tools_1.KNOWN_TOOLS[name2]).length, 0));
}
function getDefaultCursorTool() {
    const [name] = Object.keys(known_tools_1.KNOWN_TOOLS);
    const versions = Object.keys(known_tools_1.KNOWN_TOOLS[name]);
    const version = versions[versions.length - 1];
    return { name, version };
}
function update(keypress, state) {
    switch (keypress) {
        case "\x03": // ctrl+c
        case "q":
            return [state, "Exit"];
        case "\x1B[A": // up
        case "k":
            return [
                { ...state, cursorTool: updateCursorTool(-1, state.cursorTool) },
                "None",
            ];
        case "\x1B[B": // down
        case "j":
            return [
                { ...state, cursorTool: updateCursorTool(1, state.cursorTool) },
                "None",
            ];
        case "\r": // enter
            return [state, "Save"];
        case " ": // space
        case "x":
        case "o":
            return [
                { ...state, tools: toggleTool(state.cursorTool, state.tools) },
                "None",
            ];
        case "test-exit":
            return [state, "TestExit"];
        default:
            return [state, "None"];
    }
}
function updateCursorTool(delta, cursorTool) {
    const all = mixed_1.flatMap(Object.keys(known_tools_1.KNOWN_TOOLS), (name) => Object.keys(known_tools_1.KNOWN_TOOLS[name]).map((version) => ({ name, version })));
    const index = all.findIndex((tool) => tool.name === cursorTool.name && tool.version === cursorTool.version);
    // istanbul ignore if
    if (index === -1) {
        return cursorTool;
    }
    const nextIndex = index + delta;
    return nextIndex < 0 || nextIndex >= all.length ? cursorTool : all[nextIndex];
}
function toggleTool(cursorTool, tools) {
    const isSelected = tools.some((tool) => tool.name === cursorTool.name && tool.version === cursorTool.version);
    const filtered = tools.filter((tool) => tool.name !== cursorTool.name);
    return isSelected ? filtered : [...filtered, cursorTool];
}
function updateElmToolingJson(elmToolingJsonPath, originalObject, toolsList) {
    const tools = toolsList.length === 0
        ? undefined
        : mixed_1.fromEntries(sortTools(toolsList).map(({ name, version }) => [name, version]));
    fs.writeFileSync(elmToolingJsonPath, mixed_1.toJSON({ ...originalObject, tools }));
}
function sortTools(tools) {
    return tools.slice().sort((a, b) => a.name.localeCompare(b.name));
}
function toolsEqual(a, b) {
    return (a.length === b.length &&
        a.every((toolA) => b.some((toolB) => toolA.name === toolB.name && toolA.version === toolB.version)));
}
function toolHasBeenAdded(before, after) {
    return after.some((toolA) => !before.some((toolB) => toolA.name === toolB.name && toolA.version === toolB.version));
}
