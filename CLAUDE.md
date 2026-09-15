# tree-sitter-lyra — Project Context

The tree-sitter grammar for Lyra. Produces `src/parser.c`, consumed via CGO by the sibling `lyra/` Go project.

This file records rules, not history: how a rule came about lives in `lyra/COMPLETED.md`, open work in `todo.md`.

## Commands

```bash
npx tree-sitter generate                      # regenerate src/parser.c
npx tree-sitter test                          # all corpus tests
npx tree-sitter test --include "Test Name"    # one test
npx tree-sitter generate --report-states-for-rule -   # per-rule state attribution
```

- **Always `generate` before `test`** after changing any grammar `.js` file.
- After regenerating, `lyra/` needs **`go clean -cache`** before `go test`, or Go serves the stale compiled parser.
- **Verify against the corpus and the Go suite, not generation warnings.** In the conflict-heavy regions below, tree-sitter reports load-bearing conflict entries as "unnecessary" (and vice versa).

## Layout

| Path | Handles |
|---|---|
| `include/expressions/` | expressions (math, boolean, postfix, lambdas, match, if, range, comprehensions, async/await, compose `->>`), string interpolation |
| `include/expressions/functions.js` | function/lambda definitions, guards |
| `include/types/` | `struct`, `data`, `tuple`, `newtype`, `union`, `type` aliases, traits, impls, generics, `where`, allocation modifiers |
| `include/statements/` | `let`/`var`/`const`, place assignment (`p.x`, `xs[i]`, `p.0`, `p^`), tuple assignment, compound assignment, `for`/`for-in`, `arena`/`with`, jumps, `extern` |
| `include/literals/` | struct, tuple, array literals; `numbers.js` (dec/`0x`/`0b`/`0o`, float), `regex.js`, `nullptr.js` |
| `include/patterns/` | patterns for `match` arms and `if let` |
| `include/destructuring/` | destructuring declarations |
| `include/modules/` | `module`, `import` |
| `include/attributes.js` | `@attr` / `@attr(args)` |
| `include/comments.js` | `//`, `///`, `//!`, `/* */` |
| `include/helpers.js` | `commaSep1`, `commaSep`, `memberList`, `statementList`, `parameterList`, `rangeBounds` |
| `include/prec.js` | all `PREC.*` constants |
| `src/parser.c` | generated — never edit by hand |
| `src/scanner.c` | external scanner: string interpolation, raw strings, block comments, statement terminator |
| `test/corpus/**/*.txt` | corpus tests |
| `queries/highlights.scm` | highlight queries (nvim capture names; WIP) |
| `queries/injections.scm` | `/* glsl */` raw string → GLSL |

```js
supertypes: [$.expression, $.statement, $.pattern, $.type]
extras:     [/\s/, $.doc_comment, $.inner_doc_comment, $.comment]
externals:  [$._BLOCK_COMMENT, $._string_start, $._string_content,
             $._interpolation_start, $._interpolation_end,
             $._string_end, $._raw_string_start, $._raw_string_content,
             $._raw_string_end, $._newline]
```

## Parser Size

`src/parser.c` is ~15 MB (~8,000 states). If it grows unexpectedly, run `--report-states-for-rule -` first.

- **Never stack independent `optional()` modifiers before a name or parameter list.** Seven stacked optionals in `lambda_expr` made 62,663 states / 116 MB (and broke `let x = 42`); `repeat1(choice(…))` (`fn_modifiers`) made it 6,475. Order and duplicates are the collector's to report (`lyra-E029`). The same applies to `extern`'s modifiers and to the `let` sugar.
- `parser.c` is ordinary tracked text, not Git LFS. Do not re-add the LFS filter without re-measuring.
- Juxtaposition (+19%) and bitwise operators (+1,576 states) are the expensive features. A token lexically disjoint from its neighbours, or a node added to `_primary_expr` only, is usually free.
- **If a `conflicts:` entry changes no state count and fixes no test, the ambiguity is lexical** — fix it with a token, not a conflict.

## Statement Terminators

A line break ends a statement; `;` is the explicit form. `statementList` (used by `block` and `program`) is a separated list with an optional trailing separator. Without it, `let b = a` ⏎ `-2`, `let f = add3` ⏎ `(4)` and `let n = xs` ⏎ `[1]` would each silently be one statement.

- **The scanner asks the parser.** `scan_newline` only runs where `valid_symbols[NEWLINE]` is set, i.e. where a terminator is grammatical — so trailing-operator continuation (`1 +` ⏎ `2`) needs no rule.
- **Continuation tokens** (a line starting with one continues the previous statement): `.`, `|`, `else`, `where`. **Rule: only a token that cannot begin a statement may be added.** `-`, `(`, `[`, `*` must never be.
- **Comments:** a trailing comment does not suppress its line's terminator; a whole-line comment (line or block) does not break a continuation (`data Dir =` / `North` / `/// doc` / `| South`). `scan_newline` skips whole-line comments without consuming them (returns false → tree-sitter re-lexes, so the comment remains an extra node the Go doc attachment needs). Both pinned in `test/corpus/comments.txt` — **keep both tests**.
- Known gap: a block comment holding the only newline (`a = 1 /*` ⏎ `*/ b = 2`) joins the statements.
- **`memberList`** (trait/impl methods) and struct *declaration* fields (`struct_type_body`, `anonymous_struct_type`) take `_statement_separator` too; commas still work, the list stays non-empty (`trait C { , }` is an error). Struct **literal** fields (`struct_fields`) still require commas — they sit inside the literal-vs-block conflict; changing that needs its own measurement.
- **Comment scanning is gated on `!in_string(scanner)` — do not remove.** Otherwise a string whose content chunk begins with `/*` (after the quote, after `${…}`, or after leading whitespace) lexes as a comment to the next `*/` in the file, silently. Interpolations (`CTX_INTERPOLATION`) are not "in string", so comments still work there. Pinned in `test/corpus/literals/string.txt`.

## Array Literal Flavor

`[…]` and `#[…]` (and `[v; n]` / `#[v; n]`) are the **same node kinds**, `array_literal` and `array_repeat_init`; the `#[` opener is one token exposed as the `fixed` field. The Go collector reads that field, and it is the whole of the flavor — dynamic vs fixed is never inferred.

- **Do not make fixed arrays a second node kind**: it would double every derivation path and every consumer's switch (`lyra/CLAUDE.md` rule 8).
- `# [1]` is an error, not a fixed array. The raw-string scanner also starts at `#`; it returns false without a backtick, so the internal lexer still sees `#[`.
- **The corpus cannot pin the flavor**: the 0.25 test runner compares named nodes only, so `#[1]` and `[1]` print the same tree. `test/corpus/literals/fixed_array.txt` pins that `#[` parses everywhere `[` does; the flavor is pinned in `lyra/`'s collector tests.

## Raw Strings

`raw_string_literal` is **three external tokens** — opener (`` #*` ``), `raw_string_content`, closer — so the content is a node an editor can inject into without the delimiters (Zed's injection queries cannot trim a node). Keep it that way; `lyra-zed-ext/languages/lyra/injections.scm` depends on the content node.

- The opener's `#` count lives in `Scanner.raw_hashes_plus_one` (serialized as one byte; more than 254 `#` is refused). While it is non-zero **the scanner emits nothing but content or the closer**, ahead of the newline and block-comment branches — otherwise a newline or `/*` inside the string lexes as a token.
- An empty raw string has no content node. Unterminated is an `ERROR`, not a string to EOF.
- A `/* glsl */` marker parses as a `comment` sibling of the literal, or of the `value` wrapping a call argument; `queries/injections.scm` matches both.

## Comment Tokens (`include/comments.js`)

```
/// x    doc_comment        prec 1   documents the declaration below
//! x    inner_doc_comment  prec 1   documents the module
//// …   comment            prec 2   divider, NOT documentation
// x     comment            prec 0
```

All share `//`, so they are decided by **token precedence, not match length**. The divider needs both halves: `doc_comment` refuses a fourth slash **and** `comment` bids prec 2 for it — otherwise `////////` becomes a doc comment or a syntax error. A bare `///` stays legal (paragraph break), so the no-fourth-slash rule applies only to a line with content. Pinned by `A divider rule is a comment, not a doc comment`.

## Reserved Keywords

```
for  if  else  match  let  var  const  readonly  true  false
import  module  as  pub  async  await  Self
stack  shared  weak  with  pure  det  noalloc  gen  rec  yield
fixed  unsafe  mut  ref  own  void
```

- **The `reserved` block enforces nothing**: `let with = 5` and `let yield = 5` parse. (`let unsafe = 5` is refused by `declaration`'s modifier-led arm; `let rec = 5` because `rec` is in `fn_modifiers`.) Adding a word to the list does nothing on its own.
- `type`, `extern` and `nullptr` are keywords only in their positions; `let type = 5` / `let extern = 5` parse and must keep parsing. `let nullptr = 5` parses too and is refused by the collector (`lyra-E070`).
- `pure`/`det`/`noalloc` are accepted on `lambda_expr`, `trait_method_implementation`, leading a `trait_method` name, and on `lambda_type`; `pure`+`det` exclusion is a checker rule (`lyra-E015`).

## Known GLR Conflicts

Listed in `grammar.js`'s `conflicts:` array:

- `named_struct_literal` / `_tuple_name` / `_primary_expr` — `Point { … }` literal vs name + block
- `_primary_expr` / `data_pattern` — capitalized name in expression vs pattern position
- `expression` / `_math_operand` / `_bool_operand` / `_comparison_operand` — precedence lookahead
- `result_expr` / `_primary_expr` — a struct literal in a comprehension result (generation *fails* without it)
- `for_loop` / `for_in_loop` with and without a label
- `pattern` / `_primary_expr` / `data_pattern` vs a name-leading `(…)`
- `_primary_expr` / `rest_pattern` — `[...xs, 1]` spread vs rest pattern, decided after the list
- `_primary_expr` vs `literal_pattern`, `_signed_number_literal`, `_negated_number_literal` — `('a', 'b')`, `(1, 2)`, `(-1, 2)` as lambda params vs tuple
- `expression` / `_signed_number_literal` and `_math_operand` / `_negated_number_literal` — signed pattern literals
- entries for `|` as struct-update separator (`Player { base | f: v }`) and both comprehension uses; only the token after `|` decides

Entries generation calls "unnecessary" here are left in place deliberately.

### A name-leading `(…)` has three readings

`(a, b)`, `(a)`, `(None, 7)` may each begin a lambda parameter list, an anonymous tuple, or a parenthesized expression; `=>` decides. Both are required, or name-leading tuple literals break:

1. the `[pattern, _primary_expr]`, `[pattern, for_loop, for_in_loop]` and `[_primary_expr, data_pattern]` entries, **and**
2. the **bare-name alternative of `pattern`/`data_pattern` sits outside** `prec.left(PREC.PATTERN)` / `prec.left(PREC.DATA_PATTERN)`, or precedence resolves toward the pattern statically. A payload-bearing `data_pattern` (`Some(x)`) keeps `PREC.DATA_PATTERN`.

`tuple_pattern` is **anonymous-only**; a leading name on it outbids the expression reading and makes `(f(7), 1)` a syntax error.

### A struct literal is a postfix head

`named_struct_literal` is in `_primary_expr`, so `Node { n: 7 }.n` parses. Lyra needs no "no struct literal in an `if` header" rule: GLR keeps both readings and **the brace's contents decide** (`{ n: 7 }` fields → literal, `{ 1 }` statement → block). This works only because `named_struct_literal` is a choice of two alternatives with different precedence kinds:

- **With generic args** (`Point::<f64> { … }`) the rival is `_tuple_name`; static `prec`, with `PREC.TUPLE_NAME == PREC.STRUCT_LITERAL` on purpose so `{` vs `(` decides.
- **Without** the rival is name + block (`if Point { 1 }`); this alternative uses `prec.dynamic`.

Don't: wrap the whole rule in `prec.left` (breaks `if Point { 1 } else { 0 }`), make the whole rule dynamic (breaks `Point::<f64> { … }`), or make `_tuple_name` dynamic (breaks `(f(7), 1)`). Pinned by `A Name Followed by a Non-Struct Block Is a Block` and its twin (literals/struct.txt).

**Empty body `Person {}` is for the named form only** (`_literal_struct_body`, aliased to `struct_body` with no `struct_fields` child — the Go collector must nil-guard). An empty *anonymous* literal would be textually identical to an empty block. `if ready {}` still reads as condition + block since the literal reading leaves no body.

### `::` is settled in the lexer

`trait_method_path` (`T::method`) and turbofish both start `T ::`; static resolution commits before `<` vs identifier is visible. **`"::<"` is one atomic token — keep it combined.**

## Postfix Heads and the One-Derivation Rule

> **A node kind must have exactly one derivation path.** `expression` reaches `_literal` directly and `_postfix_expr` (→ `_primary_expr`); a kind in both is an unresolved reduce-reduce at every operand position.

- **`tuple_literal` is in both `_literal` and `_primary_expr`** (so `Some(1).unwrap_or(0)` parses) — a real double derivation carried by conflict entries, the same exception as `named_struct_literal`. Consequently it must **not** be listed in `_math_operand`, which reaches it via `_postfix_expr`.
- **Stay in `_literal` only:** `anonymous_struct_literal` (a bare `{` contests the block) and `regex_literal` (removing it from `_literal` leaves it reachable only as a constructor operand, and `let phone = r"…"` misparses).
- **In `_primary_expr` only:** `array_literal`, `array_repeat_init`, `array_comp_expr`, `nullptr`, `group`. When a kind needs to become a head, **move** it rather than adding a second path (a move often shrinks the parser).
- **`group` (`(x + y)`) is in `_primary_expr`, not `_math_expr`.** `(x)` is `parenthesized_expr`, a different node.
- Operand rules must not list a literal *and* `_postfix_expr` that already reaches it: `_string_concat_operand`, `_math_operand`, `_not_operand`, `_bool_operand`, `_comparison_operand`.
- `prec.right(PREC.LITERAL)` on `_literal` is what makes a plain literal outrank juxtaposition.
- **Standing regression: `0 - 200` must be a `binary_expr` with `sub_operator`**, not `0` + dangling `negation(-200)`. Pinned by corpus and a `lyra` execution test.

Corpus guards: `A comprehension is a postfix head` (expressions/array_comprehension.txt); `A literal is a postfix head`, `Literal heads do not disturb the readings they contest`, `A constructor call is a postfix head`, `A constructor head does not disturb the readings it contests` (expressions/postfix.txt); `A parenthesized expression is a postfix head`, `A constructor call is a math operand` (math_operators.txt). The constructor-head test pins `Some(42)` → `tuple_literal`, `Some 42` → `data_constructor_expr`, `Cents(150) + Cents(275)` → `binary_expr`, `(Some(x): Maybe<i64>) -> i64` → lambda with `data_pattern` parameter.

## Juxtaposition (`data_constructor_expr`)

`Some 42` is `data_constructor_expr`, `Some(42)` a named `tuple_literal`; the collector erases the difference. Depends on the statement terminator (else a nullary constructor eats the next statement). Costs +19% states — run `--report-states-for-rule -` before adding anything here.

- **One operand, never curried** — no `Rect 3 4`. Parenthesized operands are outside `_constructor_value` so `Rect(3, 4)` stays a named `tuple_literal`.
- **`Some -1` is `Some(-1)`**: a PascalCase name in expression position is always a constructor (`identifier` is lowercase-leading, `const_identifier` SCREAMING_CASE), so no subtraction reading exists. `MAX - 1` is arithmetic.
- **The operand must be atomic** (literal, name, nullary constructor, negated literal, struct/array literal, another application). Admitting any postfix form (`call_expr`, `member_expr`, …) reaches `parenthesized_expr` and breaks `(Some(x): Maybe<i64>) -> i64`; no conflict entry fixes it.
- `[_tuple_name, _primary_expr, data_pattern]` is load-bearing for the parameter case even if generation calls it unnecessary.

## All-Caps Names in Patterns

- `const_identifier` and `user_defined_type_name` lex `LOUD` identically, and the lexer picks the constant wherever one is legal. A range bound may be a `const`, so `data_pattern` admits a `const_identifier` constructor too, **payload parenthesized only** (`CD(x)`, not `CD x`) so `LOW ..<5` cannot read as a constructor applied to a range.
- `_constant_bound` is a rule of its own, with conflicts against `_primary_expr` and `_constructor_value`: a bare token would be shifted on `..`, silently dropping the `(LOW..<HIGH)` expression reading.
- Corpus guards (expressions/control_flow/match.txt): `A range pattern may be bounded by a const`, `An all-caps constructor pattern, bare or with a parenthesized payload`, `A parenthesized range of consts is still an expression`.

## Function-Definition Sugar (`declaration`, `include/statements/assignments.js`)

```lyra
let add = pure (a: i32, b: i32) -> i32 => a + b   // explicit lambda
let add(a: i32, b: i32) -> i32 => a + b            // sugar: params on the name, no `=`
let pure add(a: i32, b: i32) -> i32 => a + b       // sugar with leading modifiers
```

All produce `VarDeclStmt{Value: LambdaExpr}`. Three arms: modifier-led function (collector's `applyFunctionModifiers` lifts flags), plain identifier binding (value, sugar, or value-less `let x: T`), pattern binding. Invariants — **do not weaken**:

- **A `where` clause requires a value, and the modifier-led arm requires its lambda**, else `let f<n> where n: Ord` swallows a following `(…) => …` as a separate statement. Pinned by `Where clause without a value` and `Leading modifier on a non-function` (`:error`).
- **`fn_modifiers` is one `repeat1(choice(...))`**, not stacked optionals (see Parser Size).

## Operator Precedence (`include/prec.js`)

`BLOCK`/`TYPE`=2 < `LOGICAL_OR`=30 < `LOGICAL_AND`=40 < `EQUALITY`=80 < `RELATIONAL`=90 < `BITWISE_OR`=100 < `BITWISE_XOR`=102 < `BITWISE_AND`=104 < `ADDITIVE`=110 < `SHIFT`=115 < `MULTIPLICATIVE`=120 < `UNARY`=140 < `WITH_STATEMENT`=200 < `MATCH_EXPR`=201 < `AWAIT`=250 < `YIELD_FROM`=251 < `POSTFIX`=300.

**A precedence does not bound an operand.** `!` at `PREC.UNARY` still grouped `!a && b` as `!(a && b)` while its operand was `$.expression`. Its operand is `_not_operand` (literals, `_postfix_expr`, nested `!` aliased to `boolean_expr`).

### Bitwise (`include/expressions/math.js`)

- **Xor is `~`, not `^`** — `^` is pointer type and postfix deref (`ptr^ ^ mask`). Prefix `~` is complement, told apart by position.
- Bitwise binds tighter than comparison, looser than arithmetic; shifts (115) above addition; `&` > `~` > `|`.
- **In a comprehension a top-level `|` is a section separator** — `[ x in R | A | B ]` has two complete parses, resolved by `prec.dynamic` toward guard `A`, result `B` (a `conflicts:` entry cannot settle complete-tree ambiguity). Getting it wrong silently turns guards into bitwise-ors. Parenthesize a value `a | b`.
- `>>` does not break `Maybe<Result<i64, string>>`: it is not a valid token where a type argument list closes.
- Corpus: `test/corpus/bitwise_operators.txt`.

## Signed Literals in Patterns (`_signed_number_literal`, `include/patterns/index.js`)

`-1 => …`, `-128..<=127 => …`, used by `literal_pattern` and `range_pattern`. Without it an `ERROR` swallows the match and downstream sees nothing wrong.
- **The sign is not in the token** — `a-1` would lex as `a`, `-1`.
- **Named rule, then aliased** (`alias($._negated_number_literal, $.negation)`) — an inline `alias(seq(…))` hoists `operator`/`operand` onto `range_pattern`, displacing `start`/`end`.
- Aliased to the existing `negation` so the collector's `CollectExpr` handles it. After touching it, recheck `0 - 200`.

## Ranges (`rangeBounds`, `include/helpers.js`)

One shape for expression (`0..<n`, `0..<=10:2`), pattern (`0..<=9`) and `newtype` constraint (`range(0..<=100)`). Only two axes are parameters:
- **Operand:** pattern = literal, constraint = constant expression, expression = anything.
- **Open-endedness:** patterns and constraints may be open (`10..`, `range(0..)`); `range_expr` is closed. Both-bounds-absent is refused structurally (`open` is a `choice`, not two optionals).
- **`range_end_operator` is its own node** (highlight queries must capture it) — optional in the grammar at all three sites, required by the collector (`lyra-E032`).
- **Grammar vs collector:** refuse in the collector when the form has a plausible meaning to disambiguate (`0..9`); in the grammar when it has none (bare `..`).
- **A recovered parse is not an absent bound:** `range(..)` yields a zero-width inserted `decimal_int`; Go treats missing-or-empty as absent (`collector_ctx.RangeBound`).
- Corpus: open-ended tests in `expressions/control_flow/match.txt`, `types/newtype.txt`; `:error` for bare `..`.

## `for` Condition (`include/statements/control_flow/for_loop.js`)
The condition is `$._bool_operand` (`boolean_expr`, literal, `_postfix_expr`). **`$.expression` does not generate**: a `block` is an expression, so `for { … }` becomes condition-without-body vs body-without-condition. No `for_condition_expr` alias — bool-ness is the typechecker's.

## Regex Literals (`include/literals/regex.js`)

`r"…"` as one `token(prec(1, …))` outranking identifier `r` (slash delimiters are lexically undecidable: `r/2 + a/b`).
- **Depends on: a `"` never follows a lowercase `identifier` in valid Lyra.** Juxtaposition allows it only after uppercase names. **If juxtaposition is extended to lowercase names, this breaks.**
- Newlines are excluded from content, so an unterminated literal is a loud error. Delimiter escapes as `\"`.
- Not unused: backs `pattern(r"…")` in `include/types/constrained_type.js` and `regex_pattern` in match arms.

## Foreign Functions (`include/statements/extern_declaration.js`)

```lyra
extern getpid: () -> i32
@link("m")
unsafe extern pure log: (f64) -> f64
unsafe extern printf: (^u8, ...) -> i32
```

- `unsafe` before `extern`, `fn_modifiers` after, then `trait_method`'s shape. The grammar over-admits (order, `async`/`gen`/`rec`, `unsafe` after `extern`); the collector reports.
- `lambda_type` is aliased to `extern_signature`.
- **`...` is a member of `parameter_type_list`**, admitted in every function type and refused outside an extern by the collector (`lyra-E065`, including position rules). Don't give extern its own signature rule — it would drift from `lambda_type`.
- **Parameter names** (`dest: ^mut u8`): **name + colon is one token** (`parameter_type_name`), because a lowercase name in type position is a type variable — a lexical collision a `conflicts:` entry cannot resolve. Whitespace is inside the token (`n : i64` parses). Required in an extern, refused elsewhere (`lyra-E067`).

## Attributes

`attribute_args` = `_number_literal | user_defined_type_name | string_literal | identifier`.
- `string_literal` is plain (no interpolation) — for foreign text taken verbatim (`@link`, `@symbol`).
- `identifier` is for names in Lyra's namespace (`@must_release(unload_sound)`); free because it is lexically disjoint from type names.
- A **`module` declaration** takes attributes (`@link("SDL3")` above `module`); the grammar admits any, the collector refuses all but `@link`.

## Other Forms and Their Pins

- **`nullptr`** (`include/literals/nullptr.js`): plain string token, wins over identifier on equal length (`PREC.IDENTIFIER_TOKEN` is 0). In `_primary_expr` only. In name position it lexes as an identifier. Highlighted `@constant.builtin` (nvim) / `@constant` (Zed). Corpus: `null pointer` tests in `expressions/unsafe.txt`.
- **`union`** (`include/types/union_type.js`): body reuses `struct_member` (don't add a second member rule); `union_type_body` is its own rule since the collector reads bodies by node kind. `readonly`/defaults refused by collector (`lyra-E072`). Corpus: `types/union.txt` (empty body is `:error`).
- **`unsafe { … }` is a `_comparison_operand`** (`unsafe { f() } != 0`).
- **`const_identifier` is an `importable_name`** (`import lib.{ INIT_VIDEO }`). All-caps no-underscore names (`MAX`, `PI`, `HM`) tie with type names and are settled by token precedence, lexing as `const_identifier`.
- **Trait body optional** (`trait Arithmetic: Add + Sub`). The method list is absent, never empty. `trait Marker` ⏎ `{ 1 }` is a trait plus block — pinned by `A brace on the next line is not a trait body`.
- **Generic `newtype`**: `constrained_type` has the `generic_parameters` field. Beware a regenerated Go golden baking in an ERROR-truncated parse.
- **`let _ = expr`**: `wildcard_pattern` is in `destructuring_only_pattern`. `_` is not an expression.
- **`for _ in …` / `for _, v in …`**: `_` is admitted inside the existing alias `alias(choice($.identifier, '_'), $.for_variable_or_key)`, keeping the CST shape.
- **Bare jump in a match arm**: `match_arm` body is `choice($.expression, $._arm_jump)`; the collector erases it into a one-statement block — keep it confined to those two places.
- **Array element modifiers** (`include/types/allocation.js`): `[]shared Node` via `_element_type` = `_non_allocated_type | allocated_type | weak_type`, used only by `array_type`. Exactly one modifier deep; `weak_type`'s and `allocated_type`'s operands stay `_non_allocated_type` (no `shared weak T`). Not `$.type` (would admit `[]void`). Corpus: `types/allocation.txt`.
- **Effect modifiers on a function type** (`include/types/lambda_type.js`): `f: pure () -> t`, labelled fields `is_pure`/`is_det`/`is_noalloc`, reusing existing node kinds.
- **`type` alias vs `newtype`**: `type Op = …` (`include/types/type_alias.js`) is transparent; `newtype` (`include/types/constrained_type.js`) is nominal and carries `where` constraints. Corpus: `types/type_alias.txt`.

## Field Labels and Corpus Tests

- **If a collector needs to find a child, label it.** Reading an unlabelled child by field name returns nil silently. `visibility` (`pub`) is `optional(field("visibility", $.visibility))` on every declaration that accepts it.
- Corpus format: `===` name `===`, source, `---`, expected S-expression CST. `:error` after the name line asserts a parse error.
- **Field strictness:** if any child uses a field name, all named fields of that node must be given; omitting all is lenient. Don't add field names to `alias()` nodes — they aren't shown.
- Files: top-level `*.txt` plus `expressions/` (incl. `control_flow/`), `functions/`, `literals/`, `statements/`, `types/`.
