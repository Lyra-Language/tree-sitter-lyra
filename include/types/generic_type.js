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
