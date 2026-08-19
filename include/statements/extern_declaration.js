module.exports = {
  // A foreign function: a signature with no body, and the effect bound its caller is
  // asked to trust.
  //
  //   extern getpid: () -> i32
  //   unsafe extern pure sqrt: (f64) -> f64
  //
  //   @link("m")
  //   unsafe extern pure log: (f64) -> f64
  //
  // **`unsafe` sits before `extern` and the bound after it**, which is not decoration: an
  // extern with no bound carries every effect and is safe to declare, while *narrowing*
  // the bound asserts something the compiler cannot check — a wrong `pure` does not fail
  // here, it silently corrupts the effect analysis of every caller. So the keyword marks
  // the claim, and the claim follows the keyword that makes it.
  //
  // The shape after `extern` is `trait_method`'s — leading effect modifiers, `name`, `:`,
  // a `lambda_type` — because they are the same kind of declaration: a signature standing
  // in for a body someone else supplies.
  //
  // **The modifiers are one `fn_modifiers` rather than stacked `optional`s, and the
  // difference was measured** (7,822 states before this rule):
  //
  //   | form                                    | states | cost |
  //   |-----------------------------------------|--------|------|
  //   | `extern name: type`, no modifiers       | 7,830  |  +8  |
  //   | `unsafe` + `fn_modifiers`               | 7,856  | +34  |
  //   | `unsafe` + three stacked `optional`s    | 7,952  | +130 |
  //
  // The declaration form itself is nearly free; the modifiers are the whole cost, and the
  // repeated-choice shape is four times cheaper than the stacked one. That is the
  // `lambda_expr` lesson at 1/500th the scale, and it lands the same way.
  //
  // What it costs is that the grammar admits more than the language means: order,
  // duplicates, the modifiers that are meaningless on an extern (`async`, `gen`, `rec`),
  // and an `unsafe` written *after* `extern`. All of that is the collector's to report —
  // the same trade `let` already makes (`lyra-E029`), and for the same reason: a semantic
  // mistake deserves a message naming the fix, not a syntax error pointing at whichever
  // token failed to shift.
  extern_declaration: ($) =>
    seq(
      optional(field("attributes", $.attribute_list)),
      optional(field("is_unsafe", $.unsafe_modifier)),
      "extern",
      optional(field("modifiers", $.fn_modifiers)),
      field("name", $.identifier),
      ":",
      field("signature", alias($.lambda_type, $.extern_signature)),
    ),
};
