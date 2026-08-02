export function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}
export function commaSep(rule) {
  return optional(commaSep1(rule));
}

// A statement list: statements separated by `_statement_separator`, with the
// separator after the *last* one optional.
//
// Written as "repeat(statement separator) then an optional trailing statement"
// rather than the usual sep1 shape (`stmt (sep stmt)* sep?`) because this form
// decides on a single lookahead token: after a statement, a separator means the
// list continues and `}`/EOF means it ended. The sep1 shape has to see one token
// *past* a separator to know whether it is a real separator or the trailing one.
export function statementList($) {
  return seq(
    repeat(seq($.statement, $._statement_separator)),
    optional($.statement),
  );
}

// The `..` range notation, shared by the three places it appears: an expression
// (`0..<n`, `0..=10:2`), a match pattern (`0..=9`), and a `newtype` range
// constraint (`range(0..=100)`).
//
// These were three separate rules that had drifted apart on four axes at once —
// whether the end operator was required, whether either bound could be omitted,
// what an operand may be, and even what the `<`/`=` token was *called*
// (`range_end_operator` in two of them, `less_than_comparator` /
// `equal_to_comparator` in the third, for the same two characters). Two of those
// axes are real and stay parameters here; two were drift and are now fixed.
//
// **What legitimately varies, and why.** The *operand* differs because the
// contexts differ: a pattern needs a compile-time literal (exhaustiveness and the
// jump-ladder lowering depend on it), a constraint needs a constant expression
// (it is part of a type), and an expression takes arbitrary runtime values.
// Unifying those would either let a match arm hold a function call or break
// `for i in 0..<n`. *Open-endedness* likewise: `range(0..)` means "at least 0,
// bounded above by the base type" and `0..=9` as a pattern is a useful half-open
// match, but an open-ended expression range would need the lazy iterator the
// language does not have yet.
//
// **What does not vary.** One node kind for the end operator, and — when `open`
// is set — at least one bound, so `range(..)` and a bare `..` pattern are not
// spellable. A range with *neither* bound has no meaning in any of the three
// contexts (as a pattern it is `_`), which is why it is refused structurally
// here rather than by a diagnostic.
//
// **The end operator is optional in the grammar everywhere and required by the
// collector everywhere** (`lyra-E032`). It is not a default: every reader of the
// collected operator tests `== "<"`, so an omitted one silently meant *inclusive*.
// That is refused — but as a diagnostic naming both fixes rather than as a syntax
// error, following the `lyra-E029` precedent. The line between the two: enforce in
// the collector when the construct has a plausible intended meaning that must be
// disambiguated (`0..9` is what a Rust or Python programmer writes *meaning*
// something), and in the grammar when it has no meaning at all (a bare `..`).
export function rangeBounds($, opts) {
  const {
    startOperand,
    endOperand = startOperand,
    open = false,
    step = null,
  } = opts;

  const start = field("start", startOperand);
  const end = seq(
    optional(field("end_operator", $.range_end_operator)),
    field("end", endOperand),
  );

  const bounds = open
    ? choice(seq(start, "..", optional(end)), seq("..", end))
    : seq(start, "..", end);

  return step === null
    ? bounds
    : seq(bounds, optional(seq(":", field("step", step))));
}

export function parameterList(parameterRule) {
  return seq(
    "(",
    optional(seq(parameterRule, repeat(seq(",", parameterRule)), optional(","))),
    ")"
  );
}