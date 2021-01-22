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
# echo "elm-json --help"
# /home/runner/.elm/elm-tooling/elm-json/0.2.8/elm-json --help
# echo "elm-json solve"
# /home/runner/.elm/elm-tooling/elm-json/0.2.8/elm-json solve --extra elm/json stil4m/elm-syntax elm/project-metadata-utils MartinSStewart/elm-serialize -- review/elm.json

echo "curl?"
curl --version || echo "no curl"
echo "wget?"
wget --version || echo "no wget"

echo "curl package.elm-lang.org"
# SSL_CERT_FILE=/etc/ssl/certs/ca-bundle.crt curl https://package.elm-lang.org/

# elm-review tries to download elm-json, and it fails in CI. We'll try again
# in the 20.05 release of Nix, where it's packaged natively.
# elm-review
npm ci
rm -rf node_modules/elm-tooling/ && cp -R elm-tooling node_modules/elm-tooling
cp cross-spawn-promise.js node_modules/cross-spawn-promise/lib/index.js
SSL_CERT_FILE=/etc/ssl/certs/ca-bundle.crt npx elm-review
