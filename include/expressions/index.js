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

  // Data construction uses ordinary call syntax — `Some(42)`, `Ok(compute())`,
  // `Err(-1)` (a nullary constructor is just its bare name, `None`). The applied
  // form parses as a named `tuple_literal`; the typechecker resolves a name that
  // is a data-type constructor to its owning data type. There is no juxtaposition
  // application (`Some 42`) — requiring parens removes the terminator-less
  // ambiguity that the old `data_constructor_expr` / `_constructor_value` rules
  // existed to work around (a nullary constructor swallowing the next statement).

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
