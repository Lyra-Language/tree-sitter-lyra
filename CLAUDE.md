# tree-sitter-lyra — Project Context

This is the tree-sitter grammar for the Lyra programming language. It produces a C parser (`src/parser.c`) consumed via CGO by the sibling `lyra/` Go project.

## Key Files

```
grammar.js               — entry point; spreads all rule modules
include/                 — grammar rule modules (see Architecture below)
src/parser.c             — generated; do not edit by hand
src/scanner.c            — hand-written external scanner (string interpolation, block comments)
test/corpus/**/*.txt     — all parser corpus tests
queries/highlights.scm   — tree-sitter syntax highlight queries (minimal, WIP)
```

## Commands

```bash
npx tree-sitter generate             # regenerate src/parser.c from grammar.js
npx tree-sitter test                 # run all corpus tests
npx tree-sitter test --include "Test Name"  # run a single test by name
```

**Always run `npx tree-sitter generate` before `npx tree-sitter test` after changing any `.js` grammar file.**

After regenerating, the sibling Go project also needs `go clean -cache` before `go test` — otherwise Go's build cache serves the stale compiled parser.

## Architecture

`grammar.js` imports and spreads rule modules from `include/`:

| Module path | Handles |
|---|---|
| `include/expressions/` | all expressions (math, boolean, postfix, lambdas, match, if, range, array comprehensions, async/await, compose `->>`), string interpolation |
| `include/expressions/functions.js` | function/lambda definitions, guards |
| `include/types/` | `struct`, `data`, `tuple`, `newtype`, trait declarations, trait implementations, generics, `where` clauses, allocation modifiers |
| `include/statements/` | assignments (`let`/`var`/`const`), math-assign ops (`+=`, etc.), `for`, `for-in`, `arena`/`with`, `return`/`break`/`continue` |
| `include/literals/` | struct literals, tuple literals, array literals |
| `include/literals/numbers.js` | integer (decimal, hex `0x`, binary `0b`, octal `0o`), float |
| `include/patterns/` | destructuring patterns used in `match` arms and `if let` |
| `include/destructuring/` | destructuring declarations (`let {x, y} = ...`) |
| `include/modules/` | `module` declarations, `import` statements |
| `include/attributes.js` | `@attr` / `@attr(args)` attribute syntax |
| `include/comments.js` | `//` line comments, `///` doc comments, `/* */` block comments |
| `include/helpers.js` | shared utilities: `commaSep1`, `commaSep`, `parameterList` |
| `include/prec.js` | all `PREC.*` operator precedence constants |

## Grammar Configuration

```js
supertypes: [$.expression, $.statement, $.pattern, $.type]
extras:     [/\s/, $.doc_comment, $.comment]   // whitespace and comments ignored everywhere
externals:  [$._BLOCK_COMMENT, $._string_start, $._string_content,
             $._interpolation_start, $._interpolation_end,
             $._string_end, $._raw_string_literal]
```

The external scanner (`src/scanner.c`) handles block comments and the string interpolation protocol, because these require stateful lexing that tree-sitter's declarative DSL cannot express.

## Reserved Keywords

```
for  if  else  match  let  var  const  true  false
import  module  as  pub  async  await  Self
stack  shared  weak  with  pure  gen  yield
fixed  unsafe  given  mut  ref  own  void
```

## Known GLR Conflicts

Several ambiguities are resolved at parse time via GLR (listed in the `conflicts:` array of `grammar.js`):

- `named_struct_literal` vs `_tuple_name` vs `_primary_expr` — `Point { ... }` could be a struct literal or an identifier followed by a block
- `_primary_expr` vs `data_pattern` — a capitalized name in expression vs pattern position
- `expression` vs `_math_operand` / `_bool_operand` / `_comparison_operand` — operator precedence lookahead conflicts

Note: there is no juxtaposition constructor application. Data values are built with
call syntax (`Some(42)`, `None`), which parses as a named `tuple_literal`; the Go
typechecker resolves a tuple-literal name that is a data constructor to its data
type. (The old `data_constructor_expr` rule and its `_constructor_value` machinery
were removed — they existed only to disambiguate `Some 42` in a terminator-less
grammar.)
- `for_loop` / `for_in_loop` with and without a label

## Operator Precedence (low → high)

| Group | Key constants | Approximate level |
|---|---|---|
| Block, type, given | `BLOCK=2`, `GIVEN=3` | lowest |
| Logical | `LOGICAL_OR=30`, `LOGICAL_AND=40` | low |
| Equality / relational | `EQUALITY=80`, `RELATIONAL=90` | medium-low |
| Arithmetic | `ADDITIVE=110`, `MULTIPLICATIVE=120` | medium |
| Unary | `UNARY=140` | medium-high |
| Match / with | `MATCH_EXPR=201`, `WITH_STATEMENT=200` | high |
| Await / yield-from | `AWAIT=250`, `YIELD_FROM=251` | higher |
| Postfix (call, `.`, `[]`) | `POSTFIX=300` | highest |

Full table is in `include/prec.js`.

## Corpus Test Format

Tests live in `test/corpus/**/*.txt`. Each file contains one or more tests separated by `===` / `---` delimiters:

```
==================
Test Name
==================

<lyra source code>

---

(program
  (expected_cst_node ...))
```

**Field name strictness:** if any child uses explicit field names (`field: (node)`), all named fields of that node must be specified. Omitting all field names is lenient. Do not add field names to `alias()` nodes — tree-sitter does not expose those in test output.

Add `:error` after the test name line to assert that the source produces a parse error:

```
=============
Bad Syntax
:error
=============
<invalid source>
---
(program ...)
```

## Corpus Test Organization

```
test/corpus/
  assignments.txt        let/var/const, math-assign ops
  comments.txt
  destructuring.txt
  math_operators.txt
  modules.txt
  expressions/
    array_comprehension.txt
    async_await.txt
    boolean.txt
    compose.txt
    generators.txt
    given.txt
    postfix.txt
    rec.txt
    string_concat.txt
    unsafe.txt
    yield_from.txt
    control_flow/        if, match, for, break, continue, return
  literals/
  statements/
  types/
    struct.txt           structs, generics, attributes (@packed, @align)
    data.txt             data (sum) types
    traits.txt           trait declarations and implementations
    tuple.txt            named tuples
    ...
```
