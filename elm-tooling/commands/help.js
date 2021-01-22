"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mixed_1 = require("../helpers/mixed");
const parse_1 = require("../helpers/parse");
function help(cwd, env) {
    return `
${mixed_1.bold("elm-tooling init")}
    Create a sample elm-tooling.json in the current directory

${mixed_1.bold("elm-tooling validate")}
    Validate the closest elm-tooling.json

${mixed_1.bold("elm-tooling tools")}
    Add, remove and update tools

${mixed_1.bold("elm-tooling install")}
    Download the tools in the closest elm-tooling.json to:
    ${mixed_1.dim(parse_1.getElmToolingInstallPath(cwd, env))}
    And create links to them in the closest node_modules/.bin/

${mixed_1.bold("npx elm --help")}
    Example on how to run installed tools

${mixed_1.dim("---")}

${mixed_1.bold("Environment variables:")}
    ${mixed_1.bold("ELM_HOME")}
        Customize where tools will be downloaded
        (The Elm compiler uses this variable too for where to store packages.)

    ${mixed_1.bold("NO_ELM_TOOLING_INSTALL")}
        Disable the install command

    ${mixed_1.bold("NO_COLOR")}
        Disable colored output

${mixed_1.bold("Documentation:")}
    https://elm-tooling.github.io/elm-tooling-cli/cli

${mixed_1.bold("Version:")}
    1.0.2
`.trim();
}
exports.default = help;
