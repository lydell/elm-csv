"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestVersionInRange = exports.getLatestMatchingVersion = exports.getToolThrowing = exports.printFieldErrors = exports.makeTool = exports.validateFileExists = exports.prefixFieldResult = exports.getOSNameAsFieldResult = exports.getOSName = exports.findReadAndParseElmToolingJson = exports.getElmToolingInstallPath = exports.isWindows = void 0;
const fs = require("fs");
const os = require("os");
const path = require("path");
const known_tools_1 = require("./known-tools");
const mixed_1 = require("./mixed");
exports.isWindows = os.platform() === "win32";
function getElmToolingInstallPath(cwd, env) {
    var _a, _b;
    // istanbul ignore next
    const elmHome = (_a = env.ELM_HOME) !== null && _a !== void 0 ? _a : (exports.isWindows
        ? path.join((_b = env.APPDATA) !== null && _b !== void 0 ? _b : path.join(os.homedir(), "AppData", "Roaming"), "elm")
        : path.join(os.homedir(), ".elm"));
    return path.join(path.resolve(cwd, elmHome), "elm-tooling");
}
exports.getElmToolingInstallPath = getElmToolingInstallPath;
function findReadAndParseElmToolingJson(cwd, env) {
    const elmToolingJsonPath = mixed_1.findClosest("elm-tooling.json", cwd);
    if (elmToolingJsonPath === undefined) {
        return {
            tag: "ElmToolingJsonNotFound",
            message: "No elm-tooling.json found. To create one: elm-tooling init",
        };
    }
    let json = undefined;
    try {
        json = JSON.parse(fs.readFileSync(elmToolingJsonPath, "utf-8"));
    }
    catch (errorAny) {
        const error = errorAny;
        return {
            tag: "ReadAsJsonObjectError",
            elmToolingJsonPath,
            message: `Failed to read file as JSON:\n${error.message}`,
        };
    }
    if (!mixed_1.isRecord(json)) {
        return {
            tag: "ReadAsJsonObjectError",
            elmToolingJsonPath,
            message: `Expected an object but got: ${JSON.stringify(json)}`,
        };
    }
    const result = {
        tag: "Parsed",
        originalObject: json,
        elmToolingJsonPath,
        unknownFields: [],
    };
    for (const [field, value] of Object.entries(json)) {
        switch (field) {
            case "entrypoints":
                result.entrypoints = prefixFieldResult("entrypoints", parseEntrypoints(elmToolingJsonPath, value));
                break;
            case "tools": {
                result.tools = prefixFieldResult("tools", flatMapFieldResult(getOSNameAsFieldResult(), (osName) => parseTools(cwd, env, osName, value)));
                break;
            }
            default:
                result.unknownFields.push(field);
                break;
        }
    }
    return result;
}
exports.findReadAndParseElmToolingJson = findReadAndParseElmToolingJson;
function getOSName() {
    // istanbul ignore next
    switch (os.platform()) {
        case "linux":
            return "linux";
        case "darwin":
            return "mac";
        case "win32":
            return "windows";
        default:
            return new Error(`Sorry, your platform (${os.platform()}) is not supported yet :(`);
    }
}
exports.getOSName = getOSName;
function getOSNameAsFieldResult() {
    const osName = getOSName();
    return osName instanceof Error
        ? // istanbul ignore next
            {
                tag: "Error",
                errors: [
                    { path: [], message: osName.message },
                ],
            }
        : {
            tag: "Parsed",
            parsed: osName,
        };
}
exports.getOSNameAsFieldResult = getOSNameAsFieldResult;
function flatMapFieldResult(fieldResult, f) {
    switch (fieldResult.tag) {
        // istanbul ignore next
        case "Error":
            return fieldResult;
        case "Parsed":
            return f(fieldResult.parsed);
    }
}
function prefixFieldResult(prefix, fieldResult) {
    switch (fieldResult.tag) {
        case "Error":
            return {
                tag: "Error",
                errors: fieldResult.errors.map(({ path: fieldPath, message }) => ({
                    path: [prefix, ...fieldPath],
                    message,
                })),
            };
        case "Parsed":
            return fieldResult;
    }
}
exports.prefixFieldResult = prefixFieldResult;
function validateFileExists(fullPath) {
    try {
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            return { tag: "Error", message: `Exists but is not a file: ${fullPath}` };
        }
    }
    catch (errorAny) {
        const error = errorAny;
        switch (error.code) {
            case "ENOENT":
                return {
                    tag: "DoesNotExist",
                    message: `File does not exist: ${fullPath}`,
                };
            case "ENOTDIR":
                return {
                    tag: "Error",
                    message: `A part of this path exist, but is not a directory (which it needs to be): ${path.dirname(fullPath)}`,
                };
            // istanbul ignore next
            default:
                return {
                    tag: "Error",
                    message: `File error for ${fullPath}: ${error.message}`,
                };
        }
    }
    return { tag: "Exists" };
}
exports.validateFileExists = validateFileExists;
function parseEntrypoints(elmToolingJsonPath, json) {
    if (!Array.isArray(json)) {
        return {
            tag: "Error",
            errors: [
                {
                    path: [],
                    message: `Expected an array but got: ${JSON.stringify(json)}`,
                },
            ],
        };
    }
    if (json.length === 0) {
        return {
            tag: "Error",
            errors: [
                {
                    path: [],
                    message: `Expected at least one entrypoint but got 0.`,
                },
            ],
        };
    }
    const [errors, entrypoints] = mixed_1.partitionMap(json, (entrypoint, index, _, entrypointsSoFar) => {
        if (typeof entrypoint !== "string") {
            return {
                tag: "Left",
                value: {
                    path: [index],
                    message: `Expected a string but got: ${JSON.stringify(entrypoint)}`,
                },
            };
        }
        if (entrypoint.includes("\\")) {
            return {
                tag: "Left",
                value: {
                    path: [index],
                    message: `Expected the string to use only "/" as path delimiter but found "\\": ${JSON.stringify(entrypoint)}`,
                },
            };
        }
        if (!entrypoint.startsWith("./")) {
            return {
                tag: "Left",
                value: {
                    path: [index],
                    message: `Expected the string to start with "./" (to indicate that it is a relative path) but got: ${JSON.stringify(entrypoint)}`,
                },
            };
        }
        if (!entrypoint.endsWith(".elm")) {
            return {
                tag: "Left",
                value: {
                    path: [index],
                    message: `Expected the string to end with ".elm" but got: ${JSON.stringify(entrypoint)}`,
                },
            };
        }
        const absolutePath = path.join(path.dirname(elmToolingJsonPath), entrypoint);
        const exists = validateFileExists(absolutePath);
        if (exists.tag !== "Exists") {
            return {
                tag: "Left",
                value: { path: [index], message: exists.message },
            };
        }
        if (entrypointsSoFar.some((otherEntrypoint) => otherEntrypoint.absolutePath === absolutePath)) {
            return {
                tag: "Left",
                value: {
                    path: [index],
                    message: `Duplicate entrypoint: ${absolutePath}`,
                },
            };
        }
        return {
            tag: "Right",
            value: {
                relativePath: entrypoint,
                absolutePath,
            },
        };
    });
    if (errors.length > 0) {
        return {
            tag: "Error",
            errors: errors,
        };
    }
    return { tag: "Parsed", parsed: entrypoints };
}
function parseTools(cwd, env, osName, json) {
    if (!mixed_1.isRecord(json)) {
        return {
            tag: "Error",
            errors: [
                {
                    path: [],
                    message: `Expected an object but got: ${JSON.stringify(json)}`,
                },
            ],
        };
    }
    const [errors, tools] = mixed_1.partitionMap(Object.entries(json), ([name, version]) => {
        if (typeof version !== "string") {
            return {
                tag: "Left",
                value: {
                    path: [name],
                    message: `Expected a version as a string but got: ${JSON.stringify(version)}`,
                },
            };
        }
        const versions = Object.prototype.hasOwnProperty.call(known_tools_1.KNOWN_TOOLS, name)
            ? known_tools_1.KNOWN_TOOLS[name]
            : undefined;
        if (versions === undefined) {
            return {
                tag: "Left",
                value: {
                    path: [name],
                    message: `Unknown tool\nKnown tools: ${Object.keys(known_tools_1.KNOWN_TOOLS).join(", ")}`,
                },
            };
        }
        const osAssets = Object.prototype.hasOwnProperty.call(versions, version)
            ? versions[version]
            : undefined;
        if (osAssets === undefined) {
            return {
                tag: "Left",
                value: {
                    path: [name],
                    message: `Unknown version: ${version}\nKnown versions: ${Object.keys(versions).join(", ")}`,
                },
            };
        }
        const asset = osAssets[osName];
        const tool = makeTool(cwd, env, name, version, asset);
        const exists = validateFileExists(tool.absolutePath);
        switch (exists.tag) {
            case "Exists":
                return {
                    tag: "Right",
                    value: [true, tool],
                };
            case "DoesNotExist":
                return {
                    tag: "Right",
                    value: [false, tool],
                };
            case "Error":
                return {
                    tag: "Left",
                    value: { path: [name], message: exists.message },
                };
        }
    });
    if (errors.length > 0) {
        return {
            tag: "Error",
            errors: errors,
        };
    }
    const [existing, missing] = mixed_1.partitionMap(tools, ([exists, tool]) => exists ? { tag: "Left", value: tool } : { tag: "Right", value: tool });
    return {
        tag: "Parsed",
        parsed: { existing, missing, osName },
    };
}
function makeTool(cwd, env, name, version, asset) {
    return {
        name,
        version,
        absolutePath: path.join(getElmToolingInstallPath(cwd, env), name, version, asset.fileName),
        asset,
    };
}
exports.makeTool = makeTool;
function printFieldErrors(errors) {
    return [
        mixed_1.printNumErrors(errors.length),
        ...errors.map((error) => `${mixed_1.bold(joinPath(error.path))}\n${mixed_1.indent(error.message)}`),
    ].join("\n\n");
}
exports.printFieldErrors = printFieldErrors;
function joinPath(errorPath) {
    // istanbul ignore if
    if (errorPath.length === 0) {
        return "General";
    }
    const rest = errorPath
        .slice(1)
        .map((segment) => `[${JSON.stringify(segment)}]`);
    return `${errorPath[0]}${rest.join("")}`;
}
const versionRangeRegex = /^([=~^])(\d+)\.(\d+)\.(\d+)([+-].+)?$/;
const prereleaseRegex = /-.+$/;
const collator = new Intl.Collator("en", { numeric: true });
function hasPrerelease(version) {
    var _a;
    return ((_a = /[+-]/.exec(version)) === null || _a === void 0 ? void 0 : _a[0]) === "-";
}
function hasSameBase(a, b) {
    return a.replace(prereleaseRegex, "-") === b.replace(prereleaseRegex, "-");
}
function getToolThrowing({ name, version: versionRange, cwd, env, }) {
    const osName = getOSName();
    // istanbul ignore if
    if (osName instanceof Error) {
        throw osName;
    }
    const versions = Object.prototype.hasOwnProperty.call(known_tools_1.KNOWN_TOOLS, name)
        ? known_tools_1.KNOWN_TOOLS[name]
        : undefined;
    if (versions === undefined) {
        throw new Error(`Unknown tool: ${name}\nKnown tools: ${Object.keys(known_tools_1.KNOWN_TOOLS).join(", ")}`);
    }
    const matchingVersion = getLatestMatchingVersion(versionRange, Object.keys(versions).reverse());
    if (matchingVersion === undefined) {
        throw new Error(`No ${name} versions matching: ${versionRange}\nKnown versions: ${Object.keys(versions).join(", ")}`);
    }
    const asset = versions[matchingVersion][osName];
    return makeTool(cwd, env, name, matchingVersion, asset);
}
exports.getToolThrowing = getToolThrowing;
function getLatestMatchingVersion(versionRange, sortedValidVersions) {
    const match = versionRangeRegex.exec(versionRange);
    if (match === null) {
        throw new Error(`Version ranges must start with ^ or ~ (or = if you really need an exact version) and be followed by 3 dot-separated numbers, but got: ${versionRange}`);
    }
    const sign = match[1];
    const major = Number(match[2]);
    const minor = Number(match[3]);
    const lowerBoundInclusive = versionRange.slice(1);
    const upperBoundExclusive = major === 0 || sign === "~"
        ? `${major}.${minor + 1}.0`
        : `${major + 1}.0.0`;
    return sign === "="
        ? sortedValidVersions.find((version) => version === lowerBoundInclusive)
        : getLatestVersionInRange(lowerBoundInclusive, upperBoundExclusive, sortedValidVersions);
}
exports.getLatestMatchingVersion = getLatestMatchingVersion;
function getLatestVersionInRange(lowerBoundInclusive, upperBoundExclusive, sortedValidVersions) {
    return sortedValidVersions.find((version) => {
        if (
        // Known prereleases can only be matched…
        hasPrerelease(version) &&
            // …if the lower bound mentions a prerelease…
            !(hasPrerelease(lowerBoundInclusive) &&
                // …and both are for the same base version.
                hasSameBase(version, lowerBoundInclusive))) {
            // If not (via the `!` above), don’t try to match this version.
            return false;
        }
        return (collator.compare(version, lowerBoundInclusive) >= 0 &&
            collator.compare(version, upperBoundExclusive) < 0);
    });
}
exports.getLatestVersionInRange = getLatestVersionInRange;
