const control_flow = require("./control_flow/");
const boolean = require("./boolean");
const array_comp_expr = require("./array_comprehension");
const math = require("./math");
const range = require("./range");
const postfix = require("./postfix");
const functions = require("./functions");
const unsafe = require("./unsafe");
const { PREC } = require("../prec");

module.exports = {
  expression: ($) =>
    choice(
      $.block,
      $.unsafe_block,
      $.await_expression,
      $.yield_expression,
      $.yield_from_expression,
      $._literal,
      $.data_constructor_expression,
      $._postfix_expression,
      $._math_expr,
      $.boolean_expr,
      $.range_expression,
      $.if_block_expr,
      $.match_expr,
      $.lambda_expr,
      $.array_comp_expr,
      $.spread_expr,
      $.null_coalescing_expression,
      $.compose_expression,
      $.address_of_expression,
      $.given_expression,
      // Note: user_defined_type_name is accessed via _postfix_expression -> _primary_expression
    ),

  block: ($) => prec.left(PREC.BLOCK, seq("{", repeat($.statement), "}")),

  // Await expression for async operations
  await_expression: ($) =>
    prec.right(PREC.AWAIT, seq("await", field("operand", $.expression))),

  // Yield expression for generator functions
  yield_expression: ($) =>
    prec.right(PREC.AWAIT, seq("yield", field("value", $.expression))),

  // Yield-from for delegating to a sub-generator
  // Higher precedence than yield_expression to win over "yield (from-as-identifier)"
  yield_from_expression: ($) =>
    prec.right(PREC.YIELD_FROM, seq("yield", "from", field("generator", $.expression))),

  identifier: ($) => token(prec(PREC.IDENTIFIER_TOKEN, /[a-z][a-zA-Z0-9_]*/)),
  const_identifier: ($) => /[A-Z][A-Z0-9_]*/,

  // Grouping
  parenthesized_expression: ($) => seq("(", $.expression, ")"),

  // Data constructor application (single argument, no parens): Some fn(x), None
  data_constructor_expression: ($) =>
    seq(
      field("constructor", alias($.user_defined_type_name, $.data_type_name)),
      field("value", $.expression),
    ),

  // Null coalescing - provide default value for Maybe<T>
  null_coalescing_expression: ($) =>
    prec.right(
      PREC.NULL_COALESCE,
      seq(
        field("optional", $.expression),
        "??",
        field("default", $.expression),
      ),
    ),

  spread_expr: ($) => prec.right(PREC.SPREAD, seq("...", $.identifier)),

  // Function composition: f >> g produces a function that applies f then g
  // Right-associative so `f >> g >> h` means `f >> (g >> h)`
  compose_expression: ($) =>
    prec.right(
      PREC.COMPOSE,
      seq(
        field("left", $.expression),
        field("operator", $.compose_operator),
        field("right", $.expression),
      ),
    ),

  compose_operator: ($) => "->>",

  given_expression: ($) =>
    prec.right(PREC.GIVEN, seq(
      field("body", $.expression),
      "given",
      field("bindings", $.given_bindings),
    )),

  given_bindings: ($) =>
    seq("{", repeat1(choice($.declaration, $.const_declaration)), "}"),

  ...control_flow,
  ...boolean,
  ...math,
  ...range,
  ...array_comp_expr,
  ...postfix,
  ...functions,
  ...unsafe,
};
