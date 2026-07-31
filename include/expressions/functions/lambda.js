const { commaSep, commaSep1, parameterList } = require("../../helpers");
const unsafe = require("../unsafe");

module.exports = {
  lambda_expr: ($) =>
    seq(
      // One repeated choice, **not** seven optionals in sequence. This is the single
      // biggest thing in the grammar by generated size: seven independent `optional()`s
      // give an LR automaton 2^7 = 128 distinct prefixes to track before the parameter
      // list, and because the GLR conflicts around `(` keep the lambda-parameter-list,
      // tuple and parenthesized-expression readings alive simultaneously, each prefix
      // grew its own family of states across the whole expression grammar. Measured:
      // `lambda_expr` owned 57,026 of 62,663 states (91%), and collapsing it to this form
      // took the parser to 6,475 states — `src/parser.c` from 116 MB to 12.8 MB, which is
      // what took it back out of Git LFS.
      //
      // The cost is that **order and repetition are no longer parse errors**: `async pure`
      // and `pure pure` now parse. Both are rejected by `lyra`'s collector with a message
      // naming the canonical order, which is a better diagnostic than a syntax error
      // pointing at the wrong token — and the semantic half of this (`pure` and `det`
      // conflicting) already lived there rather than here.
      //
      // Fields still attach per child, so `ChildByFieldName("is_pure")` is unchanged.
      repeat(
        choice(
          field("is_unsafe", $.unsafe_modifier),
          field("is_pure", $.pure_modifier),
          field("is_det", $.det_modifier),
          field("is_noalloc", $.noalloc_modifier),
          field("is_async", $.async_modifier),
          field("is_gen", $.gen_modifier),
          field("is_rec", $.rec_modifier),
        ),
      ),
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
