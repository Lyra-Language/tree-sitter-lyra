export function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}
export function commaSep(rule) {
  return optional(commaSep1(rule));
}
