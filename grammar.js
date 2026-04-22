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
const functions = require("./include/functions/");
const comments = require("./include/comments");
const destructuring = require("./include/destructuring/destructuring");
const patterns = require("./include/patterns");

module.exports = grammar({
  name: "lyra",

  supertypes: ($) => [$.expression, $.statement, $.pattern, $.type],

  extras: ($) => [/\s/, $.comment],

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
    [
      $.struct_literal,
      $._tuple_name,
      $.data_constructor_expression,
      $._primary_expression,
    ],
    [$.struct_literal, $.struct_literal],
    [$.data_constructor_expression, $._primary_expression],
    [$.data_constructor_expression, $._primary_expression, $.data_pattern],
    [$._primary_expression, $.data_pattern],
    [$._field_value, $.expression_statement],
    [$.parameter_type, $.tuple_type_element],
    [$.function_clause, $.expression],
    // A postfix form (identifier, call, member access, …) can appear on
    // its own as an `expression` or as the left operand of a math /
    // comparison / compound-assignment operator. Tree-sitter needs the
    // one-symbol look-ahead to decide between the two.
    [$.expression, $._math_operand],
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
      "def",
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
      "heap",
      "shared",
      "weak",
      "with",
      "pure",
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
  },
});
