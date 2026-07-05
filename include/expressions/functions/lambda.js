const { commaSep, commaSep1, parameterList } = require("../../helpers");
const unsafe = require("../unsafe");

module.exports = {
  lambda_expr: ($) =>
    seq(
      optional(field("is_unsafe", $.unsafe_modifier)),
      optional(field("is_pure", $.pure_modifier)),
      optional(field("is_det", $.det_modifier)),
      optional(field("is_noalloc", $.noalloc_modifier)),
      optional(field("is_async", $.async_modifier)),
      optional(field("is_gen", $.gen_modifier)),
      optional(field("is_rec", $.rec_modifier)),
      field("parameters", $.parameter_list),
      optional(field("return_type", $.return_type)),
      choice(
        seq("=>", field("body", $.expression)),
        field("lambda_clauses", $.lambda_clause_list),
      ),
    ),

  return_type: ($) =>
    seq(
        "->",
        optional(
          field("type_modifier", $.type_modifier)
        ),
        field("type", $.type)
      ),


  unsafe_modifier: ($) => "unsafe",
  pure_modifier: ($) => "pure",
  // `det` (deterministic): same inputs -> same outputs. Coarser than `pure` —
  // permits mutation and allocation, forbids ambient rand/time/io. Mutually
  // exclusive with `pure` (a semantic rule enforced by the checker, not here).
  det_modifier: ($) => "det",
  // `noalloc`: heap-allocation-free. Orthogonal resource bound — stacks onto
  // any purity rung (`pure noalloc`, `det noalloc`) for hot loops / real-time.
  noalloc_modifier: ($) => "noalloc",
  async_modifier: ($) => "async",
  gen_modifier: ($) => "gen",
  rec_modifier: ($) => "rec",

  parameter_list: ($) => parameterList($.parameter),

  parameter: ($) =>
    field(
      "parameter",
      seq(
        field("pattern", $.pattern),
        optional(
          seq(
            ":",
            optional(field("type_modifier", $.type_modifier)),
            optional(field("type", $.type)),
          )
        ),
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
