#!/usr/bin/env bash

# Find all AGENTS.md files and create GEMINI.md symlinks in the same directories
find . -name "AGENTS.md" -type f | while read -r agents_file; do
  dir=$(dirname "$agents_file")
  gemini_link="$dir/GEMINI.md"
  if [ ! -e "$gemini_link" ]; then
    ln -s AGENTS.md "$gemini_link"
  fi
done

npx @google/gemini-cli "$@"