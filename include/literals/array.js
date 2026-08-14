const { commaSep } = require("../helpers");

module.exports = {
  array_literal: ($) =>
    seq("[", commaSep($.expression), "]"),

  // Array repeat initialization: [value; count]
  // Creates an array with `count` copies of `value`
  array_repeat_init: ($) =>
    seq(
      "[",
      field("value", $.expression),
      ";",
      field("count", $.array_repeat_count),
      "]",
    ),

  // **Any expression, with the constant rule moved to the typechecker** (08/14).
  //
  // It was `choice($._number_literal, $.const_identifier)`, which is exactly right for a
  // **fixed** array — `[3]T` carries its size in its type, and a type cannot depend on a
  // value the compiler has not got — and wrong for a **dynamic** one, which carries its
  // length at run time and needs nothing static. The restriction was inherited by the
  // dynamic form rather than reasoned for it, so `let buf: []u32 = [0; n]` was a *syntax*
  // error for a buffer sized by a window resize.
  //
  // The grammar cannot make that distinction: which one `[0; n]` builds is decided by the
  // annotation it is checked against, which is not visible here. So this accepts the
  // superset and `lyra-E056` refuses a non-constant count in fixed-array position — the
  // line this project already draws (`rangeBounds`, the `..` end operator): the grammar
  // refuses what has no meaning anywhere, the checker refuses what has a plausible meaning
  // that must be disambiguated, and gets to name the fix while doing it.
  array_repeat_count: ($) => $.expression,
};
