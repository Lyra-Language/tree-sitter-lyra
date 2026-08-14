const { commaSep1, memberList } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  trait_declaration: ($) =>
    seq(
      // `@builtin(Ord)` / `@builtin(Eq)` — the marker that confers compiler-known
      // identity on a trait, exactly as it does on a `data` type. Placed before the
      // visibility for the same reason data_type does: an attribute annotates the
      // whole declaration, so it reads above `pub trait …`.
      optional(field("attributes", $.attribute_list)),
      optional(field("visibility", $.visibility)),
      "trait",
      field("name", alias($.user_defined_type_name, $.trait_name)),
      optional(field("generic_parameters", $.generic_parameters)),
      optional(seq(":", field("trait_bounds", alias($.generic_bounds, $.trait_bounds)))),
      optional(
        seq(
          "where",
          field(
            "generic_parameter_constraints",
            $.generic_parameter_constraints,
          ),
        ),
      ),
      // **The body is optional, braces and all**, so an *umbrella* trait parses in both
      // spellings: `trait Arithmetic: Add + Mul` and `… { }`. It adds no methods of its
      // own and exists to name a bundle of supertraits.
      //
      // Required until 08/14, and deliberately: a trait with no methods meant nothing, so
      // refusing `trait C {}` cost an author nothing. Supertraits are what changed the
      // arithmetic — enforced 08/07, reachable through a bound 08/14 — and an umbrella is
      // the shape anyone writing `where t: Arithmetic` wants. `impl_methods` was already
      // optional, so the impl half (`impl Arithmetic for Vec2 {}`) had been parsing the
      // whole time; only the declaration could not be written.
      //
      // The bodiless form is the one an author reaches for — there is no body, so there
      // is nothing to delimit — and Rust's `trait A: B {}` requires the braces only
      // because its grammar has no statement terminator to end the declaration. This one
      // does, which is what makes the brace optional here and not there.
      //
      // The member list itself stays non-empty (memberList is commaSep1-shaped): the
      // *list* is absent rather than empty, which is what keeps `trait C { , }` an error.
      optional(
        seq("{", optional(field("methods", $.trait_methods)), "}"),
      ),
    ),

  generic_bounds: ($) =>
    seq(
      alias($.user_defined_type_name, $.trait_name),
      repeat(seq("+", alias($.user_defined_type_name, $.trait_name))),
    ),

  generic_parameter_constraints: ($) =>
    seq(
      $.generic_parameter_constraint,
      repeat(seq(",", $.generic_parameter_constraint)),
      optional(","),
    ),

  generic_parameter_constraint: ($) =>
    seq(
      field("generic_type", $.generic_type),
      ":",
      field("generic_bounds", $.generic_bounds),
    ),

  // One per line or comma-separated — see memberList in helpers.js.
  trait_methods: ($) => memberList($, $.trait_method),

  trait_method: ($) =>
    seq(
      optional(field("is_pure", $.pure_modifier)),
      optional(field("is_det", $.det_modifier)),
      optional(field("is_noalloc", $.noalloc_modifier)),
      field("name", choice($.identifier, $.unary_operator, $.binary_operator)),
      ":",
      field("signature", alias($.lambda_type, $.trait_method_signature)),
      optional(field("default", $.default_method_implementation)),
    ),

  default_method_implementation: ($) =>
    seq("=", field("body", alias($.lambda_clause, $.default_method_clause))),

  unary_operator: ($) =>
    prec(PREC.OPERATOR_OVERLOAD, seq("(", choice($.prefix_operator, $.suffix_operator), ")")),

  prefix_operator: ($) => prec(PREC.OPERATOR_OVERLOAD, seq(choice("-", "!", "~"), "_")),

  suffix_operator: ($) => prec(PREC.OPERATOR_OVERLOAD, seq("_", choice("++", "--"))),

  binary_operator: ($) =>
    prec(
      PREC.OPERATOR_OVERLOAD,
      seq(
        "(",
        "_",
        choice(
          token("=="),
          token("!="),
          token(">"),
          token("<"),
          token(">="),
          token("<="),
          token("<=>"),
          token("&&"),
          token("||"),
          token("+"),
          token("-"),
          token("*"),
          token("/"),
          token("%"),
          token("**"),
          token("<<"),
          token(">>"),
          token("&"),
          token("|"),
          // Xor is `~`, not `^` — `^` is spoken for by raw-pointer types (`^T`)
          // and postfix deref (`ptr^`), so a binary `^` would be ambiguous with
          // a deref in operand position. See include/expressions/math.js.
          token("~"),
        ),
        "_",
        ")",
      ),
    ),
};
