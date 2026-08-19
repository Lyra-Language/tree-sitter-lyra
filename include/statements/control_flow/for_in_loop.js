const { PREC } = require("../../prec");

module.exports = {
  // for item, idx in 0..10 { println("item: ${item}, idx: ${idx}") }
  // for item, idx in [1, 2, 3] { println("item: ${item}, idx: ${idx}") }
  // for key, value in {a: 1, b: 2} { println("key: ${key}, value: ${value}") }
  // for item in (1, 2, 3) { println("item: ${item}") }
  // for item in get_array() { println("item: ${item}") }
  // for key, value in some_struct { println("key: ${key}, value: ${value}") }
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
  for_in_condition: $ => prec.left(PREC.FOR_IN_CONDITION, seq(
    alias(choice($.identifier, '_'), $.for_variable_or_key),
    optional(seq(',', alias(choice($.identifier, '_'), $.for_index_or_value))),
    'in',
    $.expression,
  )),
}
