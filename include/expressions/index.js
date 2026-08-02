const control_flow = require("./control_flow/");
const boolean = require("./boolean");
const array_comp_expr = require("./array_comprehension");
const math = require("./math");
const range = require("./range");
const postfix = require("./postfix");
const functions = require("./functions");
const unsafe = require("./unsafe");
const builtins = require("./builtins");
const for_loop = require("../statements/control_flow/for_loop");
const for_in_loop = require("../statements/control_flow/for_in_loop");
const { PREC } = require("../prec");
const { statementList } = require("../helpers");

module.exports = {
  expression: ($) =>
    choice(
      $.block,
      $.unsafe_block,
      $.await_expr,
      $.yield_expr,
      $.yield_from_expr,
      $._literal,
      $._number_literal, // direct, not via _literal — see note in literals/index.js
      $._postfix_expr,
      $._math_expr,
      $.string_concat_expr,
      $.boolean_expr,
      $.range_expr,
      $.if_block_expr,
      $.match_expr,
      $.lambda_expr,
      $.array_comp_expr,
      $.spread_expr,
      $.null_coalescing_expr,
      $.compose_expr,
      $.address_of_expr,
      $.sizeof_expr,
      $.for_loop,
      $.for_in_loop,
      $.data_constructor_expr,
      // Note: user_defined_type_name is accessed via _postfix_expression -> _primary_expression
    ),

  block: ($) =>
    prec.left(PREC.BLOCK, seq("{", optional(statementList($)), "}")),

  // Await expression for async operations
  await_expr: ($) =>
    prec.right(PREC.AWAIT, seq("await", field("operand", $.expression))),

  // Yield expression for generator functions
  yield_expr: ($) =>
    prec.right(PREC.AWAIT, seq("yield", field("value", $.expression))),

  // Yield-from for delegating to a sub-generator
  // Higher precedence than yield_expr to win over "yield (from-as-identifier)"
  yield_from_expr: ($) =>
    prec.right(
      PREC.YIELD_FROM,
      seq("yield", "from", field("generator", $.expression)),
    ),

  identifier: ($) => token(prec(PREC.IDENTIFIER_TOKEN, /(_[a-zA-Z0-9_]+|[a-z][a-zA-Z0-9_]*)/)),
  const_identifier: ($) => /[A-Z][A-Z0-9_]*/,

  // Grouping
  parenthesized_expr: ($) => seq("(", $.expression, ")"),

  // Data construction by **juxtaposition**: `Some 42`, `Err -1`, `Ok compute()`,
  // `Some x`. A nullary constructor is its bare name (`None`).
  //
  // **One operand, never curried.** `Some 42` applies `Some` to one value; there
  // is no `Rect 3 4`. That is not a restriction on top of currying, it is what a
  // constructor already *is* here: the collector wraps a positional payload in a
  // single anonymous tuple (`Rect(f64, f64)` → one `TupleType{f64, f64}` param).
  // So `Rect(3, 4)` re-reads as "Rect applied to the tuple `(3, 4)`" — the parens
  // belong to the tuple, not to a call — and means exactly what it did before.
  //
  // **Parenthesized operands are deliberately NOT in `_constructor_value`.** A
  // parenthesized form after a constructor name keeps its existing named
  // `tuple_literal` parse, so `Some(42)`, `Rect(3, 4)` and `Some (a + b)` produce
  // the same tree they always have. Juxtaposition adds the *unparenthesized*
  // spellings and changes nothing that already parsed — no migration, and one
  // node kind downstream rather than two spellings to reconcile.
  //
  // This was removed 06/18/26 and is restored because its stated reason expired.
  // The commit that removed it says the machinery existed "solely to prevent a
  // nullary constructor from greedily consuming the next statement in the
  // terminator-less grammar" — `let c = None` ⏎ `match c {…}` parsing as
  // `None(match …)`. Statements gained a terminator on 07/31/26, six weeks later,
  // so a newline now ends that binding on its own. The operand set stays narrow
  // anyway (no control-flow, block or statement-initiating forms) because that is
  // also what makes application bind *tighter* than binary operators, which is
  // the ML reading: `Some 42 ?? d` is `(Some 42) ?? d`, `Some a + b` is
  // `(Some a) + b`. An intentional control-flow argument is parenthesized:
  // `Some (if c { a } else { b })`.
  //
  // Restoring it also removes a real asymmetry: `Some 42` has always been legal
  // in *pattern* position (`data_pattern` is `Name pattern`), so the two positions
  // disagreed about the language's own constructor syntax.
  data_constructor_expr: ($) =>
    seq(
      field("constructor", alias($.user_defined_type_name, $.data_type_name)),
      field("value", $._constructor_value),
    ),

  // **A juxtaposed operand must be atomic**: a literal, a name, a nullary
  // constructor, a negated literal, a struct/array literal, or another juxtaposed
  // application. A *compound* operand — a call, a member access, an index, `?`,
  // a deref, arithmetic — is parenthesized (`Ok(f(y))`, `Some(a.b)`), which is
  // the spelling those already had.
  //
  // That rule is not a style preference, it is forced. **Every postfix form is
  // headed by `_postfix_expr`, which reaches `parenthesized_expr` through
  // `_primary_expr`** — so admitting `member_expr`, `call_expr`, `index_expr`,
  // `try_expr` or `deref_expr` as an operand also admits `Some (x)…` while the
  // parser looks for the `.`/`[`/`?`/`^`. That reopens a third reading of
  // `Some(x)` (constructor applied to a parenthesized operand) on top of the
  // named-tuple expression and the data pattern, and it does not merely add
  // ambiguity: it tips the pre-existing parameter-position race, so
  // `(Some(x): Maybe<i64>) -> i64` stops parsing as a destructured lambda
  // parameter. No conflict entry fixes that — the reading has to not exist.
  // Verified by bisecting the operand set against the corpus; the "unnecessary
  // conflict" warnings are unreliable in this region, so trust the corpus.
  //
  // Also excluded, for the separate reason that makes application bind *tighter*
  // than binary operators: control-flow / block / statement forms, and
  // binary-operator expressions. `negation` is kept so `Err -1` works — see the
  // `Some -1` decision in lyra/todo.md for why that is safe here and is not the
  // Haskell ambiguity: a PascalCase name is never a variable (`identifier` is
  // lowercase-leading) and never a constant (`const_identifier` is
  // SCREAMING_CASE), so the subtraction reading has no operand to bind.
  _constructor_value: ($) =>
    choice(
      $._constructor_literal,
      $._number_literal,
      $.data_constructor_expr,
      $.identifier,
      $.const_identifier,
      $.user_defined_type_name,
      $.negation,
      $.address_of_expr,
      $.sizeof_expr,
      $.array_comp_expr,
    ),

  // Literal forms valid as a constructor operand: `_literal` minus the two
  // brace/paren forms that would shadow an existing parse —
  // `anonymous_struct_literal` (a bare `{ … }` operand would make
  // `Point { x: 1 }` read as `Point({x: 1})` instead of a struct literal) and
  // `tuple_literal` (which is how `Some(42)` and `Rect(3, 4)` already parse, and
  // must stay that way).
  _constructor_literal: ($) =>
    prec.right(
      PREC.LITERAL,
      choice(
        $.array_literal,
        $.array_repeat_init,
        $.boolean_literal,
        $.char_literal,
        $.regex_literal,
        $.string_literal,
        $.raw_string_literal,
        $.named_struct_literal,
      ),
    ),

  // Null coalescing - provide default value for Maybe<T>
  null_coalescing_expr: ($) =>
    prec.right(
      PREC.NULL_COALESCE,
      seq(
        field("optional", $.expression),
        "??",
        field("default", $.expression),
      ),
    ),

  spread_expr: ($) =>
    prec.right(PREC.SPREAD, seq("...", field("spread_name", $.identifier))),

  // Function composition: f >> g produces a function that applies f then g
  // Right-associative so `f >> g >> h` means `f >> (g >> h)`
  compose_expr: ($) =>
    prec.right(
      PREC.COMPOSE,
      seq(
        field("left", $.expression),
        field("operator", $.compose_operator),
        field("right", $.expression),
      ),
    ),

  compose_operator: ($) => "->>",

  ...control_flow,
  ...boolean,
  ...math,
  ...range,
  ...array_comp_expr,
  ...postfix,
  ...functions,
  ...unsafe,
  ...builtins,
  ...for_loop,
  ...for_in_loop,
};
