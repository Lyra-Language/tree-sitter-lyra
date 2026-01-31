module.exports = {
  _integer_type: $ => choice($.signed_integer_type, $.unsigned_integer_type),
  signed_integer_type: $ => choice('int', 'i8', 'i16', 'i32', 'i64'),
  unsigned_integer_type: $ => choice('uint', 'u8', 'u16', 'u32', 'u64'),
  float_type: $ => choice('float', 'f16', 'f32', 'f64'),
}