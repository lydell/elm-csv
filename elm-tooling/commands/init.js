"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const known_tools_1 = require("../helpers/known-tools");
const mixed_1 = require("../helpers/mixed");
const parse_1 = require("../helpers/parse");
async function init(cwd, env, logger) {
    var _a;
    const absolutePath = path.join(cwd, "elm-tooling.json");
    if (fs.existsSync(absolutePath)) {
        logger.error(mixed_1.bold(absolutePath));
        logger.error("Already exists!");
        return 1;
    }
    // For packages, skip entrypoints.
    // For applications, try to find .elm files with `main =` directly inside one
    // of the "source-directories".
    // If all detection fails, use a good guess.
    const entrypoints = await tryGuessEntrypoints(cwd).then((paths) => paths.map((file) => {
        const relative = path.relative(path.dirname(absolutePath), file);
        // istanbul ignore next
        const normalized = parse_1.isWindows ? relative.replace(/\\/g, "/") : relative;
        return `./${normalized}`;
    }), () => ["./src/Main.elm"]);
    const tools = parse_1.getOSName() instanceof Error
        ? /* istanbul ignore next */ undefined
        : (_a = tryGuessToolsFromNodeModules(cwd, env)) !== null && _a !== void 0 ? _a : mixed_1.fromEntries(Object.keys(known_tools_1.KNOWN_TOOLS)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => {
            const versions = Object.keys(known_tools_1.KNOWN_TOOLS[name]);
            return [name, versions[versions.length - 1]];
        }));
    const elmVersionFromElmJson = getElmVersionFromElmJson(cwd);
    const json = {
        entrypoints: entrypoints.length === 0
            ? undefined
            : entrypoints,
        tools: elmVersionFromElmJson === undefined
            ? tools
            : { ...tools, elm: elmVersionFromElmJson },
    };
    fs.writeFileSync(absolutePath, mixed_1.toJSON(json));
    logger.log(mixed_1.bold(absolutePath));
    logger.log("Created! Open it in a text editor and have a look!");
    logger.log("To install tools: elm-tooling install");
    return 0;
}
exports.default = init;
async function tryGuessEntrypoints(cwd) {
    const sourceDirectories = tryGetSourceDirectories(cwd);
    if (sourceDirectories.length === 0) {
        return [];
    }
    const files = mixed_1.flatMap(sourceDirectories, (directory) => fs
        .readdirSync(directory, { encoding: "utf-8", withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".elm"))
        .map((entry) => path.join(directory, entry.name)));
    const results = await Promise.all(files.map((file) => isMainFile(file).then((isMain) => (isMain ? file : new Error(`${file} is not a main file.`)), 
    // istanbul ignore next
    (error) => error)));
    const entrypoints = mixed_1.flatMap(results, (result) => result instanceof Error ? [] : result).sort((a, b) => a.localeCompare(b));
    if (entrypoints.length === 0) {
        throw new Error("Expected at least 1 entrypoint but got 0.");
    }
    return entrypoints;
}
function tryGetElmJson(cwd) {
    const elmJsonPath = path.join(cwd, "elm.json");
    const elmJson = JSON.parse(fs.readFileSync(elmJsonPath, "utf8"));
    if (!mixed_1.isRecord(elmJson)) {
        throw new Error(`Expected elm.json to be a JSON object but got: ${JSON.stringify(elmJson)}`);
    }
    return [elmJson, elmJsonPath];
}
function tryGetSourceDirectories(cwd) {
    const [elmJson, elmJsonPath] = tryGetElmJson(cwd);
    switch (elmJson.type) {
        case "application": {
            if (!Array.isArray(elmJson["source-directories"])) {
                throw new Error(`Expected "source-directories" to be an array but got: ${JSON.stringify(elmJson["source-directories"])}`);
            }
            const directories = mixed_1.flatMap(elmJson["source-directories"], (item) => typeof item === "string"
                ? path.resolve(path.dirname(elmJsonPath), item)
                : []);
            if (directories.length === 0) {
                throw new Error(`Expected "source-directories" to contain at least one string but got: ${JSON.stringify(elmJson["source-directories"])}`);
            }
            return directories;
        }
        case "package":
            return [];
        default:
            throw new Error(`Expected "type" to be "application" or "package" but got: ${JSON.stringify(elmJson.type)}`);
    }
}
async function isMainFile(file) {
    return new Promise((resolve) => {
        let found = false;
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity,
        });
        rl.on("line", (line) => {
            if (/^main *=/.test(line)) {
                found = true;
                rl.close();
            }
        });
        rl.once("close", () => {
            resolve(found);
        });
    });
}
function tryGuessToolsFromNodeModules(cwd, env) {
    const nodeModulesPath = mixed_1.findClosest("node_modules", cwd);
    // istanbul ignore if
    if (nodeModulesPath === undefined) {
        return undefined;
    }
    const pairs = mixed_1.flatMap(Object.keys(known_tools_1.KNOWN_TOOLS), (name) => {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(nodeModulesPath, name, "package.json"), "utf8"));
            const version = mixed_1.isRecord(pkg) && typeof pkg.version === "string"
                ? pkg.version
                : undefined;
            if (version === undefined) {
                return [];
            }
            // Exact version match.
            if (Object.hasOwnProperty.call(known_tools_1.KNOWN_TOOLS[name], version)) {
                return [[name, version]];
            }
            // Support for example 0.19.1-3 -> 0.19.1.
            const alternateVersion = version.split(/[+-]/)[0];
            if (Object.hasOwnProperty.call(known_tools_1.KNOWN_TOOLS[name], alternateVersion)) {
                return [[name, alternateVersion]];
            }
            // If we find for example elm-json@0.2.7 in node_modules, try to find a
            // supported semver-matching elm-json version such as 0.2.8.
            const tool = parse_1.getToolThrowing({
                name,
                version: `^${version}`,
                cwd,
                env,
            });
            return [[tool.name, tool.version]];
        }
        catch (_error) {
            return [];
        }
    });
    return pairs.length > 0 ? mixed_1.fromEntries(pairs) : undefined;
}
function getElmVersionFromElmJson(cwd) {
    try {
        return getElmVersionFromElmJsonHelper(cwd);
    }
    catch (_error) {
        return undefined;
    }
}
const elmVersionRangeRegex = /^\s*(\S+)\s*<=\s*v\s*<\s*(\S+)\s*$/;
function getElmVersionFromElmJsonHelper(cwd) {
    const [elmJson] = tryGetElmJson(cwd);
    const elmVersion = elmJson["elm-version"];
    if (typeof elmVersion !== "string") {
        throw new Error(`Expected "elm-version" to be a string but got: ${JSON.stringify(elmVersion)}`);
    }
    switch (elmJson.type) {
        case "application":
            if (!Object.hasOwnProperty.call(known_tools_1.KNOWN_TOOLS.elm, elmVersion)) {
                throw new Error(`Unknown/unsupported Elm version: ${elmVersion}`);
            }
            return elmVersion;
        case "package": {
            const match = elmVersionRangeRegex.exec(elmVersion);
            if (match === null) {
                throw new Error(`Elm version range did not match the regex: ${elmVersion}`);
            }
            const [, lowerBoundInclusive, upperBoundExclusive] = match;
            const version = parse_1.getLatestVersionInRange(lowerBoundInclusive, upperBoundExclusive, Object.keys(known_tools_1.KNOWN_TOOLS.elm).reverse());
            if (version === undefined) {
                throw new Error(`No version found for: ${elmVersion}`);
            }
            return version;
        }
        default:
            throw new Error(`Expected "type" to be "application" or "package" but got: ${JSON.stringify(elmJson.type)}`);
    }
}
