module.exports = {
  const_declaration: $ => prec.left(
    seq(
      optional($.attribute_list),
      optional($.visibility),
      field('keyword', 'const'),
      field('name', $.const_identifier),
      optional(field('type_annotation', $.type_annotation)),
      '=',
      field('value', $.expression)
    ),
  ),

  declaration: $ => prec.left(seq(
    optional($.attribute_list),
    optional($.visibility),
    field('keyword', choice('let', 'var')),
    field('name', $.identifier),
    optional(field("generic_parameters", $.generic_parameters)),
    optional(
      seq(
        "where",
        field(
          "generic_parameter_constraints",
          $.generic_parameter_constraints,
        ),
      ),
    ),
    optional(field('type_annotation', $.type_annotation)),
    optional(seq('=', field('value', $.expression))),
  )),

  var_reassignment: $ => seq($.identifier, '=', field('value', $.expression)),

  deref_assignment: $ => seq(field('target', $.deref_expr), '=', field('value', $.expression)),

  var_destructuring_reassignment: $ => seq(
    field('pattern', $.destructuring_pattern),
    '=',
    field('value', $.expression)
  ),
}