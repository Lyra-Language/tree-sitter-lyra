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
    [$.struct_literal, $._tuple_name, $.data_constructor_expr, $._primary_expr],
    [$.struct_literal, $.struct_literal],
    [$.data_constructor_expr, $._primary_expr],
    [$.data_constructor_expr, $._primary_expr, $.data_pattern],
    [$._primary_expr, $.data_pattern],
    [$.parameter_type, $.tuple_type_element],
    // A postfix form (identifier, call, member access, …) can appear on
    // its own as an `expression` or as the left operand of a math /
    // comparison / compound-assignment operator. Tree-sitter needs the
    // one-symbol look-ahead to decide between the two.
    [$.expression, $._math_operand],
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
    [$._primary_expr, $.for_loop, $.for_in_loop],
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
      "gen",
      "yield",

      "fixed",
      "unsafe",
      "given",
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
