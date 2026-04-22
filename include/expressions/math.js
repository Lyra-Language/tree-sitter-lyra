const { PREC } = require("../prec");

module.exports = {
    // Primary math expression - includes all math operations
    _math_expr: $ => choice(
        $._primary_math_expr,
        $.addition,
        $.subtraction,
        $.multiplication,
        $.division,
        $.addition_assignment,
        $.subtraction_assignment,
        $.multiplication_assignment,
        $.division_assignment,
    ),

    // Primary math expression - base elements without arithmetic operators to avoid circular dependency
    _primary_math_expr: $ => prec.right(PREC.MATH_PRIMARY, choice($._number_literal, $._postfix_expression, $.group, $.negation)),

    // Math expression for constraints that can include const_identifier without circular dependency
    constraint_math_expr: $ => choice($._number_literal, $._constraint_arithmetic_operator, $.constraint_negation, $.identifier, $.const_identifier),

    _arithmetic_operator: $ => choice($.addition, $.subtraction, $.multiplication, $.division),
    _constraint_arithmetic_operator: $ => choice($.constraint_addition, $.constraint_subtraction, $.constraint_multiplication, $.constraint_division),

    addition: $ => prec.left(PREC.ADDITIVE, seq(field('left', $._primary_math_expr), field('operator', '+'), field('right', $._math_expr))),
    subtraction: $ => prec.left(PREC.ADDITIVE, seq(field('left', $._primary_math_expr), field('operator', '-'), field('right', $._math_expr))),
    multiplication: $ => prec.left(PREC.MULTIPLICATIVE, seq(field('left', $._primary_math_expr), field('operator', '*'), field('right', $._math_expr))),
    division: $ => prec.left(PREC.MULTIPLICATIVE, seq(field('left', $._primary_math_expr), field('operator', '/'), field('right', $._math_expr))),
    negation: $ => prec.right(PREC.UNARY, seq(field('operator', '-'), field('operand', $._primary_math_expr))),

    constraint_addition: $ => prec.left(PREC.ADDITIVE, seq(field('left', $.constraint_math_expr), field('operator', '+'), field('right', $.constraint_math_expr))),
    constraint_subtraction: $ => prec.left(PREC.ADDITIVE, seq(field('left', $.constraint_math_expr), field('operator', '-'), field('right', $.constraint_math_expr))),
    constraint_multiplication: $ => prec.left(PREC.MULTIPLICATIVE, seq(field('left', $.constraint_math_expr), field('operator', '*'), field('right', $.constraint_math_expr))),
    constraint_division: $ => prec.left(PREC.MULTIPLICATIVE, seq(field('left', $.constraint_math_expr), field('operator', '/'), field('right', $.constraint_math_expr))),
    constraint_negation: $ => prec.right(PREC.UNARY, seq(field('operator', '-'), field('operand', $.constraint_math_expr))),

    addition_assignment: $ => prec.left(PREC.ADDITIVE, seq($._primary_math_expr, '+=', $._math_expr)),
    subtraction_assignment: $ => prec.left(PREC.ADDITIVE, seq($._primary_math_expr, '-=', $._math_expr)),
    multiplication_assignment: $ => prec.left(PREC.MULTIPLICATIVE, seq($._primary_math_expr, '*=', $._math_expr)),
    division_assignment: $ => prec.left(PREC.MULTIPLICATIVE, seq($._primary_math_expr, '/=', $._math_expr)),

    group: $ => prec(PREC.MATH_GROUP, seq('(', $._math_expr, ')')),
}

