/**
 * @file A tree-sitter parser for the Lyra Programming Language
 * @author Avram Eisner <avrame@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const modules = require("./include/modules/");
const literals = require("./include/literals/");
const numbers = require("./include/literals/numbers");
const expressions = require("./include/expressions/");
const types = require("./include/types/");
const statements = require("./include/statements");
const functions = require("./include/expressions/functions");
const comments = require("./include/comments");
const destructuring = require("./include/destructuring/destructuring");
const patterns = require("./include/patterns");
const attributes = require("./include/attributes");

module.exports = grammar({
  name: "lyra",

  supertypes: ($) => [$.expression, $.statement, $.pattern, $.type],

  extras: ($) => [/\s/, $.doc_comment, $.comment],

  externals: ($) => [
    $._BLOCK_COMMENT,
    $._string_start,
    $._string_content,
    $._interpolation_start,
    $._interpolation_end,
    $._string_end,
    $._raw_string_literal,
  ],

  inline: ($) => [$._comma],

  conflicts: ($) => [
    [$.named_struct_literal, $._tuple_name, $._primary_expr],
    [$._tuple_name, $._primary_expr, $.data_pattern],
    [$.parameter_type, $.tuple_type_element],
    // A parenthesized name can begin a lambda parameter list (`(a, b) => …`) or
    // an anonymous tuple / parenthesized expression (`(a, b)`, `(a)`). A bare
    // identifier is both a `pattern` (the lambda param) and an `expression` (the
    // tuple element), so GLR must keep both parses alive until `=>` (or its
    // absence) decides — otherwise the parser statically commits to the lambda
    // reading and `(a, b)`/`(a)` fail. The `[expression, literal_pattern]` entry
    // below already covers a *literal*-leading tuple (`(20, 22)`); this covers a
    // name-leading one (a bare `identifier` reduces to `pattern` for the lambda
    // param, or to `_primary_expr` for the tuple element).
    [$.pattern, $._primary_expr],
    [$.pattern, $.for_loop, $.for_in_loop],
    [$._primary_expr, $.for_loop, $.for_in_loop],
    [$._primary_expr, $.data_pattern],
    // A postfix form (identifier, call, member access, …) can appear on
    // its own as an `expression` or as the left operand of a math /
    // comparison / compound-assignment operator. Tree-sitter needs the
    // one-symbol look-ahead to decide between the two.
    [$.expression, $._math_operand],
    // A bare number literal now reaches `expression` directly (not via the
    // precedence-wrapped `_literal` — see note in literals/index.js). Routing
    // numbers around the wrapper is what fixes `0 - 200` parsing as `0` plus a
    // dangling `negation(-200)`: it lets the `expression/_math_operand`
    // conflict above resolve the literal-left case toward subtraction, exactly
    // as it already does for identifier/postfix operands. The direct route
    // also means a bare number could be a complete `expression` or a pattern
    // (e.g. inside `(`/match contexts), so that conflict must be declared too.
    [$.expression, $.literal_pattern],
    // A literal or postfix form can appear on its own as an `expression`
    // or as an operand of a boolean && / || operator. Mirrors the
    // expression/_math_operand conflict above.
    [$.expression, $._bool_operand],
    // A postfix form can be a _bool_operand (right side of &&/||) or a
    // _math_operand (left side of a binary math expression). Tree-sitter
    // needs a lookahead to decide between the two.
    [$._bool_operand, $._math_operand],
    // A literal or postfix form can appear on its own as an `expression`
    // or as an operand of a comparison (==, !=, <, >, <=, >=) operator.
    // Mirrors the expression/_math_operand and expression/_bool_operand
    // conflicts above.
    [$.expression, $._comparison_operand],
    // A comparison operand can also be a math operand or bool operand in
    // ambiguous positions (e.g. `&x == y` where `x` could be either).
    [$._comparison_operand, $._math_operand],
    [$._bool_operand, $._comparison_operand],
    // A bare identifier can be either a primary expression or the label
    // prefix of a labeled for/for-in loop expression.
    // for_loop/for_in_loop with and without a label over the same token sequence.
    [$.for_loop],
    [$.for_in_loop],
  ],

  reserved: {
    identifier: () => [
      "for",
      "if",
      "else",
      "match",
      "let",
      "var",
      "const",
      "readonly",
      "true",
      "false",
      "import",
      "module",
      "as",
      "pub",
      "async",
      "await",
      "Self",
      "stack",
      "shared",
      "weak",
      "with",
      "pure",
      "det",
      "noalloc",
      "gen",
      "rec",
      "yield",

      "fixed",
      "unsafe",
      "mut",
      "ref",
      "own",
      "void",
    ],
  },

  rules: {
    // Updated program rule
    program: ($) =>
      seq(
        optional($.module_declaration),
        repeat($.import_statement),
        repeat($.statement),
      ),

    _comma: ($) => ",",

    ...literals,
    ...numbers,
    ...modules,
    ...expressions,
    ...types,
    ...statements,
    ...functions,
    ...comments,
    ...destructuring,
    ...patterns,
    ...attributes,
  },
});
