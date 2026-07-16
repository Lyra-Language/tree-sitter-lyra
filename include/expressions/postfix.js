const { PREC } = require("../prec");

module.exports = {
  // Postfix expressions with binary nesting - each operation wraps the previous
  _postfix_expr: $ => choice(
    $.call_expr,
    $.member_expr,
    $.optional_member_expr,
    $.tuple_index_expr,
    $.index_expr,
    $.optional_index_expr,
    $.try_expr,
    $.deref_expr,
    $.trait_method_path,
    $._primary_expr,
  ),

  // Fully-qualified trait method path: `TraitName::method`. Disambiguates
  // which trait's implementation to call when a plain `obj.method(args)`
  // would be ambiguous (two traits implementing a same-named method for the
  // same type) — mirrors Rust's `Trait::method(receiver)` form. Always
  // appears as a call_expr's `function`; the receiver is then an ordinary
  // first argument (`Show::show(n)`), not an implicit `.`-bound object, since
  // there is no value to the left of `::` to bind it to. See the note on
  // `generic_arguments` (types/generic_type.js) for why this no longer
  // competes with turbofish (`Point3D::<f32>(...)`) for the same `::` prefix.
  trait_method_path: $ => prec.left(PREC.POSTFIX, seq(
    field('trait_name', $.user_defined_type_name),
    '::',
    field('method', $.identifier)
  )),

  _primary_expr: $ => choice(
    $.identifier,
    $.const_identifier,
    $.user_defined_type_name,  // For static method calls like Arena.new()
    $.parenthesized_expr,
  ),

  call_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('function', $._postfix_expr),
    optional(field('generic_arguments', $.generic_arguments)),
    field('arguments', $.argument_list)
  )),

  member_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '.',
    field('property', choice($.identifier, $.const_identifier))
  )),

  // Positional tuple access: `pair.0`, `pair.1`. Distinct from member_expr
  // (a named struct field or method) because the property is a numeric index,
  // not an identifier — so the collector gets a separate node kind and doesn't
  // have to sniff whether a property is a number. The index is a plain decimal
  // integer, and no float token collides here: tree-sitter's lexer is
  // context-sensitive, so after `obj .` only decimal_int/identifier are valid
  // tokens and float_literal is never offered — which is why even a nested
  // `pair.0.1` lexes as two indices, not `0` then a `.1` float.
  tuple_index_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '.',
    field('index', $.decimal_int)
  )),

  // Optional member access - safe navigation for Maybe<T>
  // Returns Maybe<T> instead of T, doesn't change control flow
  optional_member_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '?.',
    field('property', choice($.identifier, $.const_identifier))
  )),

  index_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '[',
    field('index', $.expression),
    ']'
  )),

  // Optional index access - safe indexing for Maybe<T> or bounds checking
  // Returns Maybe<T> instead of T
  optional_index_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '?[',
    field('index', $.expression),
    ']'
  )),

  try_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('operand', $._postfix_expr),
    '?'
  )),

  deref_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('operand', $._postfix_expr),
    '^'
  )),
}