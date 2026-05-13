module.exports = {
  sizeof_expr: ($) => seq("@sizeof", "(", field("type", $.type), ")"),
};
