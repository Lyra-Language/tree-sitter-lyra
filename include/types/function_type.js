module.exports = {
  function_type: $ => prec(3, seq(
    '(',
    optional(field('parameter_types', $.parameter_type_list)),
    ')',
    '->',
    field('return_type', $.type)
  )),

  parameter_type_list: $ => seq(
    $.parameter_type,
    repeat(seq(',', $.parameter_type)),
    optional(',')
  ),

  parameter_type: $ => seq(
    optional(field('modifier', $.modifier)),
    field('type', $.type),
  ),

  modifier: $ => choice('ref', 'mut', 'own'),
}