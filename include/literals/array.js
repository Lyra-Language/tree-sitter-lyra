const { commaSep } = require("../helpers");

// **The opener is the flavor**: `[…]` builds a dynamic `[]T`, `#[…]` a fixed `[N]T`. One node
// kind per construct, with the `#[` opener exposed as a `fixed` field, rather than a second
// kind: each kind keeps its one derivation path (see CLAUDE.md), and every consumer that
// walks an array literal walks both flavors without learning a new name. `#[` is one token,
// so `# [1]` is not a fixed array; the external scanner's raw-string opener also starts at
// `#`, but returns false without a backtick and the internal lexer takes `#[` from the start.
const arrayOpen = choice("[", field("fixed", "#["));

module.exports = {
  array_literal: ($) =>
    seq(arrayOpen, commaSep($.expression), "]"),

  // Array repeat initialization: [value; count] / #[value; count]
  // Creates an array with `count` copies of `value`
  array_repeat_init: ($) =>
    seq(
      arrayOpen,
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
  // The opener now says which one is built (`#[0; 16]` is fixed), but the count stays an
  // expression: `lyra-E056` refuses a non-constant count in a `#[…]` repeat and names the
  // fix — the line this project already draws (`rangeBounds`, the `..` end operator): the grammar
  // refuses what has no meaning anywhere, the checker refuses what has a plausible meaning
  // that must be disambiguated, and gets to name the fix while doing it.
  array_repeat_count: ($) => $.expression,
};
