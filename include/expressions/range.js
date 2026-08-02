const { PREC } = require("../prec");
const { rangeBounds } = require("../helpers");

module.exports = {
  // `0..<n`, `0..=10`, `0..=10:2`. Both bounds are required: an open-ended
  // expression range would need a lazy/infinite iterator, which the language does
  // not have. The `..` notation itself is shared with `range_pattern` and
  // `range_constraint` via rangeBounds — see the comment on that helper for which
  // axes legitimately differ between the three and which were drift.
  //
  // The step is expression-only. A step in a *pattern* would be a set-membership
  // test the exhaustiveness checker cannot reason about, and in a *constraint* the
  // idea already has its own spelling (`step(0.25)`), which composes with
  // `precision()` and the newtype's domain in a way an inline `:step` does not.
  range_expr: ($) =>
    prec.right(
      PREC.RANGE_EXPR,
      rangeBounds($, {
        startOperand: alias($.expression, $.range_start),
        endOperand: alias($.expression, $.range_end),
        step: alias($.expression, $.range_step),
      }),
    ),

  // The one node kind for `<` and `=` as a range's end operator, in all three of
  // its sites. It lives here rather than in helpers.js because helpers.js exports
  // functions, not grammar rules.
  range_end_operator: ($) => choice("<", "="),
};
