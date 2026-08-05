const { PREC } = require("../prec");
const { rangeBounds } = require("../helpers");

module.exports = {
  // `0..<n`, `0..<=10`, `0..<=10:2`. Both bounds are required: an open-ended
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

  // The one node kind for a range's end operator, in all three of its sites. It lives
  // here rather than in helpers.js because helpers.js exports functions, not grammar
  // rules.
  //
  // **Four operators, two axes**: `<` `<=` ascend, `>` `>=` descend; `<` `>` exclude the
  // end, `<=` `>=` include it. So `5..>1` is 5, 4, 3, 2 and `5..>=1` is 5, 4, 3, 2, 1.
  //
  // Until 08/04/26 the inclusive end was spelled `..=` and there was no descending form at
  // all; `..=` became `..<=` so both directions read identically. The alternative was to
  // keep the old spelling and let it mean "inclusive, whichever way the bounds point" —
  // one token fewer, and rejected because the direction would then be a property of the
  // operand *values*: with variable bounds it would pick a direction at run time and could
  // silently run the opposite way from the one intended, with no diagnostic anywhere.
  // Every operator here names its direction, so direction is decided by the parser and a
  // range that cannot produce anything says so by being empty rather than by surprising
  // its author. It is also what lets the step be a plain magnitude, and a negative one an
  // error (`types.InvalidStepReason`).
  //
  // **Descending is meaningful only where a range is *iterated*.** As a match pattern or
  // a `newtype` constraint a range is a **set**, and a set has no direction — `5..>1`
  // describes exactly the members `1..<5` does. `>` and `>=` are accepted here in all
  // three sites and refused by the collector where they do not belong, following the rule
  // rangeBounds already states: the grammar refuses what has no meaning at all, the
  // collector refuses what has a plausible intended meaning needing disambiguation. A
  // descending pattern is the second kind, so the useful answer names the ascending
  // spelling instead of pointing at a token. One node kind for all four spellings is also
  // what keeps the 08/01 unification intact: the operator is shared, and only what each
  // context does with it differs.
  range_end_operator: ($) => choice("<=", ">=", "<", ">"),
};
