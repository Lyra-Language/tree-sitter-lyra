export function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}
export function commaSep(rule) {
  return optional(commaSep1(rule));
}

// A brace-delimited list of *members* — one per line, or comma-separated, or both.
//
// The comma stays legal because it always was and reads well on one line
// (`trait Show { show: (Self) -> string, name: (Self) -> string }`); what this adds
// is the newline, so a member list agrees with the rest of the language about how
// things on separate lines are separated. Statements gained a terminator on 07/31
// and these lists did not, which left `trait C { a: … ⏎ b: … }` failing — and failing
// *badly*, with "missing }" pointing at the end of the **first** signature, several
// lines above anything a reader would suspect.
//
// The separator is `$._statement_separator`, not a bare `_newline`: it is the same
// zero-width terminator the scanner already emits, so `;` works here too and there is
// one answer to "what ends a thing on its own line". Trailing separator optional,
// matching commaSep1 and statementList.
//
// **The list shape is commaSep1's, not statementList's.** statementList is written
// "repeat(item separator) then optional item" so a single lookahead decides whether
// the list continues — worth it there because a block's statements are the hot path.
// Here the sep1 shape keeps `commaSep1`'s property that the list is non-empty, which
// is what makes `trait C {}` a syntax error rather than a trait with no methods.
export function memberList($, rule) {
  const sep = choice(",", $._statement_separator);
  return seq(rule, repeat(seq(sep, rule)), optional(sep));
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