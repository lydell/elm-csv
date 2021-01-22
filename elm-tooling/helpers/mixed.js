"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromEntries = exports.flatMap = exports.printNumErrors = exports.elmToolingJsonDocumentationLink = exports.indent = exports.removeColor = exports.dim = exports.bold = exports.RESET_COLOR = exports.SHOW_CURSOR = exports.HIDE_CURSOR = exports.partitionMap = exports.findClosest = exports.isRecord = exports.toJSON = exports.KNOWN_FIELDS = void 0;
const fs = require("fs");
const path = require("path");
exports.KNOWN_FIELDS = ["entrypoints", "tools"];
function toJSON(json) {
    return `${JSON.stringify(json, null, 4)}\n`;
}
exports.toJSON = toJSON;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
exports.isRecord = isRecord;
function findClosest(name, dir) {
    const entry = path.join(dir, name);
    return fs.existsSync(entry)
        ? entry
        : dir === path.parse(dir).root
            ? undefined
            : findClosest(name, path.dirname(dir));
}
exports.findClosest = findClosest;
function partitionMap(items, f) {
    const left = [];
    const right = [];
    for (const [index, item] of items.entries()) {
        const either = f(item, index, left, right);
        switch (either.tag) {
            case "Left":
                left.push(either.value);
                break;
            case "Right":
                right.push(either.value);
                break;
        }
    }
    return [left, right];
}
exports.partitionMap = partitionMap;
exports.HIDE_CURSOR = "\x1B[?25l";
exports.SHOW_CURSOR = "\x1B[?25h";
exports.RESET_COLOR = "\x1B[0m";
function bold(string) {
    return `${exports.RESET_COLOR}\x1B[1m${string}${exports.RESET_COLOR}`;
}
exports.bold = bold;
function dim(string) {
    return `${exports.RESET_COLOR}\x1B[2m${string}${exports.RESET_COLOR}`;
}
exports.dim = dim;
function removeColor(string) {
    return string.replace(/\x1B\[\dm/g, "");
}
exports.removeColor = removeColor;
function indent(string) {
    return string.replace(/^/gm, "    ");
}
exports.indent = indent;
exports.elmToolingJsonDocumentationLink = `${dim("Specification:")}\n${indent("https://elm-tooling.github.io/elm-tooling-cli/spec")}`;
function printNumErrors(numErrors) {
    return `${bold(numErrors.toString())} error${numErrors === 1 ? "" : "s"}`;
}
exports.printNumErrors = printNumErrors;
// This can be replaced with `Array.prototype.flatMap` once Node.js is EOL
// 2021-04-30 and support for Node.js 10 is dropped.
function flatMap(array, callback) {
    const results = [];
    for (const [index, item] of array.entries()) {
        const result = callback(item, index, array);
        if (Array.isArray(result)) {
            results.push(...result);
        }
        else {
            results.push(result);
        }
    }
    return results;
}
exports.flatMap = flatMap;
// This can be replaced with `Object.fromEntries` once Node.js is EOL
// 2021-04-30 and support for Node.js 10 is dropped.
function fromEntries(entries) {
    const result = {};
    for (const [key, value] of entries) {
        result[key] = value;
    }
    return result;
}
exports.fromEntries = fromEntries;
