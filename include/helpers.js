export function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}
export function commaSep(rule) {
  return optional(commaSep1(rule));
}

// A statement list: statements separated by `_statement_separator`, with the
// separator after the *last* one optional.
//
// Written as "repeat(statement separator) then an optional trailing statement"
// rather than the usual sep1 shape (`stmt (sep stmt)* sep?`) because this form
// decides on a single lookahead token: after a statement, a separator means the
// list continues and `}`/EOF means it ended. The sep1 shape has to see one token
// *past* a separator to know whether it is a real separator or the trailing one.
export function statementList($) {
  return seq(
    repeat(seq($.statement, $._statement_separator)),
    optional($.statement),
  );
}

export function parameterList(parameterRule) {
  return seq(
    "(",
    optional(seq(parameterRule, repeat(seq(",", parameterRule)), optional(","))),
    ")"
  );
}