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
for  if  else  match  let  var  const  readonly  true  false
import  module  as  pub  async  await  Self
stack  shared  weak  with  pure  det  noalloc  gen  rec  yield
fixed  unsafe  given  mut  ref  own  void
```

(`rec` was reserved 07/08/26 so it can lead a function-definition binding's name
— see Function-Definition Sugar. It is one of the seven `fn_modifiers`.)

Effect bounds on functions/methods: `pure` (no observable effect), `det`
(deterministic — permits mutation/allocation, forbids ambient rand/time/io),
and `noalloc` (heap-allocation-free, orthogonal — stacks with any purity rung).
All three are `optional(field(...))` modifiers in `lambda_expr`,
`trait_method_implementation`, and — leading the name — a `trait_method`
*declaration* (`trait Show { pure show: (Self) -> string }`, a contract every
impl must satisfy); `det`/`noalloc` mirror `pure`. Mutual exclusion
of `pure`/`det` is a checker rule, not a grammar one (`checker/effect_bounds.go`,
`lyra-E015`, landed 07/08/26 along with AST collection). `det`/`noalloc`
*enforcement* landed too (`purity.go` `checkBoundedEffects`, `lyra-E016`); only
`Rand`/`Time` detection remains (see `lyra/todo.md` FP/Imperative #5).

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

**Lexer-level disambiguation, not GLR (added 06/24/26):** `trait_method_path` (`TraitName::method`, the fully-qualified trait-method-call form, `include/expressions/postfix.js`) and turbofish generic args (`generic_arguments`, `include/types/generic_type.js`) both start with `TypeName ::`. This is *not* resolvable via `conflicts:`/precedence — tree-sitter's static shift/reduce resolution commits to one production before either's deciding token (`<` vs an identifier) is visible, regardless of which side wins the precedence comparison. The actual fix: `generic_arguments` uses `"::<"` as one atomic string token instead of `"::"` then `"<"`, so ordinary lexer maximal-munch picks the right token before the parser ever has to choose. If you touch either rule, keep the combined token — splitting it back into two literals reintroduces the ambiguity (confirmed by deliberately reverting it during development: tuple/struct-literal turbofish broke, with or without explicit `conflicts:` entries).

## Function-Definition Sugar (`declaration`, `include/statements/assignments.js`)

A function is a `let`/`var` binding whose value is a `lambda_expr`. Three spellings:

```lyra
let add = pure (a: i32, b: i32) -> i32 => a + b   // explicit: value is a lambda (modifiers inside it)
let add(a: i32, b: i32) -> i32 => a + b            // ML-style sugar: params attach to the name, no `=`
let pure add(a: i32, b: i32) -> i32 => a + b       // sugar with modifiers leading the name
```

All three produce an identical binding (`VarDeclStmt{Value: LambdaExpr}`).
`declaration` has THREE identifier arms (see the rule's comments):

1. **Modifier-led function** — `let <fn_modifiers> name [<generics>] [where …] <lambda>`.
   Entered as soon as a modifier follows the keyword; the lambda `value` is
   **required**. The collector (`declarations/var_decl.go` `applyFunctionModifiers`)
   lifts the modifier flags off the declaration's `modifiers` field onto the
   collected `LambdaExpr`, so `let pure add(…)` ≡ `let add = pure (…)`.
2. **Plain identifier binding** — `= <expression>`, or the modifier-less lambda
   sugar (`let add(…) => …`) stored in the same `value` field, or a value-less
   `let x` / `let x: T`.
3. **Pattern (destructuring) binding.**

Two invariants that keep the parse unambiguous — **do not weaken either**:

- **A `where` clause REQUIRES a value**, and **the modifier-led arm REQUIRES its
  lambda.** Both exist for the same reason: a value-less `let f<n> where n: Ord`
  (or `let pure add`) would be a complete statement that swallows a following
  `(…) => …` as a *separate* bare-lambda statement instead of the sugar. Enforced
  by the `Where clause without a value` and `Leading modifier on a non-function`
  `:error` corpus tests (`let pure x = 42` does not parse).
- **`fn_modifiers` is ONE `repeat1(choice(...))` rule, not seven separate
  `optional(field(...))` fields** before the name. Seven stacked optionals ahead
  of a generic `<` doubled the (already ~120 MB) `parser.c` to ~247 MB and broke
  correctness (even `let x = 42` mis-parsed). The single rule keeps the size at
  baseline. Order and duplicates are validated in the collector
  (`applyFunctionModifiers`), not the grammar, so `let async pure f(…)` parses
  but is reported. `rec` had to be reserved (it is one of the seven modifiers);
  `let rec = 5` / `foo(rec)` (rec as an identifier) no longer parse.

Note: this grammar's `parser.c` is inherently ~120 MB and takes ~60 s to
`generate` (its large GLR-conflict set), so budget for that on any grammar edit.

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
