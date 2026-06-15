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
  _literal: ($) =>
    prec.right(
      PREC.LITERAL,
      choice(
        $.array_literal,
        $.array_repeat_init,
        $.boolean_literal,
        $.char_literal,
        $.regex_literal,
        $.string_literal,
        $.raw_string_literal,
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
