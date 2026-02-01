const allocation = require('./allocation');
const constrained_type = require('./constrained_type');
const data_type = require('./data_type');
const function_type = require('./function_type');
const generic_type = require('./generic_type');
const number_types = require('./number_types');
const struct_type = require('./struct_type');
const tuple_type = require('./tuple_type');
const trait_declaration = require('./trait_declaration');
const trait_implementation = require('./trait_implementation');

module.exports = {
    type_annotation: $ => seq(':', field('type', $.type)),

    return_type_annotation: $ => seq('->', field('type', $.type)),

    type_declaration: $ => choice($.struct_type, $.data_type, $.constrained_type, $.trait_declaration, $.trait_implementation),
    
    type: $ => prec(2, choice(
        $._primitive_type,
        $.parameterized_type,
        $.self_type,
        $.user_defined_type_name,
        $.array_type,
        $.generic_type,
        $.function_type,
        $.allocated_type,
        $.weak_type,
    )),
    
    user_defined_type_name: $ => /[A-Z][a-zA-Z0-9]*/,

    self_type: $ => 'Self',

    // Parameterized types like Maybe<i>, Tree<a>, Self<a>
    parameterized_type: $ => seq(
        field('name', choice('Self', $.user_defined_type_name)),
        '<',
        field('type_arguments', seq(
            $.type,
            repeat(seq(',', $.type)),
            optional(','),
        )),
        '>'
    ),

    _primitive_type: $ => choice($._integer_type, $.float_type, $.string_type, $.boolean_type),

    string_type: $ => 'string',

    boolean_type: $ => 'bool',

    ...allocation,
    ...constrained_type,
    ...data_type,
    ...function_type,
    ...generic_type,
    ...number_types,
    ...struct_type,
    ...tuple_type,
    ...trait_declaration,
    ...trait_implementation,
}
