const { commaSep1, commaSep, rangeBounds } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  // Core pattern types
  pattern: ($) =>
    choice(
      // A bare identifier stays at default precedence — NOT under PREC.PATTERN —
      // so `identifier → pattern` and `identifier → _primary_expr` (the tuple/
      // parenthesized-expression reading) are equal-precedence and become a GLR
      // conflict (declared as `[pattern, _primary_expr]`) rather than being
      // silently precedence-resolved toward the pattern. That is what lets a
      // name-leading `(a, b)`/`(a)` parse as a tuple/parenthesized expression
      // when no `=>` follows, while `(a, b) => …` still parses as a lambda.
      $.identifier, // simple binding: x
      prec.left(
        PREC.PATTERN,
        choice(
          $.binding_pattern, // binding: name @ inner
          $.literal_pattern, // literal matching: 42, "hello"
          $.regex_pattern, // regex matching: r/[0-9]+/
          $.range_pattern, // range matching: 0..<=9, 10..99
          $.array_pattern, // array destructuring: [a, b, ...rest]
          $.struct_pattern, // struct destructuring: {name, age}
          $.tuple_pattern, // tuple destructuring: (x, y, z)
          $.data_pattern, // data pattern: Some(42)
          $.wildcard_pattern, // wildcard: _
        ),
      ),
    ),

  // Regex pattern (for string match arms): r/PATTERN/
  regex_pattern: ($) => $.regex_literal,

  // Array patterns (shared between destructuring and pattern matching)
  // commaSep (not commaSep1) so an empty `[]` pattern parses — the base case of a
  // list match (`match xs { [] => …, [a, ...rest] => … }`).
  array_pattern: ($) => seq("[", commaSep($._pattern_element), "]"),

  // Struct patterns (shared)
  struct_pattern: ($) => seq("{", commaSep1($.struct_field_pattern), "}"),

  // Rename form: { oldName: newName } — precedence > pattern (5) so identifier isn't reduced to pattern first
  struct_field_rename: ($) =>
    prec(
      PREC.STRUCT_FIELD_RENAME,
      seq(
        field("name", $.identifier),
        ":",
        field("new_name", alias($.identifier, $.new_name)),
      ),
    ),

  // Nested pattern form: { oldName: Some(x) } or { oldName: (a, b) }
  struct_field_with_pattern: ($) =>
    prec(
      PREC.STRUCT_FIELD_WITH_PATTERN,
      seq(field("name", $.identifier), ":", field("pattern", $.pattern)),
    ),

  // Pattern fields (shared)
  struct_field_pattern: ($) =>
    prec(
      PREC.STRUCT_FIELD_WITH_PATTERN,
      choice(
        field("name", $.identifier), // { name }
        field("struct_field_rename", $.struct_field_rename), // { a: foo }
        field("struct_field_with_pattern", $.struct_field_with_pattern), // { a: Some(x) }
        field("rest_pattern", $.rest_pattern),
      ),
    ),

  // Tuple patterns (shared), and **anonymous only** — `(x, y)`, not `name(x, y)`.
  //
  // It carried an optional leading name until 08/05, aliased from `$.identifier`, and
  // that name could not be right: `identifier` is lowercase-leading by lexer rule while
  // a named tuple *type* is PascalCase, so no program could legally use it. What it did
  // instead was outbid the expression reading of the same tokens — `(f(7))` parsed as a
  // parameter list holding the tuple pattern `f(7)` and then failed, so a **call could
  // not be the first thing inside parentheses**: `(f(7))`, `(f(7), 1)`, `(f(7) + 1, 1)`
  // and `((f(7)), 1)` were all syntax errors, while `(1, f(7))` was fine because by then
  // the pattern reading was already dead. No corpus test used the name, and no collector
  // read the field (only `tuple_literal.go` reads `tuple_name`, from the *expression*
  // rule of the same alias).
  //
  // An **uppercase** named tuple pattern is unaffected because it was never this rule:
  // `Point(x, y)` is a `data_pattern`, which the typechecker resolves to a tuple type
  // when the name is one. The generic-argument slot went with the name, since arguments
  // with nothing to apply them to are not a form.
  tuple_pattern: ($) =>
    prec.left(
      PREC.TUPLE_PATTERN,
      seq(
        choice(
          $.unit_pattern,
          seq("(", commaSep1($._pattern_element), ")"),
        ),
      ),
    ),

  unit_pattern: ($) => seq("(", ")"),

  // Pattern elements (shared)
  _pattern_element: ($) =>
    prec(
      PREC.PATTERN_ELEMENT,
      choice(
        $.pattern, // nested patterns
        $.rest_pattern, // ...rest
        $.wildcard_pattern, // _
      ),
    ),

  // Data pattern
  data_pattern: ($) =>
    choice(
      // Nullary constructor `None`: default precedence, so the bare name is
      // equal-precedence to its expression reading and GLR-forks — the same
      // treatment the bare identifier gets in `pattern`, so a constructor-leading
      // tuple `(None, 7)` parses. A payload-bearing pattern keeps PREC.DATA_PATTERN
      // (it must still beat the constructor-*call* expression reading of `Some(x)`).
      field("name", alias($.user_defined_type_name, $.data_type_name)),
      prec.left(
        PREC.DATA_PATTERN,
        seq(
          field("name", alias($.user_defined_type_name, $.data_type_name)),
          field("pattern", $.pattern),
        ),
      ),
    ),

  // A number literal in *pattern* position, with an optional leading `-`.
  //
  // The sign cannot live in the token — `decimal_int` swallowing a `-` would lex
  // `a-1` as `a` and `-1` rather than as subtraction — and `negation` proper is
  // defined over `_math_operand`, which would admit `-foo` and `-(a + b)` in a
  // place where only a literal means anything. So it is its own production,
  // **aliased to `negation`** so the CST shape is one the tree already contains:
  // the collector reads a range pattern's `start`/`end` with CollectExpr, which
  // handles a `negation` with an `operand` field and would not know a new node
  // kind, and a literal pattern is collected from its raw text either way.
  //
  // Until 07/31/26 both rules below took a bare `_number_literal`, so `-1 => …`
  // and `-128..<=127 => …` did not parse at all — the `-` landed in an ERROR node.
  // That went unnoticed because the error swallowed the whole `match`, leaving
  // the collector with no match expression to check for exhaustiveness, so tests
  // asserting "no errors" on a full-range match passed *vacuously*.
  // A *named* rule, then aliased — not `alias(seq(…), $.negation)` inline. An
  // inline sequence is not a node of its own, so its `operator`/`operand` fields
  // hoist onto the enclosing `range_pattern` and displace its `start`/`end`,
  // leaving the collector's ChildByFieldName("start") empty.
  _negated_number_literal: ($) =>
    seq(field("operator", "-"), field("operand", $._number_literal)),

  _signed_number_literal: ($) =>
    choice($._number_literal, alias($._negated_number_literal, $.negation)),

  // Literal patterns (for pattern matching). A char_literal ('a') matches a
  // `rune` scrutinee — the equality counterpart to a numeric/string/bool literal.
  literal_pattern: ($) =>
    choice(
      $._signed_number_literal,
      $.char_literal,
      $.string_literal,
      $.boolean_literal,
    ),

  // Range patterns: `0..<=9`, `-128..<0`, and — since the three range grammars
  // were unified — the open forms `0..` (at least 0) and `..<0` (below 0). An
  // open end is what makes a range pattern able to cover the tail of a type's
  // domain without naming its maximum, which is where a `match` on a width most
  // often needs one.
  //
  // Both bounds omitted (a bare `..`) is not spellable: rangeBounds' `open` mode
  // requires one, since an unbounded range pattern is `_`.
  //
  // The operand is `_signed_number_literal`, not `expression`: a pattern must be
  // a compile-time constant for exhaustiveness and for the jump-ladder lowering.
  // That is a deliberate difference from `range_expr`, not drift — see rangeBounds.
  range_pattern: ($) =>
    prec.left(
      PREC.RANGE_PATTERN,
      rangeBounds($, {
        startOperand: $._signed_number_literal,
        open: true,
      }),
    ),

  // Wildcard pattern
  wildcard_pattern: ($) => prec.left(PREC.WILDCARD_PATTERN, "_"),

  // Rest pattern
  rest_pattern: ($) => seq("...", field("identifier", $.identifier)),

  // Binding pattern: name @ inner_pattern
  // Binds the matched value to `name` while also matching `inner_pattern`.
  // Example: `all @ [head, ...tail]` — `all` is the entire array, `head`/`tail` are destructured.
  binding_pattern: ($) =>
    prec.left(
      PREC.BINDING_PATTERN,
      seq(field("name", $.identifier), "@", field("pattern", $.pattern)),
    ),
};
