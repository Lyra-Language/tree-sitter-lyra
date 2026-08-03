const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  // Type parameters are lowercase by design — Lyra is ML-style: a lowercase
  // name (`t`, `a`, `ok`) is a type *variable*, an Uppercase name is a *concrete*
  // type (`user_defined_type_name`). This lexical split is deliberate and is what
  // lets a constructor payload like `Some t` read as "Some applied to a type var"
  // without semantic resolution. So `<T, E>` (the Rust/Swift habit) is NOT a
  // valid parameter list — write `<t, e>`. (Uppercase params produce a parse
  // ERROR rather than a tailored message; supporting them would require resolving
  // the single-letter `T`/`const_identifier` lexer collision — intentionally not
  // done. See lyra memory `bug-generic-data-constructors`.)
  generic_type: ($) =>
    seq(
      /[a-z][a-z0-9]*/,
      optional(
        seq(
          "<",
          commaSep1(alias($.generic_type, $.generic_type_parameter)),
          ">",
        ),
      ),
    ),

  generic_parameter: ($) =>
    prec(PREC.GENERIC_PARAMETERS,
      seq(
        field("name", $.generic_type),
        optional(seq(":", field("bounds", $.generic_bounds))),
      ),
    ),

  generic_parameters: ($) =>
    prec.left(PREC.GENERIC_PARAMETERS, seq("<", commaSep1($.generic_parameter), ">")),

  // Generic type arguments at a construction / call site: `Point2::<i32> { … }`,
  // `Coords2::<i32>(…)`, `map::<i64, i64>(…)`. The turbofish `::` is required to
  // disambiguate from a `<` comparison (the classic template-`<` ambiguity).
  // These are usually omittable — the typechecker infers the arguments from the
  // value arguments — so the turbofish rarely needs to be written.
  //
  // **Where that ambiguity actually bites, because it is not where it looks.**
  // The tempting argument for dropping the turbofish is that the competing read
  // of `Name<T>(x)` — `(Name < T) > (x)` — is ungrammatical here: comparisons are
  // non-associative (`_comparison_operand` in expressions/boolean.js admits no
  // comparison), so `a < b > c` and even `(a < b) > c` do not parse. That
  // argument is wrong, and the mistake is worth recording because it is the
  // natural one to make. The conflict is not the chained read at the *end*, it is
  // the decision at the `<` itself: on seeing `a <` the parser must choose
  // between "generic arguments begin" and "less-than operator" before it can see
  // whether `> (` follows, and the comparison branch loses.
  //
  // Measured, 08/02/26, by prototyping `seq(choice("::<", "<"), …)`: it generates
  // with one extra conflict entry and costs **nothing** in parser size — 6,606 →
  // 6,607 states, +5 KB — and `Point3D<f64>(1.0)` and `map<i64>(x)` both parse.
  // The price is the language: `a < b`, `if n < 2` and `for i < 10` all become
  // parse errors (six corpus tests fail). `x <= y` and `1 < 2` survive only
  // because `<=` is its own token and a numeric literal cannot head a type
  // argument list — so every comparison with an *identifier* on the left, which
  // is nearly all of them, breaks. This is precisely the ambiguity C++ has and
  // why Rust chose the turbofish. **Do not re-run this experiment; size was never
  // the constraint.**
  //
  // `::<` is one atomic token (not `"::"` then `"<"`) so the *lexer* — via
  // ordinary maximal-munch — disambiguates turbofish from `trait_method_path`'s
  // `TraitName::method` (postfix.js) instead of the *parser* having to choose
  // between two competing reductions of the same `TypeName ::` prefix before
  // it can see whether `<` or an identifier follows. That choice is a
  // shift/reduce tie tree-sitter's static precedence resolves the same way
  // regardless of the next token, so splitting it at the lexer (where the
  // next character actually is visible) is the fix, not a precedence/conflict
  // tweak at the parser level.
  generic_arguments: ($) => seq("::<", commaSep1($.type), ">"),
};
