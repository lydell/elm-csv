"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePs1Script = exports.makeCmdScript = exports.makeShScript = exports.unlinkTool = exports.linkTool = void 0;
const fs = require("fs");
const path = require("path");
const mixed_1 = require("./mixed");
const parse_1 = require("./parse");
function linkTool(cwd, nodeModulesBinPath, tool) {
    const { linkPathPresentationString, what, strategy } = linkHelper(cwd, nodeModulesBinPath, tool);
    const result = linkToolWithStrategy(tool, strategy);
    if (result instanceof Error) {
        return new Error(result.message);
    }
    switch (result) {
        case "AllGood":
            return `${mixed_1.bold(`${tool.name} ${tool.version}`)}: ${mixed_1.dim("all good")}`;
        case "Created":
            return `${mixed_1.bold(`${tool.name} ${tool.version}`)} ${what} created: ${mixed_1.dim(`${linkPathPresentationString} -> ${tool.absolutePath}`)}\n${mixed_1.indent(`To run: npx ${tool.name}`)}`;
    }
}
exports.linkTool = linkTool;
// Just like npm, these overwrite whatever links are already in
// `node_modules/.bin/`. Most likely it’s either old links from for example the
// `elm` npm package, or links from previous runs of this script.
function linkToolWithStrategy(tool, strategy) {
    switch (strategy.tag) {
        case "Link":
            return symlink(tool, strategy.linkPath);
        // istanbul ignore next
        case "Shims":
            return symlinkShimWindows(tool, strategy.items);
    }
}
function unlinkTool(cwd, nodeModulesBinPath, tool) {
    const { linkPathPresentationString, what, strategy } = linkHelper(cwd, nodeModulesBinPath, tool);
    const result = unlinkToolWithStrategy(tool, strategy);
    // istanbul ignore if
    if (result instanceof Error) {
        return new Error(result.message);
    }
    switch (result) {
        case "DidNothing":
            return undefined;
        case "Removed":
            return `${mixed_1.bold(`${tool.name} ${tool.version}`)} ${what} removed: ${mixed_1.dim(`${linkPathPresentationString}`)}`;
    }
}
exports.unlinkTool = unlinkTool;
// These only remove things that are created by elm-tooling itself (or seem to
// be). For example, if the user has installed elm-json with npm we shouldn’t
// remove that link.
function unlinkToolWithStrategy(tool, strategy) {
    switch (strategy.tag) {
        case "Link":
            return removeSymlink(tool, strategy.linkPath);
        // istanbul ignore next
        case "Shims":
            return removeSymlinkShimWindows(tool, strategy.items);
    }
}
function linkHelper(cwd, nodeModulesBinPath, tool) {
    const linkPath = path.join(nodeModulesBinPath, tool.name);
    const relativeLinkPath = path.relative(cwd, linkPath);
    const possiblyRelativeLinkPath = relativeLinkPath.startsWith("node_modules")
        ? relativeLinkPath
        : linkPath;
    return parse_1.isWindows
        ? // istanbul ignore next
            {
                linkPathPresentationString: `${possiblyRelativeLinkPath}{,.cmd,.ps1}`,
                what: "shims",
                strategy: {
                    tag: "Shims",
                    items: [
                        [linkPath, makeShScript(tool.absolutePath)],
                        [`${linkPath}.cmd`, makeCmdScript(tool.absolutePath)],
                        [`${linkPath}.ps1`, makePs1Script(tool.absolutePath)],
                    ],
                },
            }
        : {
            linkPathPresentationString: possiblyRelativeLinkPath,
            what: "link",
            strategy: { tag: "Link", linkPath },
        };
}
function symlink(tool, linkPath) {
    try {
        if (fs.readlinkSync(linkPath) === tool.absolutePath) {
            return "AllGood";
        }
    }
    catch (_error) {
        // Continue below.
    }
    try {
        fs.unlinkSync(linkPath);
    }
    catch (errorAny) {
        const error = errorAny;
        if (error.code !== "ENOENT") {
            return new Error(`Failed to remove old link for ${tool.name} at ${linkPath}:\n${error.message}`);
        }
    }
    try {
        fs.symlinkSync(tool.absolutePath, linkPath);
    }
    catch (errorAny) /* istanbul ignore next */ {
        const error = errorAny;
        return new Error(`Failed to create link for ${tool.name} at ${linkPath}:\n${error.message}`);
    }
    return "Created";
}
function removeSymlink(tool, linkPath) {
    try {
        if (fs.readlinkSync(linkPath) === tool.absolutePath) {
            fs.unlinkSync(linkPath);
            return "Removed";
        }
    }
    catch (errorAny) {
        const error = errorAny;
        // If the path exists but is something else, let it be.
        // If the path does not exist there’s nothing to do.
        // istanbul ignore if
        if (error.code !== "EINVAL" && error.code !== "ENOENT") {
            return new Error(`Failed to remove old link for ${tool.name} at ${linkPath}:\n${error.message}`);
        }
    }
    return "DidNothing";
}
// istanbul ignore next
function symlinkShimWindows(tool, items) {
    try {
        if (items.every(([itemPath, content]) => fs.readFileSync(itemPath, "utf8") === content)) {
            return "AllGood";
        }
    }
    catch (_error) {
        // Continue below.
    }
    for (const [itemPath] of items) {
        try {
            fs.unlinkSync(itemPath);
        }
        catch (errorAny) {
            const error = errorAny;
            if (error.code !== "ENOENT") {
                return new Error(`Failed to remove old shim for ${tool.name} at ${itemPath}:\n${error.message}`);
            }
        }
    }
    for (const [itemPath, content] of items) {
        try {
            fs.writeFileSync(itemPath, content);
        }
        catch (errorAny) {
            const error = errorAny;
            return new Error(`Failed to create shim for ${tool.name} at ${itemPath}:\n${error.message}`);
        }
    }
    return "Created";
}
// istanbul ignore next
function removeSymlinkShimWindows(tool, items) {
    let didNothing = true;
    for (const [itemPath, content] of items) {
        try {
            if (fs.readFileSync(itemPath, "utf8") === content) {
                fs.unlinkSync(itemPath);
                didNothing = false;
            }
        }
        catch (errorAny) {
            const error = errorAny;
            // If the path exists but isn’t a file, let it be.
            // If the path does not exists there’s nothing to do.
            if (error.code !== "EISDIR" && error.code !== "ENOENT") {
                return new Error(`Failed to remove old shim for ${tool.name} at ${itemPath}:\n${error.message}`);
            }
        }
    }
    return didNothing ? "DidNothing" : "Removed";
}
// Windows-style paths works fine, at least in Git bash.
function makeShScript(toolAbsolutePath) {
    return lf(`
#!/bin/sh
${toolAbsolutePath
        .split(/(')/)
        .map((segment) => segment === "" ? "" : segment === "'" ? "\\'" : `'${segment}'`)
        .join("")} "$@"
`);
}
exports.makeShScript = makeShScript;
// Note: Paths on Windows cannot contain `"`.
function makeCmdScript(toolAbsolutePath) {
    return crlf(`
@ECHO off
"${toolAbsolutePath}" %*
`);
}
exports.makeCmdScript = makeCmdScript;
// The shebang is for PowerShell on unix: https://github.com/npm/cmd-shim/pull/34
function makePs1Script(toolAbsolutePath) {
    return lf(`
#!/usr/bin/env pwsh
& '${toolAbsolutePath.replace(/'/g, "''")}' $args
`);
}
exports.makePs1Script = makePs1Script;
function lf(string) {
    return `${string.trim()}\n`;
}
function crlf(string) {
    return lf(string).replace(/\n/g, "\r\n");
}
