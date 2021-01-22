#!/usr/bin/env nix-shell
#!nix-shell --pure -i bash
set -euo pipefail

# export ELM_HOME=elm-stuff/elm-home

# tests
# elm-verify-examples
# elm-test

# docs
# elm make --docs=documentation.json

# linting
# elm-format --validate src

# elm-tooling/index.js install
# /home/runner/.elm/elm-tooling/elm-json/0.2.8/elm-json --help

# elm-review tries to download elm-json, and it fails in CI. We'll try again
# in the 20.05 release of Nix, where it's packaged natively.
# elm-review
npm ci
npx elm-review
