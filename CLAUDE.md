# tree-sitter-lyra — Project Context

This is the tree-sitter grammar for the Lyra programming language. It produces a C parser (`src/parser.c`) consumed via CGO by the sibling `lyra/` Go project.

**This file records rules, not history.** Each section says what holds today and what breaks if it is changed; the dated account of how a rule came about lives in `lyra/COMPLETED.md`, and open work in `todo.md`.

## Key Files

```
grammar.js               — entry point; spreads all rule modules
include/                 — grammar rule modules (see Architecture below)
src/parser.c             — generated; do not edit by hand
src/scanner.c            — hand-written external scanner (string interpolation, block
                           comments, the statement terminator)
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

**Verify a grammar change against the corpus, not against generation warnings**, and run the sibling Go suite too. In the conflict-heavy regions below, tree-sitter has reported load-bearing conflict entries as "unnecessary" and vice versa, and at least one breakage was caught only by the Go suite.

## Architecture

`grammar.js` imports and spreads rule modules from `include/`:

| Module path | Handles |
|---|---|
| `include/expressions/` | all expressions (math, boolean, postfix, lambdas, match, if, range, array comprehensions, async/await, compose `->>`), string interpolation |
| `include/expressions/functions.js` | function/lambda definitions, guards |
| `include/types/` | `struct`, `data`, `tuple`, `newtype`, `type` aliases, trait declarations, trait implementations, generics, `where` clauses, allocation modifiers |
| `include/statements/` | assignments (`let`/`var`/`const`), math-assign ops (`+=`, etc.), `for`, `for-in`, `arena`/`with`, `return`/`break`/`continue` |
| `include/literals/` | struct literals, tuple literals, array literals |
| `include/literals/numbers.js` | integer (decimal, hex `0x`, binary `0b`, octal `0o`), float |
| `include/patterns/` | destructuring patterns used in `match` arms and `if let` |
| `include/destructuring/` | destructuring declarations (`let {x, y} = ...`) |
| `include/modules/` | `module` declarations, `import` statements |
| `include/attributes.js` | `@attr` / `@attr(args)` attribute syntax |
| `include/comments.js` | `//` line comments, `///` doc comments, `//!` inner doc comments, `/* */` block comments |
| `include/helpers.js` | shared utilities: `commaSep1`, `commaSep`, `memberList`, `statementList`, `parameterList`, `rangeBounds` |
| `include/prec.js` | all `PREC.*` operator precedence constants |

## Grammar Configuration

```js
supertypes: [$.expression, $.statement, $.pattern, $.type]
extras:     [/\s/, $.doc_comment, $.inner_doc_comment, $.comment]   // whitespace and comments ignored everywhere
externals:  [$._BLOCK_COMMENT, $._string_start, $._string_content,
             $._interpolation_start, $._interpolation_end,
             $._string_end, $._raw_string_literal, $._newline]
```

The external scanner (`src/scanner.c`) handles block comments, the string interpolation protocol, and the statement terminator, because these require stateful or context-sensitive lexing that tree-sitter's declarative DSL cannot express.

## Statement Terminators

**A line break ends a statement; `;` is the explicit form** for putting several on one line. Statements are a separated list (`statementList` in `include/helpers.js`, used by `block` and `program`), with the separator after the last one optional.

Without a terminator the parser is maximally greedy and a line break means nothing, so all three of these are *one* statement (`a - 2`, `add3(4)`, `xs[1]`) with no diagnostic:

```
let b = a          let f = add3        let n = xs
-2                 (4)                 [1]
```

**The scanner asks the parser, not a token table.** `scan_newline` only runs where `valid_symbols[NEWLINE]` is set, and tree-sitter sets it exactly in states where the grammar accepts a terminator. So a newline inside an unfinished expression never reaches the scanner, and trailing-operator continuation (`let a = 1 +` ⏎ `2`) works with no rule of its own. Go needs its list of "tokens that may end a statement" because its insertion happens in the lexer, where there is no parse state to consult.

What the scanner *does* decide is the forward half — a line beginning with something that continues the previous statement. **The rule for what may go on that list: a token that cannot begin a statement.** That is what makes suppression safe; if a line could not have been a new statement, treating it as a continuation cannot hide a misparse. Currently `.` (method chains), `|` (leading-bar `data` declarations), and the keywords `else` and `where`. Deliberately **not** on it: `-`, `(`, `[`, `*` — each can start a statement, and treating them as continuations is the exact bug above.

**A trailing comment does not suppress its line's terminator; a comment on a line of its own does not break a continuation.** `a = 1 // note` reaches `scan_newline` with no newline seen yet, so it returns early and tree-sitter's lexer takes the comment as an extra. `scan_newline` skips whole-line comments (line and block) before testing for a continuation, which is what keeps this parsing:

```lyra
data Dir =
  North
  /// Towards the bottom of the map.
  | South
```

Skipping is safe because nothing is consumed for real: on a continuation the function returns false and tree-sitter re-lexes from the token start, so the comment still becomes an ordinary extra node — which the Go side's doc-comment attachment depends on. On a terminator, `mark_end` has already fixed the token's end before the comment. Pinned by `A comment on its own line does not break a continuation` and its trailing-comment twin in `test/corpus/comments.txt`; **keep both**, since the fix and the thing it must not break are one line apart in the scanner.

Known gap: a *block* comment holding the only newline (`a = 1 /*` ⏎ `*/ b = 2`) joins the two statements.

**Member lists take the same terminator** (`memberList`, `include/helpers.js`), so a trait's and an impl's methods may be written one per line as well as comma-separated. The separator is `_statement_separator` rather than a bare `_newline`, so `;` works here too. Commas keep working, including mixed with newlines and as a trailing separator, and the list itself stays non-empty — `trait C { , }` is a syntax error. A signature wrapped across lines is unaffected, for the reason the scanner section gives.

**A struct declaration's fields take it too** (`struct_type_body`, `anonymous_struct_type`). A struct **literal**'s fields deliberately still require commas (`struct_fields`, `include/literals/struct.js`): that list sits inside the literal-vs-block ambiguity the conflict notes below describe, so a newline separator there is a question about that conflict rather than the same one-word change. It wants its own measurement, not this reflex.

**Comment scanning is gated on `!in_string(scanner)` — do not remove that guard.** Comments are `extras`, so `BLOCK_COMMENT` is valid almost everywhere, including at every string content-chunk boundary, and the comment branch runs *before* the in-string branch. Unguarded, a string whose content began with `/*` lexed as a comment running to the next `*/` **anywhere later in the file**, and no later pass reported anything (`lyrac check` exited 0). It fires wherever a fresh content chunk starts: after the opening quote, right after a `${…}` interpolation, and — since `scan_block_comment` skips leading whitespace as token padding — after a leading space. An *interpolation* is an expression context where comments remain valid, and `in_string()` is false for `CTX_INTERPOLATION`, which is exactly the line this guard draws. Coverage: the comment-delimiter tests in `test/corpus/literals/string.txt`.

## Three Comment Tokens, Settled by Token Precedence (`include/comments.js`)

```
/// x    doc_comment        prec 1   documents the declaration below it
//! x    inner_doc_comment  prec 1   documents the module the file belongs to
//// …   comment            prec 2   a divider rule, deliberately NOT documentation
// x     comment            prec 0
```

All four share the `//` prefix, so **every one is decided by explicit token precedence, not by match length** — tree-sitter compares precedence first, which is the only reason `/// x` is not simply eaten by the longer `comment` match. Both doc tokens are in `extras` so they may appear anywhere; `//!` has to reach the top of a file, above the `module` line.

**The divider needs the highest precedence of the four, and that is the subtle one.** Precedence outranking length cuts the wrong way for `////////`: `doc_comment` matches its first three characters at prec 1 and beats the whole-line `comment` at prec 0, so a rule line above a declaration silently becomes its documentation — or, once the remaining `/////` fails to lex, a syntax error pointing at a comment. Making `doc_comment` refuse a fourth slash is **not enough on its own**, for the same reason: the shorter high-precedence token still wins unless something outbids it. Both halves are needed — `doc_comment` excludes the fourth slash, and `comment` bids `prec(2)` for it.

A bare `///` with nothing after it stays legal (it separates paragraphs inside a doc block), so the no-fourth-slash rule is a `choice` applying only to a line with content.

Corpus: the four doc-comment tests in `test/corpus/comments.txt`, including `A divider rule is a comment, not a doc comment`, which inverts if the precedences are disturbed.

## Regex Literals (`include/literals/regex.js`)

A regex literal is **`r"…"`** — the `r` sigil plus *string* delimiters — as one `token(prec(1, …))` that outranks the bare identifier `r`.

Slash delimiters (`r/…/`) cannot be disambiguated lexically: `r` is an ordinary identifier and `/` is division, so `let ratio = r/2 + a/b` lexes as a regex followed by a stray `b`, silently. The deciding context is arbitrarily far right and a regex may legally contain spaces, digits and operators, so no heuristic on the content separates the readings.

**The property this depends on:** a `"` cannot follow a **lowercase** `identifier` in any valid Lyra expression, so `r"` can only begin a regex and `r/2` is unambiguously division. Juxtaposition means a `"` *can* follow an **uppercase** name (`Some "hi"`), but `identifier` is lowercase-leading by lexer rule and a constructor name is not. **If juxtaposition is ever extended to lowercase names, this rationale dies with it.** Newlines stay excluded from the content classes, so an unterminated literal degrades to an identifier plus an unterminated string — a loud parse error — instead of consuming the file. The delimiter escapes as `\"`.

Don't delete the rule as "unused": it backs `pattern(r"…")` constraints on `newtype` (`include/types/constrained_type.js`) and `regex_pattern` in match arms, and the constraint path is implemented downstream (`lyra/pkg/regex` is a full DFA engine). Only the match-arm *pattern* form is unlowered in the backend.

## Reserved Keywords

```
for  if  else  match  let  var  const  readonly  true  false
import  module  as  pub  async  await  Self
stack  shared  weak  with  pure  det  noalloc  gen  rec  yield
fixed  unsafe  mut  ref  own  void
```

`rec` is reserved so it can lead a function-definition binding's name — it is one of the seven `fn_modifiers`, so `let rec = 5` and `foo(rec)` do not parse.

Effect bounds on functions/methods: `pure` (no observable effect), `det` (deterministic — permits mutation/allocation, forbids ambient rand/time/io), and `noalloc` (heap-allocation-free, orthogonal — stacks with any purity rung). All three are `optional(field(...))` modifiers in `lambda_expr`, `trait_method_implementation`, and — leading the name — a `trait_method` *declaration* (`trait Show { pure show: (Self) -> string }`, a contract every impl must satisfy). Mutual exclusion of `pure`/`det` is a checker rule, not a grammar one (`checker/effect_bounds.go`, `lyra-E015`).

## Known GLR Conflicts

Several ambiguities are resolved at parse time via GLR (listed in the `conflicts:` array of `grammar.js`):

- `named_struct_literal` vs `_tuple_name` vs `_primary_expr` — `Point { ... }` could be a struct literal or an identifier followed by a block
- `_primary_expr` vs `data_pattern` — a capitalized name in expression vs pattern position
- `expression` vs `_math_operand` / `_bool_operand` / `_comparison_operand` — operator precedence lookahead conflicts
- `result_expr` vs `_primary_expr` — inside an array comprehension, `[ Node { n: x } for x in xs ]`'s literal is both the result and a primary expression
- `for_loop` / `for_in_loop` with and without a label
- `pattern` / `_primary_expr` / `data_pattern` vs a name-leading `(…)`

### A name-leading `(…)` has three readings

`(a, b)`, `(a)` and `(None, 7)` can each begin a **lambda parameter list** (`(a, b) => …`), an **anonymous tuple**, or a **parenthesized expression**. A bare `identifier` is both a `pattern` and a `_primary_expr`; a bare capitalized name is both a nullary `data_pattern` and a `_primary_expr`. GLR must keep both alive until `=>` (or its absence) decides. Two pieces are required, and dropping either breaks name-leading tuple literals entirely:

1. the `[pattern, _primary_expr]`, `[pattern, for_loop, for_in_loop]` and `[_primary_expr, data_pattern]` conflict entries, **and**
2. `pattern`/`data_pattern` restructured so the **bare-name alternative sits outside** `prec.left(PREC.PATTERN)` / `prec.left(PREC.DATA_PATTERN)` — otherwise the higher pattern precedence silently resolves the reduce-reduce toward the pattern and the conflict entry is reported "unnecessary". A payload-bearing `data_pattern` (`Some(x)`) keeps `PREC.DATA_PATTERN`, since it must still beat the constructor-call expression reading.

`tuple_pattern` is **anonymous-only** — it must not carry a leading name. It once did, aliased from `$.identifier`, which no legal program could use (a named tuple type is PascalCase, `identifier` is lowercase-leading) but which outbid the expression reading of the same tokens, so **a call could not be the first thing inside parentheses**: `(f(7))`, `(f(7), 1)` and `((f(7)), 1)` were syntax errors while `(1, f(7))` was fine.

### A struct literal is a postfix head

`Node { n: 7 }.n`, `Node { n: 7 }.a()` and `Grid { cells: […] }.cells[0]` parse — `named_struct_literal` is in `_primary_expr` (`include/expressions/postfix.js`), the head of every postfix form. It needs the `[$.result_expr, $._primary_expr]` conflict entry; generation *fails* without it, so it is not the unreliable "unnecessary conflict" kind.

**Lyra needs no "no struct literal in an `if` header" rule**, which both Rust and Go impose. There the `{` of `if Node { n: 7 }.n > 0 {` cannot be told from the body's opening brace. Here GLR keeps both readings alive and **the brace's contents decide**: `{ n: 7 }` holds fields, so it is a struct body; `{ 1 }` holds a statement, so it is a block.

**That only works because `named_struct_literal` is a choice of two alternatives with different precedence *kinds*.** The name is contested by two rivals wanting opposite resolutions:

- **With generic arguments** (`Point::<f64> { … }`) the rival is `_tuple_name` (`Point::<f64>(…)`). That contest is settled by the *static* precedence the two share — `PREC.TUPLE_NAME` and `PREC.STRUCT_LITERAL` are equal on purpose so neither wins outright and GLR decides on `{` vs `(`. This alternative keeps `prec`.
- **Without them** the rival is the bare-name reading (`if Point { 1 }`). This alternative takes `prec.dynamic`, so it is not statically resolved and GLR settles it, with three declared conflicts.

A single `prec.left(PREC.STRUCT_LITERAL)` over the whole rule resolves the decision statically toward the struct, and `if Point { 1 } else { 0 }` becomes a syntax error; a conflict entry cannot fix that, because while the precedence is there the decision never becomes a conflict. Two dead ends not to repeat: putting the whole rule on `prec.dynamic` breaks the first contest (`Point::<f64> { … }` stops parsing), and making `_tuple_name` dynamic to match breaks parenthesized forms far afield, down to `(f(7), 1)` — its static precedence is load-bearing.

Corpus: `A Name Followed by a Non-Struct Block Is a Block` and its type-name twin (literals/struct.txt) pin the reading a careless change here inverts.

Data values have **two spellings** and the grammar keeps them apart on purpose. Juxtaposition (`Some 42`, `Err -1`) is `data_constructor_expr`; the parenthesized form (`Some(42)`, `Rect(3, 4)`) parses as a named `tuple_literal`, and the Go typechecker resolves a tuple-literal name that is a data constructor to its data type. The collector erases the difference, so no pass after collection knows which was written.

### `::` is settled in the lexer, not by GLR

`trait_method_path` (`TraitName::method`) and turbofish generic args (`generic_arguments`) both start with `TypeName ::`. This is *not* resolvable via `conflicts:`/precedence — tree-sitter's static shift/reduce resolution commits to one production before either's deciding token (`<` vs an identifier) is visible, regardless of which side wins the precedence comparison. `generic_arguments` uses **`"::<"` as one atomic string token**, so ordinary maximal-munch picks the right token before the parser has to choose. **Keep the combined token** — splitting it back into two literals reintroduces the ambiguity.

## Function-Definition Sugar (`declaration`, `include/statements/assignments.js`)

A function is a `let`/`var` binding whose value is a `lambda_expr`. Three spellings, all producing an identical binding (`VarDeclStmt{Value: LambdaExpr}`):

```lyra
let add = pure (a: i32, b: i32) -> i32 => a + b   // explicit: value is a lambda (modifiers inside it)
let add(a: i32, b: i32) -> i32 => a + b            // ML-style sugar: params attach to the name, no `=`
let pure add(a: i32, b: i32) -> i32 => a + b       // sugar with modifiers leading the name
```

`declaration` has three identifier arms: a **modifier-led function** (entered as soon as a modifier follows the keyword; the collector's `applyFunctionModifiers` lifts the flags onto the collected `LambdaExpr`), a **plain identifier binding** (`= <expression>`, the modifier-less lambda sugar, or a value-less `let x` / `let x: T`), and a **pattern binding**.

Two invariants keep the parse unambiguous — **do not weaken either**:

- **A `where` clause requires a value, and the modifier-led arm requires its lambda.** A value-less `let f<n> where n: Ord` (or `let pure add`) would be a complete statement that swallows a following `(…) => …` as a *separate* bare-lambda statement instead of the sugar. Enforced by the `Where clause without a value` and `Leading modifier on a non-function` `:error` corpus tests.
- **`fn_modifiers` is one `repeat1(choice(...))` rule, not seven separate `optional(field(...))` fields** before the name. Seven stacked optionals ahead of a generic `<` roughly doubled `parser.c` and broke correctness — even `let x = 42` mis-parsed. Order and duplicates are validated in the collector (`lyra-E029`), not the grammar, so `let async pure f(…)` parses but is reported.

## Operator Precedence (low → high)

| Group | Key constants | Approximate level |
|---|---|---|
| Block, type | `BLOCK=2`, `TYPE=2` | lowest |
| Logical | `LOGICAL_OR=30`, `LOGICAL_AND=40` | low |
| Equality / relational | `EQUALITY=80`, `RELATIONAL=90` | medium-low |
| Bitwise | `BITWISE_OR=100`, `BITWISE_XOR=102`, `BITWISE_AND=104` | medium-low |
| Arithmetic | `ADDITIVE=110`, `SHIFT=115`, `MULTIPLICATIVE=120` | medium |
| Unary | `UNARY=140` | medium-high |
| Match / with | `MATCH_EXPR=201`, `WITH_STATEMENT=200` | high |
| Await / yield-from | `AWAIT=250`, `YIELD_FROM=251` | higher |
| Postfix (call, `.`, `[]`) | `POSTFIX=300` | highest |

Full table is in `include/prec.js`.

### A precedence does not bound an operand (`!`, `include/expressions/boolean.js`)

A rule's precedence settles conflicts *between rules*; it does nothing about how much a **wider operand rule** absorbs. `!`'s alternative in `boolean_expr` carried `PREC.UNARY` and still grouped `!a && b` as `!(a && b)`, because its operand was `$.expression`, which includes `boolean_expr` and so swallowed the `&&`.

The operand is `_not_operand` — literals, `_postfix_expr`, and a nested `!` aliased back to `boolean_expr` so `!!x` produces the node the collector already reads. `_postfix_expr` reaches `parenthesized_expr`, so `!(a && b)` still says the other thing.

Worth remembering as a general shape: **an unimplemented feature hides its own grammar bugs** — `!` had no backend lowering, so every program using it failed to build before anyone could be given the wrong answer, and both surfaced together the day it was implemented.

## Bitwise and Shift Operators (`include/expressions/math.js`)

`& | ~ << >>` binary, `~` prefix (complement), and the five compound assignments (`&= |= ~= <<= >>=`).

**Xor is `~`, not `^`.** `^` is spoken for twice — prefix `^T` raw-pointer types and postfix `ptr^` deref — so a binary `^` would be ambiguous with a deref in operand position, and `ptr^ ^ mask` is the case with no good answer. The complement is the same token in prefix position, exactly as `-` is both subtraction and negation, told apart by position and `prec.right(UNARY)`.

**Precedence is deliberately not C's.** Bitwise binds *tighter than comparison*, so `flags & MASK == 0` groups as `(flags & MASK) == 0` — in C it means `flags & (MASK == 0)`. It binds *looser than arithmetic* (Python/Ruby, not Go), so `a | b + c` is `a | (b + c)`. Shifts are the exception at 115, above addition, matching Go. `&` > `~` > `|` matches C/Java/Python/Rust. Collapsing the three bitwise bands into Go's two saves only ~5% of states, so the distinct bands are nearly free.

**`|` collides with three existing constructs**, all resolved by GLR conflict entries rather than precedence: the struct-update separator (`Player { base | f: v }`), and — twice — the array-comprehension delimiter, which both separates generators from guards and closes the clause. Only the token *after* the `|` tells them apart, so a static resolution would pick one reading and silently break the other.

**The comprehension needed `prec.dynamic`, not a conflict entry.** `[ x in R | A | B ]` fits two *complete* parses — guard `A` with result `B`, or no guard and the single result `A | B` — which is a genuine ambiguity between finished trees, the one thing `prec.dynamic` resolves and `conflicts:` does not. The guarded branch wins, so **inside a comprehension a top-level `|` is a section separator; parenthesize a bitwise-or meant as a value** (`[ x in R | (a | b) ]`). Getting this wrong is not a parse error — every guarded comprehension silently becomes an unguarded one whose result is a bitwise-or.

**`>>` does not break nested generics.** `Maybe<Result<i64, string>>` parses: tree-sitter's lexer only considers tokens valid in the current parse state, and `>>` is not valid where a type argument list is closing.

Corpus: `test/corpus/bitwise_operators.txt`.

## A `for` condition is any bool operand (`include/statements/control_flow/for_loop.js`)

The condition is `$._bool_operand` — a `boolean_expr`, a literal, or any `_postfix_expr` — so `for done { … }`, `for ready(n)` and `for cfg.enabled` all work.

**`$.expression` — matching `if`'s condition — does not generate**, and it looks like the obvious unification. A `block` *is* an expression, so `for { … }` becomes ambiguous between "condition, no body" and "no condition, body":

```
'for'  block  •  ';'  …
  1:  'for'  (expression  block)
  2:  (for_loop  'for'  block)
```

`if` does not have this problem because its `then_block` is mandatory, so a block after the condition is never optional. `_bool_operand` excludes `block` and sidesteps it entirely.

There is **no `for_condition_expr` alias**: it never meant anything (the collector handled it in the same `case` as `boolean_expr`) and it made the node kind depend on which *form* the condition took, which is a trap for anyone writing a query against it. Bool-ness is entirely the typechecker's, which is the better diagnostic anyway — `for n { }` over an integer used to be a syntax error pointing at the brace.

## Postfix heads, and the one-derivation rule

Three groups of nodes were added to `_primary_expr` (the head of every postfix form) so that `"abc".len()`, `[1, 2, 3].len()`, `1.wrapping_add(2)`, `Node { n: 7 }.n` and `(a + b).x` all parse. The rule that governs every such change:

> **A node kind must have exactly one derivation path.** `expression` reaches `_literal` directly *and* `_postfix_expr` (hence `_primary_expr`), so a kind in both is derivable two ways and every operand position becomes an unresolved reduce-reduce.

That is why these changes *shrink* the parser as often as they grow it — the parenthesized-head and constructor-operand work removed a derivation and lost 19 states. Consequences to preserve:

- **Three literal kinds stay in `_literal`**, out of `_primary_expr`: `tuple_literal` (how `Some(42)` and `Rect(3, 4)` already parse — a postfix head would give `Some(42)` a second reading), `anonymous_struct_literal` (a bare `{ … }` head contests the block), and `array_repeat_init` (left out only because nothing wants a method on one yet). `regex_literal` also stays; dropping it from `_literal` without adding it anywhere left it reachable only as a *constructor operand*, so `let phone = r"…"` parsed as a `data_constructor_expr` with a MISSING name. The `prec.right(PREC.LITERAL)` wrapper on `_literal` is what makes a plain literal outrank the juxtaposition reading.
- **`group` (`(x + y)`) has one arm, in `_primary_expr`, not in `_math_expr`.** Every math operand still finds it because `_math_operand` includes `_postfix_expr`. Adding it to both is an unresolved conflict tree-sitter names outright. (`(x)` is a `parenthesized_expr`, a different node, which is why `(a).x` always worked and `(a + b).x` did not.)
- **A `tuple_literal` is listed in `_math_operand` specifically**, which is how `Cents(150) + Cents(275)` parses without moving the node into `_primary_expr`.
- Operand rules that list a literal *and* `_postfix_expr` must not list both: `_string_concat_operand`, `_math_operand`, `_not_operand`, `_bool_operand` and `_comparison_operand` each had duplicates removed.

The literal heads need three conflict entries — `[$._primary_expr, $.literal_pattern]`, `[$._primary_expr, $._signed_number_literal]` and `[$._primary_expr, $._negated_number_literal]` — because `('a', 'b')`, `(1, 2)` and `(-1, 2)` are each a lambda parameter list of patterns or an anonymous tuple of expressions, decided by the `=>` that may or may not follow. Generation reports two related entries as *unnecessary*; they are left in place, since this is the region whose warnings are unreliable.

**`0 - 200` must still be a `binary_expr` with a `sub_operator`** — this region's standing regression, since the failure mode is a *program*, not an error (`0` followed by a dangling `negation(-200)`). Pinned by corpus and by an execution test in `lyra`.

Corpus: `A literal is a postfix head`, `Literal heads do not disturb the readings they contest` (expressions/postfix.txt), `A parenthesized expression is a postfix head`, `A constructor call is a math operand` (math_operators.txt).

## Small forms, and what pins them

- **A trait body is optional**, braces and all: `trait Arithmetic: Add + Sub + Mul + Div`, with or without `{}`. The method list stays `memberList`-shaped and therefore non-empty, which is what keeps `trait C { , }` an error — the list is **absent**, never empty. `impl_methods` was already optional, so `impl Arithmetic for Vec2 {}` parses either way. The ambiguity to watch is a `{` on the *next* line: the terminator ends the declaration first, so `trait Marker` ⏎ `{ 1 }` is a trait plus a block statement while `trait Marker { 1 }` is a (malformed) body. Pinned by `A brace on the next line is not a trait body`.
- **A `newtype` may be generic** — `constrained_type` takes the same `optional(field("generic_parameters", …))` slot every other type declaration has. Without it the `<t>` landed in an ERROR node **and the declaration still collected**, so parameters were silently dropped; the Go golden file recorded the truncation under a test named for the feature, which is how a regenerated golden bakes in a bug and then reads as a specification.
- **`let _ = expr` discards.** `wildcard_pattern` is one of `destructuring_only_pattern`'s alternatives. Without it a bare `_` fell into `data_pattern` and recovered with an *empty* name, and the must-use warning was recommending a spelling the parser rejected. `_` is still not an *expression*: `let _ = 5; _` does not parse, which is what keeps a discard from being read back.
- **A loop binding may be `_`.** `for _ in 0..<n` and `for _, v in xs` iterate without
  naming a counter. `identifier` is `/(_[a-zA-Z0-9_]+|[a-z][a-zA-Z0-9_]*)/` — a leading
  underscore needs a character after it — so `for _i in` parsed and a bare `_` did not.
  It is admitted **inside the existing alias** (`alias(choice($.identifier, '_'),
  $.for_variable_or_key)`) rather than as a `wildcard_pattern` alternative beside it, so
  the CST shape is unchanged and the collector needed no change; the name it binds is `_`,
  which no identifier can spell, so the body cannot refer to it.
- **A match arm may hold a bare jump.** `match_arm`'s body is `choice($.expression, $._arm_jump)`, where `_arm_jump` is `break`/`continue`/`return`. Without it `None => break` parsed `break` as an identifier. The `lyra` collector erases it into the equivalent single-statement block, so no pass after the collector knows the alternative exists — **keep it that way**; the cheap version of this feature lives entirely in those two places.

## Corpus Test Format

Tests live in `test/corpus/**/*.txt`, separated by `===` / `---` delimiters:

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

Add `:error` after the test name line to assert that the source produces a parse error.

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

## Field labels

`visibility` (`pub`) is a **labelled field** on every declaration that accepts it — `optional(field("visibility", $.visibility))`. Labelling it on only some sites split the collector three ways, and reading an *unlabelled* child by field name returns nil **silently**, so the mistake reads as "this declaration is never public" rather than as an error — which is how `pub let` went uncollected.

**The rule: if a collector needs to find something, label it.** An anonymous child is fine only for tokens nothing reads.

## Allocation modifiers on an array *element* (`include/types/allocation.js`)

`[]shared Node`, `[3]weak Observer`, `[16]stack Vec3`, via `_element_type` — a `choice` of `_non_allocated_type | allocated_type | weak_type` that only `array_type` uses.

**Why the element and nowhere else.** Allocation is a *use-site* property, and an array's elements are a use site. Without it `kids: []shared Node`, the obvious spelling for a tree's children, does not parse and the shape has to be bent into a `Maybe<shared Node>` chain.

**Exactly one modifier deep, deliberately.** `_element_type`'s operand stays `_non_allocated_type`, so `[]shared shared Node` is a parse error. And the *other two* users of `_non_allocated_type` — `weak_type`'s `inner_type` and `allocated_type`'s `type` — are deliberately untouched: their operand must stay modifier-free, or `shared weak T` and `weak shared T` become writable everywhere. `weak T` already means "non-owning reference to a `shared T`", so `weak shared T` would say the same thing twice with a different answer.

It is a `choice` of the three rather than `$.type`, which would admit `[]void`. (`[]void` parses anyway, as `generic_type`, since a lowercase name is a type *variable* by the ML lexical rule — pre-existing and unrelated.)

Corpus: `test/corpus/types/allocation.txt`, including the two `:error` tests that pin the no-stacking rule.

## Effect modifiers on a function *type* (`include/types/lambda_type.js`)

`lambda_type` accepts the same `pure`/`det`/`noalloc` modifiers `lambda_expr` does, so a callback parameter can be constrained: `f: pure () -> t`. They are **labelled fields** (`is_pure`/`is_det`/`is_noalloc`), matching the lambda-value rule, so the collector reads presence by field name rather than scanning tokens.

Two things this is *not*. It is not a new node kind — `pure_modifier` and friends already existed for lambda values, so no highlight query gained a case and `lyra-zed-ext`'s queries need no change. And it is not a semantic rule: the grammar accepts `pure det (…) -> t`, which the checker rejects as conflicting bounds.

The consumer is `lyra`'s purity pass: an unconstrained callback makes its function *effect-polymorphic* (purity decided per call site by the argument), while a declared bound makes it unconditional and constrains every caller instead.

## Parser size, and the rule that decides it (`lambda_expr`)

`src/parser.c` is ~14.7 MB (~8,240 states). **If it starts growing again, run `npx tree-sitter generate --report-states-for-rule -` first.** It attributes states per rule, and the answer has been one rule both times anyone has looked.

It was **116 MB and 62,663 states** until `lambda_expr`'s modifiers were rebuilt — that rule alone owned 57,026 states, 91% of the parser. The cause was seven independent `optional()` modifiers in sequence (`unsafe`, `pure`, `det`, `noalloc`, `async`, `gen`, `rec`): an LR automaton tracks every distinct prefix through such a chain — 2^7 = 128 of them before the parameter list — and because the GLR conflicts around `(` keep the lambda-parameter-list, tuple and parenthesized-expression readings alive simultaneously, each prefix grew its own family of states across the whole expression grammar.

Measured alternatives, for anyone tempted to reintroduce ordering here:

| Form | States | `parser.c` |
|---|---|---|
| Seven ordered `optional()`s | 62,663 | 116 MB |
| Ordered, mutually-exclusive ones grouped (5 optionals) | 37,687 | 70 MB |
| `repeat(choice(…))` — order-free | **6,475** | **12.8 MB** |

**What it cost:** modifier order and repetition stopped being parse errors, and are reported by the collector instead (`lyra-E029`) with a message naming the offending modifier and the canonical order — strictly better than a syntax error pointing at whichever token failed to shift.

**What it bought, beyond size:** `src/parser.c` left Git LFS. `git-lfs` is no longer a prerequisite for cloning this repo, the file is diffable in review, and a grammar change no longer costs 116 MB of LFS quota per revision. **Do not re-add the LFS filter without re-measuring.**

The two most expensive features since are bitwise operators (+1,576 states) and juxtaposition (+19%); everything else in this file cost under 1% each.

## Signed Literals in Patterns

**A pattern's number literal carries an optional `-`** — `-1 => …`, `-128..<=127 => …` — via `_signed_number_literal` (`include/patterns/index.js`), used by both `literal_pattern` and `range_pattern`. Without it the `-` lands in an `ERROR` that swallows the whole `match`, which downstream reads as *nothing being wrong*: the collector sees no match expression, so exhaustiveness never runs and a test asserting "no errors" passes vacuously.

Three constraints shape the rule, each learned by violating it:

- **The sign cannot live in the token.** `decimal_int` swallowing a `-` would lex `a-1` as `a` followed by `-1` rather than as subtraction.
- **It is a named rule that is then aliased** (`alias($._negated_number_literal, $.negation)`), not `alias(seq(…), $.negation)` inline. An inline sequence is not a node of its own, so its `operator`/`operand` fields hoist onto the enclosing `range_pattern` and displace `start`/`end`, leaving the collector's `ChildByFieldName("start")` empty.
- **It aliases to `negation` rather than introducing a node kind.** `collectRangePattern` reads `start`/`end` through `CollectExpr`, which already handles a `negation` with an `operand` field.

It needs two declared conflicts, both mirrors of ones already present for the unsigned case: `[expression, _signed_number_literal]` and `[_math_operand, _negated_number_literal]`. This is the region `grammar.js`'s conflict comments call finely balanced, so **check that `0 - 200` still parses as a `binary_expr` with a `sub_operator`** after touching any of it.

## One `..` Notation, Three Sites (`rangeBounds`, `include/helpers.js`)

The `..` range notation appears in three places — an expression (`0..<n`, `0..<=10:2`), a match pattern (`0..<=9`), and a `newtype` range constraint (`range(0..<=100)`). `rangeBounds($, {startOperand, endOperand, open, step})` is the one shape they share. **Two axes are real and stay parameters; everything else that once differed was drift.**

- **The operand legitimately differs.** A pattern needs a compile-time literal (exhaustiveness and the jump-ladder lowering depend on it), a constraint needs a constant *expression* (it is part of a type), an expression takes arbitrary runtime values. Unifying these would either let a match arm hold a function call or break `for i in 0..<n`.
- **Open-endedness legitimately differs.** `range(0..)` means "bounded below, and above by the base type"; `10..` as a pattern covers a type's tail without naming its maximum. An open-ended *expression* range would need the lazy iterator the language does not have, so `range_expr` stays closed on both sides.
- **Both bounds absent is refused structurally** (`open` mode is a `choice`, not two independent `optional`s). `range(..)` constrains nothing and a bare `..` pattern is `_`.

**The end operator is its own node** (`range_end_operator`, not part of the `..` token — highlight queries must capture it separately or half of `0..<=9` renders unstyled). It is **optional in the grammar at all three sites and required by the collector at all three** (`lyra-E032`, via `ctx.RangeEndOperator`). It is not a default: every reader of the collected operator tests `== "<"`, so an omitted one silently meant *inclusive* — `0..9` became `0..<=9`, and that extra value is the boundary the exhaustiveness checker and the emitted comparison disagree on.

The line between grammar and collector enforcement, worth keeping: **enforce in the collector when the construct has a plausible intended meaning that must be disambiguated** (`0..9` is what a Rust or Python programmer writes *meaning* something, and deserves a message naming both fixes), **and in the grammar when it has no meaning at all** (a bare `..`).

**A recovered parse is not an absent bound.** Where the grammar requires a bound, tree-sitter can *insert* one to keep going — `range(..)` yields a zero-width `decimal_int` sitting on the `)`. The Go side treats missing-or-empty as absent (`collector_ctx.RangeBound`); a plain nil check reads that insertion as a bound of value zero.

Corpus: the open-ended tests in `test/corpus/expressions/control_flow/match.txt` and `test/corpus/types/newtype.txt`, plus the `:error` test that a bare `..` pattern does not parse.

## Juxtaposition application (`data_constructor_expr`)

`Some 42` and `Some(42)` are both legal. It depends on the statement terminator: without one, a nullary constructor greedily consumes the next statement.

**One operand, never curried.** There is no `Rect 3 4`. A constructor's positional payload is already a single anonymous tuple internally (`Rect(f64, f64)` → one `TupleType` param), so `Rect(3, 4)` reads as "Rect applied to the tuple `(3, 4)`" — the parens are the tuple's, not a call's. Parenthesized operands are outside `_constructor_value` precisely so `Some(42)`, `Rect(3, 4)` and `Some (a + b)` keep their existing named-`tuple_literal` parse.

**`Some -1` is `Some(-1)`.** Application binds tighter than binary operators and `negation` is in the operand set. This is not Haskell's ambiguity: there, any identifier can be a value, so the subtraction reading has an operand. Here `identifier` is lowercase-leading and `const_identifier` is SCREAMING_CASE, so a PascalCase name in expression position is *always* a constructor — never a variable, never a constant — and the subtraction reading has nothing to bind. `MAX - 1` is untouched arithmetic. The residual hazard (a `-` overload on a sum type whose nullary constructor sits bare on the left) is in `lyra/todo.md`.

**The operand must be atomic** — a literal, a name, a nullary constructor, a negated literal, a struct/array literal, or another application. A compound operand is parenthesized (`Ok(f(y))`, `Some(a.b)`). **This is forced, not chosen:** every postfix form is headed by `_postfix_expr`, which reaches `parenthesized_expr`, so admitting `call_expr`/`member_expr`/`index_expr`/`try_expr`/`deref_expr` as operands also admits `Some (x)…` while the parser looks for the `.`/`[`/`?`/`^`. That reopens a third reading of `Some(x)` and tips the pre-existing parameter-position race, so `(Some(x): Maybe<i64>) -> i64` stops parsing as a destructured lambda parameter. No conflict entry fixes it; the reading has to not exist.

**In this region tree-sitter's "unnecessary conflict" warning is unreliable — verify against the corpus.** During this change it reported entries as unnecessary that were load-bearing (dropping `[_tuple_name, _primary_expr, data_pattern]` broke the parameter case) *and* reported one as unnecessary that genuinely was.

Juxtaposition is genuinely expensive in an LR automaton (+19% states) — run `--report-states-for-rule -` before adding anything else here.

## Type Aliases vs `newtype`

Two declarations that look alike and mean opposite things:

- **`type Op = ((i64, i64)) -> i64`** (`include/types/type_alias.js`) is **transparent**. The name and the type are interchangeable — no conversion at the boundary, no identity of its own. The collector registers the aliased type *itself* under the alias's name, so the rest of the compiler needs no notion of aliases.
- **`newtype Volume = u8 where range(0..<=100)`** (`include/types/constrained_type.js`) is **nominal**. It is a distinct type you opt into at a conversion site, which is what lets it carry `where` constraints.

They are not redundant, and neither is a flag on the other: one adds meaning at a boundary, the other removes repetition. The motivating case for an alias is a function type — `(g: ((i64, i64)) -> i64, …)` is where Lyra reads worst, and the double parens (one *tuple* parameter, since single parens would be two arguments) can only be named away, never spelled away. `newtype` cannot serve: it makes the value un-callable without unwrapping.

`type` is **not** a reserved word — it is a keyword only in this position, so `let type = 5` still compiles. Adding it to `reserved` would be a gratuitous break.

Corpus: `test/corpus/types/type_alias.txt`.
