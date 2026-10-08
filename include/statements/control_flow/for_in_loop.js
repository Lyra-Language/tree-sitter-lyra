const { PREC } = require("../../prec");

module.exports = {
  // for item in [1, 2, 3] { println("item: ${item}") }
  // for item in get_array() { println("item: ${item}") }
  // for (k, v) in pairs { println("${k}=${v}") }
  //
  // **The two-name form is `for <index>, <element>`** — `for i, c in s` walks a string's
  // rune indices and runes together — which is why the node names read key-then-value and
  // why a destructuring pattern belongs in the *second* slot. The examples here said
  // `for item, idx` until 09/06/26 and had it exactly backwards, which is the kind of
  // comment that costs someone an afternoon: the code runs, and the two bindings simply
  // hold each other's values.
  //
  // for i, item in [1, 2, 3] { println("${i}: ${item}") }
  // for i, (k, v) in pairs { println("${i}: ${k}=${v}") }
  for_in_loop: $ => seq(
    optional(seq(alias($.identifier, $.label), ':')),
    'for',
    $.for_in_condition,
    alias($.block, $.for_in_body)
  ),

  // Either binding may be `_`, which iterates without naming anything:
  //
  //   for _ in 0..<n { … }        // repeat n times
  //   for _, v in xs { … }        // values only
  //
  // `_` is not an `identifier` — the token is `/(_[a-zA-Z0-9_]+|[a-z][a-zA-Z0-9_]*)/`, so
  // a leading underscore needs a character after it — which is why `for _ in` was a syntax
  // error while `for _i in` worked, and why the workaround reads as a style choice rather
  // than a necessity.
  //
  // It is admitted **inside the existing alias** rather than as a `wildcard_pattern`
  // alternative beside it, so the CST shape is unchanged and every consumer keeps reading
  // one node kind. The collector then sees a binding whose text is `_`, and that name is
  // unforgeable: no identifier can be a bare underscore, so nothing in the body can refer
  // to it, which is exactly the property the spelling promises.
  // The element binding may also **destructure a tuple**, which is what makes a loop over
  // pairs read as pairs: `for (k, v) in entries`.
  //
  // Only an *irrefutable* pattern belongs here — a loop has nowhere to send a value that
  // fails to match, unlike a `match` arm which has the next arm — which rules out
  // `data_pattern` (`for Some(x) in …` would have to silently skip or trap on a `None`)
  // and `array_pattern`, whose arity the element type does not guarantee.
  //
  // **`struct_pattern` is irrefutable and still not here.** Until 10/08/26 it could not
  // survive the struct-literal contest: `for Pt { x, y } in points` read as a conditional
  // `for` whose condition was the *literal* `Pt { x, y }`. `for` now begins only this
  // rule (the conditional loop is `while`), so that rival is gone; admitting the pattern
  // is untried (lyra/todo.md), and a tuple already covers the spelling.
  //
  // **A single loop variable may name its type** (09/29): `for i: u16 in 0..<100`. Without
  // one, a variable over literal bounds is an `i64`, as `let n = 5` is; with one, the bounds
  // are checked against it (`for b: u8 in 0..<300` is refused) and the loop runs at that
  // width. Only the one-binding form takes it — in `for i, x in xs` the index is always an
  // `i64` and the element's type is the collection's.
  for_in_condition: $ => prec.left(PREC.FOR_IN_CONDITION, seq(
    choice(
      seq(
        alias(choice($.identifier, '_'), $.for_variable_or_key),
        optional(field('type_annotation', $.type_annotation)),
      ),
      $.tuple_pattern,
    ),
    // …and in the **second** slot too, which is where it belongs when an index is also
    // bound: the two-binding form is `for <index>, <element> in …` (`for i, c in s`), so
    // the element — the thing worth destructuring — is this one. A pattern in the *first*
    // slot alongside a second binding would be destructuring an index; the grammar admits
    // it and the collector reports it, the same admit-then-report trade `extern`'s
    // modifiers make.
    optional(seq(',', choice(
      alias(choice($.identifier, '_'), $.for_index_or_value),
      $.tuple_pattern,
    ))),
    'in',
    $.expression,
  )),
}
