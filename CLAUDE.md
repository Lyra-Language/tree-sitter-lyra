# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx tree-sitter generate   # Regenerate src/parser.c from grammar.js
npx tree-sitter test       # Run all corpus tests
npx tree-sitter test --include "Test Name"  # Run a single corpus test by name
```

**Always run `npx tree-sitter generate` before `npx tree-sitter test` after changing any `.js` grammar file.**

## Architecture

`grammar.js` is the entry point. It spreads rule modules from `include/`:

- `include/types/` — struct, data, trait declarations, allocation modifiers, generics
- `include/expressions/` — all expression rules (math, postfix, lambdas, match, etc.)
- `include/statements/` — assignments, for loops, arena/with
- `include/literals/` — number, string, struct literals
- `include/patterns/` — destructuring patterns (match arms, if-let)
- `include/destructuring/` — destructuring declarations
- `include/modules/` — module and import statements
- `include/attributes.js` — `@attr` / `@attr(args)` attribute syntax
- `include/helpers.js` — `commaSep1`, `commaSep`, `parameterList` utilities
- `include/prec.js` — all operator precedence constants (`PREC.*`)

Each subdirectory has an `index.js` that aggregates its rules. All rules are spread into the top-level `grammar.js` `rules` object.

## Corpus Tests

Tests live in `test/corpus/**/*.txt` in tree-sitter's standard format: source, `---`, expected CST.

**Field name strictness:** if a test uses explicit field names (`field: (node)`) for any child of a node, all named fields of that node must be specified. Omitting all field names is lenient (matches regardless of field labels). Do not add field names to nodes that use `alias()` in the grammar — tree-sitter does not expose those in the test format.
