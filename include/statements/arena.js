/**
 * Arena-based memory allocation for bulk allocation and deallocation
 * 
 * Usage:
 *   - Anonymous: `with Arena.new(megabytes(4)) { ... }`
 *   - Named binding: `with frame = Arena.new(megabytes(4)) { ... }`
 * 
 * Benefits:
 *   - Bulk allocation/deallocation (great for per-frame game allocations)
 *   - No fragmentation
 *   - Cycles in arena-allocated data are handled automatically
 *   - Arena is automatically freed at end of `with` block
 */

const { PREC } = require("../prec");

module.exports = {
  // With block - scoped arena usage
  // All allocations in the block use the specified arena
  // `with Arena.new(megabytes(4)) { ... }` - anonymous
  // `with frame = Arena.new(megabytes(4)) { ... }` - named binding
  with_statement: $ => prec.right(PREC.WITH_STATEMENT, seq(
    'with',
    optional(seq(
      field('name', $.identifier),
      '='
    )),
    field('arena', $.expression),
    field('body', $.block)
  )),
}

