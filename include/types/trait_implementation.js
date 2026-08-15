const { parameter } = require("../expressions/functions/lambda");
const { commaSep1, memberList, parameterList } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  trait_implementation: ($) =>
    prec.right(
      PREC.TRAIT_IMPL,
      seq(
        "impl",
        field("trait_name", alias($.user_defined_type_name, $.trait_name)),
        optional(field("generic_parameters", seq("<", commaSep1($.type), ">"))),
        "for",
        field("type", $.type),
        optional(seq("where", field("constraints", $.impl_constraints))),
        // **The body is optional, braces and all**, matching `trait_declaration` — so an
        // umbrella's pair reads as a pair: `trait Arithmetic: Add + Mul` above
        // `impl Arithmetic for Vec2`. The *methods* were already optional; this drops the
        // `{}` that was left standing around nothing.
        //
        // Same reasoning as the trait's, and the same reason Rust cannot follow: there is
        // no body to delimit, and a language with a statement terminator does not need a
        // brace to say where a declaration ended. The thirteen
        // `impl Arithmetic for <width> {}` lines in the prelude are what makes it worth
        // having rather than merely consistent.
        //
        // The ambiguity it creates is the trait's, and the terminator settles it the same
        // way: a `{` on the *next* line is a block statement, not this impl's body.
        optional(seq("{", optional(field("methods", $.impl_methods)), "}")),
      ),
    ),

  impl_constraints: ($) =>
    seq($.impl_constraint, repeat(seq(",", $.impl_constraint)), optional(",")),

  impl_constraint: ($) =>
    seq(
      field(
        "generic_type",
        choice($.generic_type, alias($.identifier, $.generic_type)),
      ),
      ":",
      field("trait_impl_bounds", $.generic_bounds),
    ),

  // One per line or comma-separated, matching trait_methods.
  impl_methods: ($) => memberList($, $.trait_method_implementation),

  // Purity/effect bounds sit between `=` and the clause, mirroring a free
  // function's `name = pure (params) => body` — they modify the value being
  // bound, not the name. `det`/`noalloc` parallel `pure` (see lambda.js).
  trait_method_implementation: ($) =>
    seq(
      field("method_name", $.method_name),
      "=",
      optional(field("is_pure", $.pure_modifier)),
      optional(field("is_det", $.det_modifier)),
      optional(field("is_noalloc", $.noalloc_modifier)),
      field("method_clause", alias($.lambda_clause, $.method_clause)),
    ),

  method_name: ($) => choice($.identifier, $.unary_operator, $.binary_operator),
};
