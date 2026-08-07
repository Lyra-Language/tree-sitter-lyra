const array_literals = require("./array");
const boolean_literal = require("./boolean");
const char_literal = require("./char");
const number_literals = require("./numbers");
const regex_literal = require("./regex");
const string_literals = require("./string");
const struct_literal = require("./struct");
const tuple_literal = require("./tuple");
const { PREC } = require("../prec");

module.exports = {
  // NOTE: number literals are intentionally NOT in `_literal`. `_literal`
  // carries `prec.right(PREC.LITERAL)` so composite literals (regex, struct,
  // tuple, …) win over the corresponding *pattern* rules in the same slot. A
  // number literal never collides with an identifier and doesn't need that
  // wrapper — and being inside it made `0 - 200` parse as `0` followed by a
  // standalone `negation(-200)` statement: the wrapper let precedence resolve
  // the literal/operand choice toward unary negation (UNARY > ADDITIVE) rather
  // than leaving the `expression`/`_math_operand` GLR conflict to resolve in
  // favour of subtraction (as it does for identifier/postfix operands). So
  // numbers are reached directly from `expression` and the operand rules
  // (like `_postfix_expr`), bypassing the wrapper.
  // As of 08/06 most literal kinds live in `_primary_expr` instead (the head of
  // every postfix form), so `"abc".len()` parses. What is left here is the three
  // that must NOT be postfix heads, each for a reason:
  //
  //   - `tuple_literal` is how `Some(42)` and `Rect(3, 4)` already parse. As a
  //     postfix head it would give `Some(42)` a second reading;
  //   - `anonymous_struct_literal` — a bare `{ … }` head would contest the block;
  //   - `array_repeat_init` (`[0; 5]`) is left out only because nothing wants a
  //     method on one yet, and every addition here costs parser states.
  //
  // A kind must be in exactly one of the two. Listing it in both makes a bare
  // literal derivable two ways, which is an unresolved reduce-reduce at every
  // operand position — the errors that shaped this split.
  _literal: ($) =>
    prec.right(
      PREC.LITERAL,
      choice(
        $.array_repeat_init,
        $.regex_literal,
        $.named_struct_literal,
        $.anonymous_struct_literal,
        $.tuple_literal,
      ),
    ),
  ...array_literals,
  ...boolean_literal,
  ...char_literal,
  ...number_literals,
  ...regex_literal,
  ...string_literals,
  ...struct_literal,
  ...tuple_literal,
};
