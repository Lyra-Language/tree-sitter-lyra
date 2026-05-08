const { commaSep, commaSep1, parameterList } = require("../../helpers");
const unsafe = require("../unsafe");

module.exports = {
  lambda_expr: ($) =>
    seq(
      optional(field("is_unsafe", $.unsafe_modifier)),
      optional(field("is_pure", $.pure_modifier)),
      optional(field("is_async", $.async_modifier)),
      optional(field("is_gen", $.gen_modifier)),
      optional(field("is_rec", $.rec_modifier)),
      field("parameters", $.parameter_list),
      optional(field("return_type", seq("->", optional($.type_modifier), $.type))),
      choice(
        seq("=>", field("body", $.expression)),
        field("lambda_clauses", $.lambda_clause_list),
      ),
    ),

  unsafe_modifier: ($) => "unsafe",
  pure_modifier: ($) => "pure",
  async_modifier: ($) => "async",
  gen_modifier: ($) => "gen",
  rec_modifier: ($) => "rec",

  parameter_list: ($) => parameterList($.parameter),

  parameter: ($) =>
    field(
      "parameter",
      seq(
        field("pattern", $.pattern),
        optional(seq(":", optional($.type_modifier), field("type", $.type))),
        optional(field("default_value", $.default_value)),
      ),
    ),

  default_value: ($) => seq("=", field("expression", $.expression)),
  
  lambda_clause_list: ($) => seq("{", commaSep1($.lambda_clause), "}"),

  lambda_clause: ($) =>
    seq(
      field("parameters", $.pattern_parameter_list),
      optional(field("guard", $.guard)),
      "=>",
      field("body", $.expression),
    ),

  pattern_parameter_list: ($) => parameterList($.pattern),
};
