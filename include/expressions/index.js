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
      $.data_constructor_expr,
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
      $.given_expr,
      $.sizeof_expr,
      $.for_loop,
      $.for_in_loop,
      // Note: user_defined_type_name is accessed via _postfix_expression -> _primary_expression
    ),

  block: ($) => prec.left(PREC.BLOCK, seq("{", repeat($.statement), "}")),

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

  // Data constructor application (single argument, no parens): Some fn(x), None
  // The argument is a *value* (`_constructor_value`), NOT the full `expression`
  // set: control-flow / block / statement-initiating expressions (`match`, `if`,
  // `{…}`, lambdas, loops, `await`/`yield`, `given`, `unsafe {…}`) are excluded.
  // Without statement terminators a nullary constructor would otherwise greedily
  // swallow the following statement — `let c = None\nmatch c {…}` parsed as
  // `None(match …)`. Restricting the argument keeps that `match` a separate
  // statement; an intentional control-flow argument must be parenthesized:
  // `Some (if c { a } else { b })`.
  data_constructor_expr: ($) =>
    seq(
      field("constructor", alias($.user_defined_type_name, $.data_type_name)),
      field("value", $._constructor_value),
    ),

  // The subset of `expression` usable as a bare data-constructor argument:
  // atomic / primary value forms only. Excludes (a) control-flow / block /
  // statement forms (so a nullary constructor can't swallow the next statement —
  // see data_constructor_expr) and (b) binary-operator expressions, which makes
  // application bind TIGHTER than binary ops — `Some 42 ?? d` is `(Some 42) ?? d`
  // and `Some a + b` is `(Some a) + b`, matching ML-style function application.
  // `negation`/`group` are kept so `Err -1` and `Some (a + b)` still work.
  _constructor_value: ($) =>
    choice(
      $._constructor_literal,
      $._number_literal,
      $.data_constructor_expr,
      $._postfix_expr,
      $.negation,
      $.group,
      $.address_of_expr,
      $.sizeof_expr,
      $.array_comp_expr,
    ),

  // Literal forms valid as a constructor argument: the same set as `_literal`
  // (and the same `prec.right(PREC.LITERAL)` wrapper, which lets composite
  // literals beat the corresponding pattern rules) MINUS `anonymous_struct_literal`
  // — a bare `{ … }` argument would otherwise shadow `named_struct_literal`
  // (`Point { x: 1 }` parsing as `Point({x: 1})` instead of a struct literal).
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
        $.tuple_literal,
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

  given_expr: ($) =>
    prec.right(
      PREC.GIVEN,
      seq(
        field("body", $.expression),
        "given",
        field("bindings", $.given_bindings),
      ),
    ),

  given_bindings: ($) =>
    seq(
      "{",
      repeat1(
        choice(
          $.declaration,
          $.const_declaration,
          $.destructuring_else_declaration,
        ),
      ),
      "}",
    ),

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
