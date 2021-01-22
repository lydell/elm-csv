"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLogger = void 0;
const readline = require("readline");
const mixed_1 = require("./mixed");
let previousProgress = undefined;
function makeLogger({ env, stdout, stderr, }) {
    const NO_COLOR = "NO_COLOR" in env;
    const handleColor = (string) => NO_COLOR ? mixed_1.removeColor(string) : string;
    return {
        handleColor,
        log(message) {
            previousProgress = undefined;
            stdout.write(`${handleColor(message)}\n`);
        },
        error(message) {
            previousProgress = undefined;
            stderr.write(`${handleColor(message)}\n`);
        },
        // istanbul ignore next
        progress(passedMessage) {
            const message = handleColor(passedMessage);
            if (previousProgress !== undefined) {
                readline.moveCursor(stdout, 0, -previousProgress);
            }
            previousProgress = message.split("\n").length;
            stdout.write(`${message}\n`);
        },
    };
}
exports.makeLogger = makeLogger;
