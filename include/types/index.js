const allocation = require("./allocation");
const constrained_type = require("./constrained_type");
const data_type = require("./data_type");
const lambda_type = require("./lambda_type");
const generic_type = require("./generic_type");
const number_types = require("./number_types");
const struct_type = require("./struct_type");
const tuple_type = require("./tuple_type");
const type_alias = require("./type_alias");
const union_type = require("./union_type");
const trait_declaration = require("./trait_declaration");
const trait_implementation = require("./trait_implementation");
const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  type_annotation: ($) => seq(":", field("type", $.type)),

  return_type_annotation: ($) => seq("->", field("type", $.type)),

  type_declaration: ($) =>
    choice(
      $.struct_type,
      $.union_type,
      $.data_type,
      $.named_tuple_type,
      $.constrained_type,
      $.type_alias,
    ),

  type: ($) =>
    prec(
      PREC.TYPE,
      choice(
        $._primitive_type,
        $.parameterized_type,
        $.self_type,
        $.void_type,
        $.user_defined_type_name,
        alias($.qualified_type_name, $.user_defined_type_name),
        $.array_type,
        $.generic_type,
        $.lambda_type,
        $.allocated_type,
        $.weak_type,
        $.anonymous_tuple_type,
        $.raw_pointer_type,
        $.anonymous_struct_type,
      ),
    ),

  raw_pointer_type: ($) =>
    seq("^", optional(field("is_mut", "mut")), field("pointee", $.type)),

  user_defined_type_name: ($) => /[A-Z][a-zA-Z0-9]*/,

  // **A name reached through a namespace import** (10/29): `shapes.Circle(2)`, `shapes.Pt {
  // x: 1 }`, `p: shapes.Pt`, `shapes.Dot =>`. One token, so it never contests member access:
  // a field is lowercase, and the lexer takes the longest match where both are legal.
  //
  // **The name's second letter is lowercase** (or a digit), because an all-caps one is a
  // constant: `vdp.SCREEN_WIDTH` must stay a namespace's member, and a token reaching
  // `[A-Z][a-zA-Z0-9]*` would lex `vdp.SCREEN` and strand `_WIDTH`. So `lib.A` and
  // `lib.RGB` cannot be qualified — rename the type, or import it by name.
  //
  // Aliased in each position to the node kind the unqualified name has there
  // (`user_defined_type_name`, `tuple_name`, `struct_name`, `data_type_name`), so a reader
  // of that node sees the dotted text and nothing else changes shape.
  qualified_type_name: ($) =>
    token(seq(/[a-z][a-zA-Z0-9_]*/, ".", /[A-Z][a-z0-9][a-zA-Z0-9]*/)),

  self_type: ($) =>
    seq("Self", optional(field("generic_parameters", $.generic_parameters))),

  void_type: ($) => "void",

  // Parameterized types like Maybe<i>, Tree<a>, Self<a>. An argument may be a hole,
  // `Result<_, e>`: in an impl target it marks the position a trait's `Self<…>` argument
  // occupies (the collector refuses a hole anywhere else).
  parameterized_type: ($) =>
    seq(
      field("name", choice(
        "Self",
        $.user_defined_type_name,
        alias($.qualified_type_name, $.user_defined_type_name),
      )),
      "<",
      field("type_arguments", commaSep1(choice($.type, $.hole_type))),
      ">",
    ),

  hole_type: ($) => "_",

  _primitive_type: ($) =>
    choice(
      $._integer_type,
      $.float_type,
      $.fixed_point_type,
      $.string_type,
      $.boolean_type,
      $.rune_type,
    ),

  string_type: ($) => "string",

  boolean_type: ($) => "bool",

  // A Unicode code point (i32), matching Go/Odin's `rune`. The literal syntax is
  // still a character literal `'a'` (like Go, whose `token.CHAR` yields a `rune`).
  rune_type: ($) => "rune",

  default_field_value: ($) => seq("=", $.expression),

  ...allocation,
  ...constrained_type,
  ...data_type,
  ...lambda_type,
  ...generic_type,
  ...number_types,
  ...struct_type,
  ...union_type,
  ...tuple_type,
  ...type_alias,
  ...trait_declaration,
  ...trait_implementation,
};
