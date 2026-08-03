# tree-sitter-lyra — Project Context

This is the tree-sitter grammar for the Lyra programming language. It produces a C parser (`src/parser.c`) consumed via CGO by the sibling `lyra/` Go project.

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
| `include/comments.js` | `//` line comments, `///` doc comments, `/* */` block comments |
| `include/helpers.js` | shared utilities: `commaSep1`, `commaSep`, `parameterList` |
| `include/prec.js` | all `PREC.*` operator precedence constants |

## Grammar Configuration

```js
supertypes: [$.expression, $.statement, $.pattern, $.type]
extras:     [/\s/, $.doc_comment, $.comment]   // whitespace and comments ignored everywhere
externals:  [$._BLOCK_COMMENT, $._string_start, $._string_content,
             $._interpolation_start, $._interpolation_end,
             $._string_end, $._raw_string_literal, $._newline]
```

The external scanner (`src/scanner.c`) handles block comments, the string interpolation protocol, and the statement terminator, because these require stateful or context-sensitive lexing that tree-sitter's declarative DSL cannot express.

## Statement Terminators

**A line break ends a statement; `;` is the explicit form** for putting several on one line. Statements are a separated list (`statementList` in `include/helpers.js`, used by `block` and `program`), with the separator after the last one optional.

Before 07/31/26 there was **no separator at all** — `block` was `seq("{", repeat($.statement), "}")` and newlines were only `extras`. Multiple statements per line already worked, so this change adds no expressiveness; what it removes is a silent misparse. With no terminator the parser is maximally greedy and a line break means nothing, so all three of these compiled and ran as *one* statement:

```
let b = a          let f = add3        let n = xs
-2                 (4)                 [1]
```

`a - 2`, `add3(4)`, `xs[1]` — three statements to a human, one to the parser, no diagnostic. Requiring a separator also *shrank* the parser: 6475 → 5356 states, `parser.c` 12.8 MB → 8.4 MB, because the ambiguity is gone.

**The scanner asks the parser, not a token table.** `scan_newline` only runs where `valid_symbols[NEWLINE]` is set, and tree-sitter sets it exactly in states where the grammar accepts a terminator. So a newline inside an unfinished expression never reaches the scanner, and trailing-operator continuation (`let a = 1 +` ⏎ `2`) works with no rule of its own. Go needs its list of "tokens that may end a statement" because its insertion happens in the lexer, where there is no parse state to consult.

What the scanner *does* decide is the forward half — a line that begins with something continuing the previous statement. **The rule for what may go on that list: a token that cannot begin a statement.** That is what makes suppression safe; if a line could not have been a new statement, treating it as a continuation cannot hide a misparse. Currently `.` (method chains — UFCS is decided, so receiver chains are coming), `|` (leading-bar `data` declarations, already in the corpus), and the keywords `else` and `where`. Deliberately **not** on it: `-`, `(`, `[`, `*` — each can start a statement, and treating them as continuations is the exact bug above.

Comments are not skipped by `scan_newline`. On `/` it returns false, tree-sitter's own lexer takes the comment as an extra, and the scanner is called again after it — so a trailing `// note` does not suppress its line's terminator. Known gap: a *block* comment holding the only newline (`a = 1 /*` ⏎ `*/ b = 2`) joins the two statements.

Corpus: `test/corpus/statements/terminators.txt`.

**Comment scanning is gated on `!in_string(scanner)` — do not remove that guard.** Comments are `extras`, so `BLOCK_COMMENT` is valid almost everywhere, including at every string content-chunk boundary, and the comment branch runs *before* the in-string branch. Unguarded (the state until 07/29/26), a string whose content began with `/*` lexed as a comment running to the next `*/` **anywhere later in the file** — swallowing the rest of the line, following declarations, and all — and no later pass reported anything (`lyrac check` exited 0). It fired wherever a fresh content chunk starts: after the opening quote, right after a `${…}` interpolation, and — since `scan_block_comment` skips leading whitespace as token padding — after a leading space (`" /* x */ y"`). An *interpolation* is an expression context where comments remain valid, and `in_string()` is false for `CTX_INTERPOLATION`, which is exactly the line this guard draws. Fixing it also stopped the padding-skip from **eating a content chunk's leading whitespace** (`"${a} ${b}"` now emits the middle space as `string_content`; it previously vanished from the CST and was recoverable only by the collector's raw-source re-slice). Corpus coverage: the comment-delimiter tests in `test/corpus/literals/string.txt`.

## Regex Literals (`include/literals/regex.js`)

A regex literal is **`r"…"`** — the `r` sigil plus *string* delimiters — as one `token(prec(1, …))` that outranks the bare identifier `r`.

It was `r/…/` until 07/29/26, which was fundamentally ambiguous: `r` is an ordinary identifier and `/` is division, so `let ratio = r/2 + a/b` lexed as the regex `r/2 + a/` followed by a stray `b`, silently, and an unterminated one ran to the next `/` anywhere later in the file (bounding the token to one line, the first mitigation, only shrank the blast radius). Slash delimiters cannot be disambiguated lexically — the deciding context is arbitrarily far right, and a regex may legally contain spaces, digits, and operators, so no heuristic on the content separates the two readings.

A `"` cannot follow a **lowercase** `identifier` in any valid Lyra expression, so `r"` can only ever begin a regex and `r/2` is unambiguously division. (Juxtaposition application returned on 08/02, so a `"` *can* now follow an **uppercase** name — `Some "hi"` — but `identifier` is lowercase-leading by lexer rule and a constructor name is not, so the property this literal depends on is untouched. If juxtaposition is ever extended to lowercase names, this rationale dies with it.) Two bonuses: `/` needs no escaping inside a pattern (`r"https://example"`, not `r/https:\/\/example/`), and the form matches how a Python programmer already writes one (`r"\d+"`). The delimiter itself escapes as `\"`. Newlines stay excluded from the content classes, so an unterminated literal degrades to an identifier plus an unterminated string — a loud parse error — instead of consuming the file.

Don't delete the rule as "unused": it backs `pattern(r"…")` constraints on `newtype` (`include/types/constrained_type.js`) and `regex_pattern` in match arms, and the constraint path is implemented downstream (`lyra/pkg/regex` is a full DFA engine; the typechecker enforces `PatternConstraint`). Only the match-arm *pattern* form is unlowered in the backend.

## Reserved Keywords

```
for  if  else  match  let  var  const  readonly  true  false
import  module  as  pub  async  await  Self
stack  shared  weak  with  pure  det  noalloc  gen  rec  yield
fixed  unsafe  mut  ref  own  void
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
- `result_expr` vs `_primary_expr` — inside an array comprehension, `[ Node { n: x } for x in xs ]`'s literal is both the result and a primary expression (see below)

### A struct literal is a postfix head (08/03)

`Node { n: 7 }.n`, `Node { n: 7 }.a()` and `Grid { cells: […] }.cells[0]` parse.
`named_struct_literal` joined `_primary_expr` (`include/expressions/postfix.js`), which is the
head of every postfix form. Before it, *no* postfix attached to a struct literal while every
other value-producing expression worked as one — `mk().a()`, `(Node { n: 7 }).a()`, a literal
in argument position — so the literal was the lone exception, and field access off one is not
a thing a reader has a model for failing.

**Measured, because this region has form**: +26 states (8182 → 8208, +0.3%) and +69 KB of
`parser.c` (+0.45%). Juxtaposition cost +19% states for less, so the number was worth checking
before the change rather than after.

It needed exactly one conflict entry, `[$.result_expr, $._primary_expr]` — generation *fails*
without it, so it is not the unreliable "unnecessary conflict" kind. The ambiguity is real: in
`[ Node { n: x } for x in xs ]` the literal is a complete parse both as the comprehension's
result and as a primary expression.

**Lyra needs no "no struct literal in an `if` header" rule**, which both Rust and Go impose.
There the `{` of `if Node { n: 7 }.n > 0 {` cannot be told from the body's opening brace, so
they forbid it unparenthesized; GLR keeps both readings alive until a token decides. The
corpus has that exact form (`Struct literal in an if condition`), and it runs.

Note: data values have **two spellings**, and the grammar keeps them apart on purpose.
Juxtaposition (`Some 42`, `Err -1`) is `data_constructor_expr`; the parenthesized form
(`Some(42)`, `Rect(3, 4)`) parses as a named `tuple_literal`, and the Go typechecker
resolves a tuple-literal name that is a data constructor to its data type. The collector
erases the difference — both build the same named `TupleLiteralExpr` — so no pass after
collection knows which was written. See "Juxtaposition application" below.
- `for_loop` / `for_in_loop` with and without a label
- `pattern` / `_primary_expr` / `data_pattern` vs a name-leading `(…)` — a parenthesized bare name (`(a, b)`, `(a)`, `(None, 7)`) can begin a **lambda parameter list** (`(a, b) => …`), an **anonymous tuple**, or a **parenthesized expression**. A bare `identifier` is both a `pattern` (the lambda param) and a `_primary_expr` (the tuple element); a bare capitalized name is both a nullary `data_pattern` and a `_primary_expr`. GLR must keep both alive until `=>` (or its absence) decides. This needed *two* pieces (added 07/16/26): (1) the `[pattern, _primary_expr]`, `[pattern, for_loop, for_in_loop]`, and `[_primary_expr, data_pattern]` conflict entries, **and** (2) restructuring `pattern` and `data_pattern` so the bare-name alternative sits *outside* `prec.left(PREC.PATTERN)` / `prec.left(PREC.DATA_PATTERN)` — otherwise the higher pattern precedence silently resolves the reduce-reduce toward the pattern (committing to the lambda/data-pattern reading) and the conflict entry is reported "unnecessary". A payload-bearing `data_pattern` (`Some(x)`) keeps `PREC.DATA_PATTERN` (it must still beat the constructor-call expression reading). Before this fix a name-leading tuple literal failed to parse entirely.

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

## Bitwise and Shift Operators (`include/expressions/math.js`)

`& | ~ << >>` binary, `~` prefix (complement), and the five compound assignments
(`&= |= ~= <<= >>=`). Added 08/02/26; the trait `binary_operator` list had reserved
`<< >> & | ^` for overloads since before any of them existed in expression position.

**Xor is `~`, not `^`.** `^` is spoken for twice — prefix `^T` raw-pointer types and
postfix `ptr^` deref — so a binary `^` would be ambiguous with a deref in operand
position, and `ptr^ ^ mask` is the case with no good answer. `~` was completely free
(and already reserved in the trait `prefix_operator` list). Odin, which this language
borrows from elsewhere (`%%`, the `rune` naming), spells xor `~` for the same reason.
The complement is the same token in prefix position, exactly as `-` is both subtraction
and negation, told apart by position and `prec.right(UNARY)`.

**Precedence is deliberately not C's.** Bitwise binds *tighter than comparison*, so
`flags & MASK == 0` groups as `(flags & MASK) == 0` — in C it means `flags & (MASK == 0)`,
which is why C codebases parenthesise every masked comparison. It binds *looser than
arithmetic* (Python/Ruby, not Go, which ties `|`/`^` to `+` and `&` to `*`), so
`a | b + c` is `a | (b + c)`. Shifts are the exception at 115, above addition, matching
Go: `a + b << c` is `a + (b << c)`. `&` > `~` > `|` matches C/Java/Python/Rust; Go is the
outlier that ties `|` and `^`.

**`|` collides with three existing constructs**, all resolved by GLR conflict entries
rather than precedence (see `conflicts:`): the struct-update separator
(`Player { base | f: v }`), and — twice — the array-comprehension delimiter, which both
separates generators from guards and closes the clause. Only the token *after* the `|`
tells them apart, so a static resolution would pick one reading and silently break the
other.

**The comprehension needed `prec.dynamic`, not a conflict entry.** `[ x in R | A | B ]`
fits two *complete* parses — guard `A` with result `B`, or no guard and the single result
`A | B` — so it is a genuine ambiguity between finished trees, which is the one thing
`prec.dynamic` resolves and `conflicts:` does not. The guarded branch wins. The rule that
falls out: **inside a comprehension a top-level `|` is a section separator; parenthesize a
bitwise-or meant as a value** (`[ x in R | (a | b) ]`). Getting this wrong was not a parse
error — every guarded comprehension silently became an unguarded one whose result was a
bitwise-or, caught only by the existing corpus test.

**`>>` does not break nested generics.** `Maybe<Result<i64, string>>` still parses:
tree-sitter's lexer only considers tokens valid in the current parse state, and `>>` is not
valid where a type argument list is closing. Verified directly, before and after.

Cost: 6,606 → 8,182 states, `parser.c` 12.0 MB → 15.3 MB (+24% / +28%) — the third-largest
single feature here, after `lambda_expr` and juxtaposition. Measured alternative, for anyone
tempted to flatten it: collapsing the three bitwise bands into Go's two (`|`/`~` with `+`,
`&`/`<<`/`>>` with `*`) saves only **424 states (5%)**, so the distinct bands are nearly
free and buy the conventional `&` > `~` > `|` ordering. The bulk of the growth is having the
operators at all, not the bands.

Corpus: `test/corpus/bitwise_operators.txt`.

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

`visibility` (`pub`) is a **labelled field** on every declaration that accepts it —
`optional(field("visibility", $.visibility))`. It used to be labelled on only two of
nine sites (`tuple_type`, `trait_declaration`) and an anonymous child on the rest, which
split the collector three ways: `ChildByFieldName` where it was labelled, a
`case "visibility":` scan in the child loop where it wasn't, and a hand-rolled scan
helper in `var_decl.go`. Worse, reading an *unlabelled* child by field name returns nil
**silently**, so the mistake reads as "this declaration is never public" rather than as
an error — which is exactly how `pub let` went uncollected until 07/30.

The rule: if a collector needs to find something, label it. An anonymous child is fine
only for tokens nothing reads.

## Effect modifiers on a function *type* (`include/types/lambda_type.js`)

`lambda_type` accepts the same `pure`/`det`/`noalloc` modifiers `lambda_expr` does, so a
callback parameter can be constrained: `f: pure () -> t`. They are **labelled fields**
(`is_pure`/`is_det`/`is_noalloc`), matching the lambda-value rule, so the collector reads
presence by field name rather than scanning tokens — see the field-labels rule above.

Two things this is *not*. It is not a new node kind: `pure_modifier` and friends already
existed for lambda values, so no highlight query gained a case and `lyra-zed-ext`'s queries
need no change. And it is not a semantic rule — the grammar accepts `pure det (…) -> t`,
which the checker rejects as conflicting bounds, exactly as it does for a lambda value.

The consumer is `lyra`'s purity pass: an unconstrained callback makes its function
*effect-polymorphic* (its purity is decided per call site by the argument), while a declared
bound makes it unconditional and constrains every caller instead.

## Parser size, and the rule that decides it (`lambda_expr`)

`src/parser.c` is ~14.7 MB (8,208 states) — the figure below is the low-water mark it was
reduced *to*, before bitwise operators (+1,576 states) and the struct-literal postfix head
(+26). It was **116 MB and 62,663 states** until the
`lambda_expr` modifiers were rebuilt, and `tree-sitter generate --report-states-for-rule -`
is what found it: `lambda_expr` alone owned **57,026 of those states — 91%**.

The cause was seven independent `optional()` modifiers in sequence (`unsafe`, `pure`, `det`,
`noalloc`, `async`, `gen`, `rec`). An LR automaton tracks every distinct prefix through such
a chain — 2^7 = 128 of them before the parameter list — and because the GLR conflicts around
`(` keep the lambda-parameter-list, tuple and parenthesized-expression readings alive
simultaneously, each prefix grew its own family of states across the whole expression
grammar. `LARGE_STATE_COUNT` told the same story: 21,714 of 62,663 (35%, where a few percent
is normal), and file size is states × actions.

One repeated `choice` instead of seven optionals collapses that to a single loop state.
Measured alternatives, for anyone tempted to reintroduce ordering here:

| Form | States | `parser.c` |
|---|---|---|
| Seven ordered `optional()`s | 62,663 | 116 MB |
| Ordered, mutually-exclusive ones grouped (5 optionals) | 37,687 | 70 MB |
| `repeat(choice(…))` — order-free | **6,475** | **12.8 MB** |

**What it cost:** modifier order and repetition stopped being parse errors. `lyra`'s
collector reports both (`lyra-E029`, `expressions/modifier_order.go`) with a message naming
the offending modifier and the canonical order — strictly better than a syntax error pointing
at whichever token failed to shift. The semantic sibling (`pure` and `det` conflicting) was
already a checker diagnostic, so the rules now live together.

**What it bought, beyond size:** `src/parser.c` left Git LFS. `git-lfs` is no longer a
prerequisite for cloning this repo, the file is diffable in review, and a grammar change no
longer costs 116 MB of LFS quota per revision. Do not re-add the LFS filter without
re-measuring: at 12.8 MB it is an ordinary large text file.

**If the parser starts growing again**, run
`npx tree-sitter generate --report-states-for-rule -` first. It attributes states per rule,
and the answer has been one rule both times anyone has looked.

## Signed Literals in Patterns

**A pattern's number literal carries an optional `-`** — `-1 => …`, `-128..=127 => …` — via `_signed_number_literal` (`include/patterns/index.js`), used by both `literal_pattern` and `range_pattern`.

Until 07/31/26 both took a bare `_number_literal`, which has no sign, so neither form parsed: the `-` landed in an `ERROR` that swallowed the whole `match`. Downstream that read as *nothing being wrong* — the collector saw no match expression, so `lyra`'s exhaustiveness check never ran and a test asserting "no errors" on a full-range match passed vacuously.

Three constraints shape the rule, each learned by violating it:

- **The sign cannot live in the token.** `decimal_int` swallowing a `-` would lex `a-1` as `a` followed by `-1` rather than as subtraction.
- **It is a named rule that is then aliased** (`alias($._negated_number_literal, $.negation)`), not `alias(seq(…), $.negation)` inline. An inline sequence is not a node of its own, so its `operator`/`operand` fields hoist onto the enclosing `range_pattern` and displace `start`/`end` — leaving the sibling collector's `ChildByFieldName("start")` empty.
- **It aliases to `negation` rather than introducing a node kind.** `collectRangePattern` reads `start`/`end` through `CollectExpr`, which already handles a `negation` with an `operand` field; a new kind would need collector support for no gain.

It needs two declared conflicts, both mirrors of ones already present for the unsigned case: `[expression, _signed_number_literal]` (which replaces `[expression, literal_pattern]` — declaring the old pair now warns as unnecessary) and `[_math_operand, _negated_number_literal]`. This is the region `grammar.js`'s conflict comments call finely balanced, so **check that `0 - 200` still parses as a `binary_expr` with a `sub_operator`** after touching any of it — the failure mode is that it becomes `0` plus a dangling `negation(-200)`.

## One `..` Notation, Three Sites (`rangeBounds`, `include/helpers.js`)

The `..` range notation appears in three places — an expression (`0..<n`, `0..=10:2`), a
match pattern (`0..=9`), and a `newtype` range constraint (`range(0..=100)`). Until 08/01/26
they were three independent rules that had drifted apart on four axes at once:

| | operand | start | end operator | end | step |
|---|---|---|---|---|---|
| `range_expr` | `expression` | required | **required** | required | optional `:step` |
| `range_pattern` | `_signed_number_literal` | required | **optional** | required | — |
| `range_constraint` | `constraint_math_expr` | **optional** | optional | optional | — |

…and on a fifth: the same two characters `<`/`=` were `range_end_operator` in two of the
rules and a pair of node kinds of their own (`less_than_comparator`/`equal_to_comparator`,
under a `comparator` field) in the third.

`rangeBounds($, {startOperand, endOperand, open, step})` is now the one shape. **Two of
those axes are real and stay parameters; the rest were drift and are gone.**

- **The operand legitimately differs.** A pattern needs a compile-time literal
  (exhaustiveness and the jump-ladder lowering depend on it), a constraint needs a constant
  *expression* (it is part of a type), an expression takes arbitrary runtime values.
  Unifying these would either let a match arm hold a function call or break `for i in 0..<n`.
- **Open-endedness legitimately differs.** `range(0..)` means "bounded below, and above by
  the base type"; `10..` as a pattern covers a type's tail without naming its maximum. An
  open-ended *expression* range would need the lazy iterator the language does not have, so
  `range_expr` stays closed on both sides.
- **Both bounds absent is refused structurally** (`open` mode is a `choice`, not two
  independent `optional`s). `range(..)` constrains nothing and a bare `..` pattern is `_`.

**The end operator is optional in the grammar at all three sites and required by the
collector at all three** (`lyra-E032`, via `ctx.RangeEndOperator`). It is not a default:
every reader of the collected operator tests `== "<"`, so an omitted one silently meant
*inclusive* — `0..9` was `0..=9`, and that extra value is the boundary the exhaustiveness
checker and the emitted comparison disagree on. The line between grammar and collector
enforcement, worth keeping: **enforce in the collector when the construct has a plausible
intended meaning that must be disambiguated** (`0..9` is what a Rust or Python programmer
writes *meaning* something, and deserves a message naming both fixes rather than a syntax
error pointing at whichever token failed to shift — the `lyra-E029` trade), **and in the
grammar when it has no meaning at all** (a bare `..`).

Cost of the change: 5,370 → 5,537 states, `parser.c` 8.8 MB → 9.4 MB (+3% / +6%), for two
new pattern forms and lenient operators at three sites. Corpus: the open-ended tests in
`test/corpus/expressions/control_flow/match.txt` and `test/corpus/types/newtype.txt`, plus
the `:error` test that a bare `..` pattern does not parse.

**A recovered parse is not an absent bound.** Where the grammar requires a bound,
tree-sitter can *insert* one to keep going — `range(..)` yields a zero-width `decimal_int`
sitting on the `)`. The Go side treats missing-or-empty as absent
(`collector_ctx.RangeBound`); a plain nil check reads that insertion as a bound of value
zero.

## Juxtaposition application (`data_constructor_expr`)

`Some 42` and `Some(42)` are both legal. Restored 08/02/26 after being removed 06/18/26;
the removal commit says the machinery existed "solely to prevent a nullary constructor from
greedily consuming the next statement **in the terminator-less grammar**", and statements
gained a terminator on 07/31/26, so the sole stated reason expired. It also closes a real
asymmetry — `Some 42` was always legal in *pattern* position (`data_pattern` is
`Name pattern`), so the two positions disagreed about the language's own syntax.

**One operand, never curried.** There is no `Rect 3 4`. A constructor's positional payload
is already a single anonymous tuple internally (`Rect(f64, f64)` → one `TupleType` param),
so `Rect(3, 4)` reads as "Rect applied to the tuple `(3, 4)`" — the parens are the tuple's,
not a call's — and its tree is unchanged. Parenthesized operands are outside
`_constructor_value` precisely so `Some(42)`, `Rect(3, 4)` and `Some (a + b)` keep their
existing named-`tuple_literal` parse. **Nothing that parsed before parses differently.**

**`Some -1` is `Some(-1)`.** Application binds tighter than binary operators and `negation`
is in the operand set. This is not Haskell's ambiguity: there, any identifier can be a
value, so the subtraction reading has an operand. Here `identifier` is lowercase-leading and
`const_identifier` is SCREAMING_CASE, so a PascalCase name in expression position is *always*
a constructor — never a variable, never a constant — and the subtraction reading has nothing
to bind. `MAX - 1` is untouched arithmetic. Reasoning and the residual hazard (a `-` overload
on a sum type whose nullary constructor sits bare on the left) are in `lyra/todo.md`.

**The operand must be atomic** — a literal, a name, a nullary constructor, a negated literal,
a struct/array literal, or another application. A compound operand is parenthesized
(`Ok(f(y))`, `Some(a.b)`). This is forced, not chosen: **every postfix form is headed by
`_postfix_expr`, which reaches `parenthesized_expr`**, so admitting `call_expr`/`member_expr`/
`index_expr`/`try_expr`/`deref_expr` as operands also admits `Some (x)…` while the parser
looks for the `.`/`[`/`?`/`^`. That reopens a third reading of `Some(x)` and tips the
pre-existing parameter-position race, so `(Some(x): Maybe<i64>) -> i64` stops parsing as a
destructured lambda parameter. No conflict entry fixes it; the reading has to not exist.

**In this region, tree-sitter's "unnecessary conflict" warning is unreliable — verify against
the corpus.** During this change it reported entries as unnecessary that were load-bearing
(dropping `[_tuple_name, _primary_expr, data_pattern]` broke the parameter case) *and*
reported one as unnecessary that genuinely was. The corpus is the only trustworthy signal,
the same lesson the signed-literal section records for the neighbouring rules.

Cost: 5,537 → 6,606 states, `parser.c` 9.4 MB → 12.0 MB (+19% / +28%). Juxtaposition is
genuinely expensive in an LR automaton — far below the 62,663-state `lambda_expr` incident,
but this is now the second-largest single feature in the parser. Run
`--report-states-for-rule -` before adding anything else here.

## Type Aliases vs `newtype`

Two declarations that look alike and mean opposite things:

- **`type Op = ((i64, i64)) -> i64`** (`include/types/type_alias.js`) is **transparent**. The name and the type are interchangeable — no conversion at the boundary, no identity of its own. The collector registers the aliased type *itself* under the alias's name, so the rest of the compiler needs no notion of aliases.
- **`newtype Volume = u8 where range(0..=100)`** (`include/types/constrained_type.js`) is **nominal**. It is a distinct type you opt into at a conversion site, which is what lets it carry `where` constraints.

They are not redundant, and neither is a flag on the other: one adds meaning at a boundary, the other removes repetition. The motivating case for an alias is a function type — `(g: ((i64, i64)) -> i64, …)` is where Lyra reads worst, and the double parens (one *tuple* parameter, since single parens would be two arguments) can only be named away, never spelled away. `newtype` cannot serve: it makes the value un-callable without unwrapping, which is right for a nominal type and useless here.

`type` is **not** a reserved word — it is a keyword only in this position, so `let type = 5` still compiles. Adding it to `reserved` would be a gratuitous break.

Corpus: `test/corpus/types/type_alias.txt`.
