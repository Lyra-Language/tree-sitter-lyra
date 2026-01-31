const array_literals = require('./array');
const boolean_literal = require('./boolean');
const char_literal = require('./char');
const number_literals = require('./numbers');
const regex_literal = require('./regex');
const string_literals = require('./string');
const struct_literal = require('./struct');
const tuple_literal = require('./tuple');

module.exports = {
  _literal: $ => prec.right(
    1,
    choice(
      $._number_literal,
      $.array_literal,
      $.array_repeat_init,
      $.boolean_literal,
      $.char_literal,
      $.regex_literal,
      $.string_literal,
      $.raw_string_literal,
      $.struct_literal,
      $.tuple_literal,
    )
  ),
  ...array_literals,
  ...boolean_literal,
  ...char_literal,
  ...number_literals,
  ...regex_literal,
  ...string_literals,
  ...struct_literal,
  ...tuple_literal,
}