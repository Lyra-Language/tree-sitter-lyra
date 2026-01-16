module.exports = {
  const_declaration: $ => prec.left(
    seq(
      optional($.visibility),
      field('keyword', 'const'),
      field('name', $.const_identifier),
      optional(field('type_annotation', $.type_annotation)),
      '=',
      field('value', $.expression)
    ),
  ),

  declaration: $ => prec.left(seq(
    optional($.visibility),
    field('keyword', choice('let', 'var')),
    field('name', $.identifier),
    optional(field('type_annotation', $.type_annotation)),
    '=',
    field('value', $.expression)
  )),

  var_reassignment: $ => seq($.identifier, '=', field('value', $.expression)),

  var_destructuring_reassignment: $ => seq(
    field('pattern', $.destructuring_pattern),
    '=',
    field('value', $.expression)
  ),
}