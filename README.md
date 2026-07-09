# tree-sitter-lyra

The [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for the
[Lyra](../lyra) programming language. It generates a C parser (`src/parser.c`)
that the Go compiler infrastructure (`../lyra`) links in via CGO, and it also
drives syntax highlighting on the [website](../lyra-website).

> **Status:** pre-release, tracking the language as it evolves.

## Prerequisites

- **Node.js** with `npx` (the [`tree-sitter` CLI](https://github.com/tree-sitter/tree-sitter/tree/master/cli) is a dev dependency).
- **A C toolchain** — building the native node binding / WASM compiles C.

```bash
npm install
```

## Common commands

```bash
npx tree-sitter generate                       # regenerate src/parser.c from grammar.js
npx tree-sitter test                            # run the corpus tests in test/corpus/
npx tree-sitter test --include "Test Name"      # run a single corpus test
npx tree-sitter parse path/to/file.lyra         # parse a file and print its CST
npx tree-sitter playground                       # interactive browser playground (npm start)
```

**Always run `npx tree-sitter generate` before `npx tree-sitter test`** after
changing any grammar file — the corpus tests run against the generated parser.

The grammar is large: `src/parser.c` is ~120 MB and `generate` takes ~60s.

## Layout

```
grammar.js               entry point; spreads the rule modules from include/
include/                 grammar rule modules (expressions/, types/, statements/, patterns/, …)
src/parser.c             GENERATED — do not edit by hand
src/scanner.c            hand-written external scanner (block comments, string interpolation)
test/corpus/**/*.txt     corpus tests (source + expected CST, `===`/`---` delimited)
queries/highlights.scm   syntax-highlighting queries (WIP)
```

The grammar is split into rule modules under `include/`, spread into a single
`grammar()` call in `grammar.js`. See [`CLAUDE.md`](CLAUDE.md) for the module
map, precedence table, and notes on the known GLR conflicts.

## Cross-project dependency

The sibling Go project (`../lyra`) compiles `src/parser.c` through CGO and caches
the result. **After regenerating the grammar, invalidate that cache before
running Go tests:**

```bash
npx tree-sitter generate      # here, in tree-sitter-lyra/
cd ../lyra
go clean -cache               # otherwise Go serves the STALE compiled parser
go test ./...
```

Skipping `go clean -cache` causes the Go tests to silently run against the old
grammar.

## License

[MIT](LICENSE) © Avram Eisner
