const { commaSep1, rangeBounds } = require("../helpers");

module.exports = {
  constrained_type: ($) =>
    seq(
      optional(field("visibility", $.visibility)),
      "newtype",
      field("name", alias($.user_defined_type_name, $.constrained_type_name)),
      "=",
      seq(
        field("type", $.type),
        optional(seq("where", field("constraints", $.constraints))),
      ),
    ),

  constraints: ($) => commaSep1($._constraint),

  _constraint: ($) =>
    choice(
      $.range_constraint,
      $.pattern_constraint, // for strings
      $.precision_constraint, // for floats
      $.step_constraint, // for floats
      $.literal_union_constraint,
    ),

  // Literal union constraint
  literal_union_constraint: ($) =>
    seq("values", "(", field("values", commaSep1($.literal_val)), ")"),
  literal_val: ($) => choice($.string_literal, $._number_literal),

  // Range constraint: `range(0..<=100)`, `range(0..)`, `range(..<360)`.
  //
  // Either bound may be omitted — an absent one is the base type's own limit —
  // but not both: `range(..)` constrains nothing, and rangeBounds' `open` mode
  // makes it unspellable rather than leaving it to a diagnostic.
  //
  // The `<`/`=` token used to be its own pair of node kinds here
  // (`less_than_comparator` / `equal_to_comparator`) under a `comparator` field,
  // for the same two characters `range_end_operator` already covered in the
  // expression and pattern rules. That was naming drift and nothing else; it cost
  // a third collector path and a third case anywhere the CST is read. The field
  // is now `end_operator` everywhere.
  range_constraint: ($) =>
    seq(
      "range",
      "(",
      rangeBounds($, { startOperand: $.constraint_math_expr, open: true }),
      ")",
    ),

  // Regex constraint (String)
  pattern_constraint: ($) =>
    seq("pattern", "(", field("pattern", $.regex_literal), ")"),

  // Precision constraint
  precision_constraint: ($) =>
    seq(
      "precision",
      "(",
      field("value", $.constraint_math_expr),
      optional(seq(",", field("rounding_mode", $.rounding_mode))),
      ")",
    ),

  // Rounding mode (defaults to "nearest even")
  rounding_mode: ($) =>
    choice(
      $.even_rounding_mode,
      $.zero_rounding_mode,
      $.up_rounding_mode,
      $.down_rounding_mode,
      $.truncate_rounding_mode,
    ),
  even_rounding_mode: ($) => "round_even",
  zero_rounding_mode: ($) => "round_zero",
  up_rounding_mode: ($) => "round_up",
  down_rounding_mode: ($) => "round_down",
  truncate_rounding_mode: ($) => "round_trunc",

  // Step constraint (float_literal)
  step_constraint: ($) =>
    seq("step", "(", field("value", $.constraint_math_expr), ")"),
};
