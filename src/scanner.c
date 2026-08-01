#include "tree_sitter/parser.h"
#include <string.h>

// Token types - must match the order in grammar.js externals
enum TokenType {
  BLOCK_COMMENT,
  STRING_START,
  STRING_CONTENT,
  INTERPOLATION_START,
  INTERPOLATION_END,
  STRING_END,
  RAW_STRING_LITERAL,
  NEWLINE,
};


// Context type for the stack
typedef enum {
  CTX_STRING,        // Inside a string literal
  CTX_INTERPOLATION, // Inside an interpolation ${...}
} ContextType;

// Stack entry
typedef struct {
  ContextType type;
  unsigned brace_depth; // For interpolation: tracks nested {} braces
} StackEntry;

// Scanner state
#define MAX_STACK_DEPTH 64

typedef struct {
  StackEntry stack[MAX_STACK_DEPTH];
  unsigned stack_size;
} Scanner;

// Helper: check if we're currently inside a string context
static bool in_string(Scanner *scanner) {
  if (scanner->stack_size == 0) return false;
  return scanner->stack[scanner->stack_size - 1].type == CTX_STRING;
}

// Helper: check if we're currently inside an interpolation context
static bool in_interpolation(Scanner *scanner) {
  if (scanner->stack_size == 0) return false;
  return scanner->stack[scanner->stack_size - 1].type == CTX_INTERPOLATION;
}

// Helper: push a context onto the stack
static void push_context(Scanner *scanner, ContextType type) {
  if (scanner->stack_size < MAX_STACK_DEPTH) {
    scanner->stack[scanner->stack_size].type = type;
    scanner->stack[scanner->stack_size].brace_depth = 0;
    scanner->stack_size++;
  }
}

// Helper: pop a context from the stack
static void pop_context(Scanner *scanner) {
  if (scanner->stack_size > 0) {
    scanner->stack_size--;
  }
}

// Helper: get current interpolation brace depth
static unsigned get_brace_depth(Scanner *scanner) {
  if (scanner->stack_size == 0) return 0;
  return scanner->stack[scanner->stack_size - 1].brace_depth;
}

// Helper: increment brace depth
static void inc_brace_depth(Scanner *scanner) {
  if (scanner->stack_size > 0) {
    scanner->stack[scanner->stack_size - 1].brace_depth++;
  }
}

// Helper: decrement brace depth
static void dec_brace_depth(Scanner *scanner) {
  if (scanner->stack_size > 0 && scanner->stack[scanner->stack_size - 1].brace_depth > 0) {
    scanner->stack[scanner->stack_size - 1].brace_depth--;
  }
}

// Scan block comments (preserved from original)
static bool scan_block_comment(TSLexer *lexer) {
  // Skip whitespace
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || 
         lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    lexer->advance(lexer, true);
  }

  // Check if we're at the start of a block comment
  if (lexer->lookahead != '/') {
    return false;
  }
  lexer->advance(lexer, false);
  
  if (lexer->lookahead != '*') {
    return false;
  }
  lexer->advance(lexer, false);

  // Track nesting depth
  unsigned depth = 1;

  // Scan until we find the matching closing comment
  while (depth > 0) {
    if (lexer->eof(lexer)) {
      return false; // Unclosed comment
    }

    if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        lexer->advance(lexer, false);
        depth--;
      }
    } else if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '*') {
        lexer->advance(lexer, false);
        depth++;
      }
    } else {
      lexer->advance(lexer, false);
    }
  }

  lexer->result_symbol = BLOCK_COMMENT;
  lexer->mark_end(lexer);
  return true;
}

// Scan a Swift-style raw string literal: `...`, #`...`#, ##`...`##, etc.
// The number of '#' characters preceding the opening backtick determines the
// number of '#' characters required after the closing backtick. Content is
// literal: no escape sequences, no interpolation.
static bool scan_raw_string(TSLexer *lexer) {
  unsigned hash_count = 0;
  while (lexer->lookahead == '#') {
    lexer->advance(lexer, false);
    hash_count++;
  }

  if (lexer->lookahead != '`') {
    return false;
  }
  lexer->advance(lexer, false);

  while (!lexer->eof(lexer)) {
    if (lexer->lookahead == '`') {
      lexer->advance(lexer, false);
      unsigned matched = 0;
      while (matched < hash_count && lexer->lookahead == '#') {
        lexer->advance(lexer, false);
        matched++;
      }
      if (matched == hash_count) {
        lexer->mark_end(lexer);
        lexer->result_symbol = RAW_STRING_LITERAL;
        return true;
      }
      // Not a complete terminator; keep scanning the body.
      continue;
    }
    lexer->advance(lexer, false);
  }

  return false;
}

// Does the text at the cursor start with `word`, as a whole word? Only ASCII
// letters follow a keyword we care about, so the boundary test is just "the next
// character is not a letter, digit or underscore".
//
// Consumes what it inspects, which is why callers must already have decided not
// to emit a token: the lookahead cannot be rewound. Every caller here is on the
// "return false" path.
static bool peek_keyword(TSLexer *lexer, const char *word) {
  for (const char *p = word; *p; p++) {
    if (lexer->lookahead != (int32_t)*p) {
      return false;
    }
    lexer->advance(lexer, true);
  }
  int32_t c = lexer->lookahead;
  bool ident_char = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                    (c >= '0' && c <= '9') || c == '_';
  return !ident_char;
}

// Scan the statement terminator: a newline that ends a statement.
//
// **The parser decides whether a statement may end here, not this function.**
// tree-sitter only sets valid_symbols[NEWLINE] in states where the grammar
// accepts a terminator, so a newline in the middle of an unfinished expression
// (`a +` at end of line, or anywhere inside parens) never reaches this code —
// which is what makes trailing-operator continuation work with no token table.
// Go needs a list of "tokens that may end a statement" precisely because its
// insertion happens in the lexer, with no parse state to ask.
//
// What is left for this function is the *forward* half: a line that begins with
// something which continues the previous statement rather than starting a new
// one.
//
// **The rule for what belongs here: a token that cannot begin a statement.**
// That is what makes suppression safe — if a line could not have been a new
// statement anyway, treating it as a continuation cannot hide a misparse. Every
// entry below meets that test:
//
//   - `.` — a method chain (`m\n  .map(f)`). UFCS is decided (lyra/todo.md), so
//     receiver chains are about to become the normal way to write a pipeline;
//     Go's rule, which has no forward half at all, is what forces its users to
//     leave a trailing dot.
//   - `|` — the leading-bar style for a multi-line `data` declaration
//     (`data CSSColor =\n  | ColorName …\n  | Hex …`), which the corpus already
//     uses and which this change broke before the case was added.
//   - `else` — `}\nelse {`. Go requires `} else {`; nothing in Lyra's corpus
//     writes it either way today, so this costs nothing and removes a papercut.
//   - `where` — a bound written under its declaration.
//
// Notably absent: `-`, `(`, `[`, `*`. Each of those *can* start a statement — a
// negation, a parenthesized expression, an array literal, a deref assignment —
// and treating them as continuations is exactly the silent misparse this whole
// change exists to fix (`let b = a` then `-2` was reading as `a - 2`). A leading
// binary operator ends the previous statement; write the operator at the end of
// the previous line to continue across lines.
//
// Comments are not skipped here. On seeing `/` this returns false, tree-sitter's
// own lexer consumes the comment as an extra, and the scanner is called again at
// the position after it — so a trailing `// note` does not suppress the
// terminator on its line. The one gap is a *block* comment containing the only
// newline (`a = 1 /*\n*/ b = 2`), which joins; that is rare enough to leave.
static bool scan_newline(TSLexer *lexer) {
  bool saw_newline = false;
  for (;;) {
    int32_t c = lexer->lookahead;
    if (c == ' ' || c == '\t' || c == '\r') {
      lexer->advance(lexer, true);
    } else if (c == '\n') {
      saw_newline = true;
      lexer->advance(lexer, true);
    } else {
      break;
    }
  }
  if (!saw_newline) {
    return false;
  }

  // The terminator is zero-width: it stands for the line break, and the break
  // was consumed above as token padding. mark_end here keeps it from swallowing
  // the next token.
  lexer->mark_end(lexer);

  bool continuation = false;
  switch (lexer->lookahead) {
  case '.':
  case '|':
    continuation = true;
    break;
  case 'e':
    continuation = peek_keyword(lexer, "else");
    break;
  case 'w':
    continuation = peek_keyword(lexer, "where");
    break;
  default:
    break;
  }
  if (continuation) {
    return false;
  }

  lexer->result_symbol = NEWLINE;
  return true;
}

// External scanner API
void *tree_sitter_lyra_external_scanner_create(void) {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  return scanner;
}

void tree_sitter_lyra_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  free(scanner);
}

unsigned tree_sitter_lyra_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  
  // Serialize stack size
  if (scanner->stack_size == 0) {
    return 0;
  }
  
  unsigned pos = 0;
  buffer[pos++] = (char)scanner->stack_size;
  
  // Serialize each stack entry
  for (unsigned i = 0; i < scanner->stack_size && pos < TREE_SITTER_SERIALIZATION_BUFFER_SIZE - 2; i++) {
    buffer[pos++] = (char)scanner->stack[i].type;
    buffer[pos++] = (char)scanner->stack[i].brace_depth;
  }
  
  return pos;
}

void tree_sitter_lyra_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  scanner->stack_size = 0;
  
  if (length == 0) {
    return;
  }
  
  unsigned pos = 0;
  scanner->stack_size = (unsigned char)buffer[pos++];
  
  if (scanner->stack_size > MAX_STACK_DEPTH) {
    scanner->stack_size = MAX_STACK_DEPTH;
  }
  
  for (unsigned i = 0; i < scanner->stack_size && pos < length - 1; i++) {
    scanner->stack[i].type = (ContextType)(unsigned char)buffer[pos++];
    scanner->stack[i].brace_depth = (unsigned char)buffer[pos++];
  }
}

bool tree_sitter_lyra_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;

  // Statement terminator, first — but never inside a string, where a newline is
  // ordinary content, and never inside an interpolation, whose `${…}` holds an
  // expression rather than statements. Both are the same guard the comment
  // branch below needs, and for the same reason: this runs before them.
  //
  // valid_symbols[NEWLINE] is false in the overwhelming majority of states, so
  // the common path is one array read.
  if (valid_symbols[NEWLINE] && !in_string(scanner) && !in_interpolation(scanner)) {
    if (scan_newline(lexer)) {
      return true;
    }
  }

  // Handle block comment.
  //
  // NEVER inside a string: `"/*"` is two content bytes, not a comment opener.
  // Comments are `extras`, so BLOCK_COMMENT is valid almost everywhere —
  // including at a string content-chunk boundary — and this check runs before
  // the in_string() branch below. Unguarded, a string whose content begins with
  // `/*` swallowed everything up to the next `*/` anywhere in the file (the rest
  // of that line, following declarations, and all) as a comment, with no
  // diagnostic from any later pass. It fired at each point where a fresh content
  // chunk starts: the opening quote, right after a `${…}` interpolation, and —
  // because scan_block_comment skips leading whitespace as token padding —
  // after a leading space (`" /* x */ y"`).
  //
  // An *interpolation* is an expression context, so comments stay valid there;
  // in_string() is false for CTX_INTERPOLATION, which is exactly the distinction
  // this guard needs. (`//` line comments are matched by the internal lexer, and
  // the content scan below already consumes them as ordinary bytes.)
  if (valid_symbols[BLOCK_COMMENT] && !in_string(scanner)) {
    if (scan_block_comment(lexer)) {
      return true;
    }
  }


  // Handle raw string literal. Only valid outside of regular string content,
  // since inside a "..." string, '#' may start an interpolation.
  if (valid_symbols[RAW_STRING_LITERAL] && !in_string(scanner)) {
    if (lexer->lookahead == '#' || lexer->lookahead == '`') {
      if (scan_raw_string(lexer)) {
        return true;
      }
    }
  }

  // If we're inside a string, we can emit string content, interpolation start, or string end
  if (in_string(scanner)) {
    // Check for string end
    if (valid_symbols[STRING_END] && lexer->lookahead == '"') {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = STRING_END;
      pop_context(scanner);
      return true;
    }

    // Check for interpolation start: ${
    if (valid_symbols[INTERPOLATION_START] && lexer->lookahead == '$') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '{') {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
        lexer->result_symbol = INTERPOLATION_START;
        push_context(scanner, CTX_INTERPOLATION);
        return true;
      }
      // Not an interpolation, backtrack by scanning as content
      // Actually, we can't backtrack in tree-sitter, so we need to handle this differently
      // We'll scan this # as part of string_content below
    }

    // Scan string content
    if (valid_symbols[STRING_CONTENT]) {
      bool has_content = false;
      
      while (!lexer->eof(lexer)) {
        if (lexer->lookahead == '"') {
          // End of string
          break;
        }
        
        if (lexer->lookahead == '$') {
          // Check if this is the start of interpolation
          lexer->mark_end(lexer);
          lexer->advance(lexer, false);
          if (lexer->lookahead == '{') {
            // This is interpolation, stop before the $
            if (has_content) {
              lexer->result_symbol = STRING_CONTENT;
              return true;
            }
            // No content before interpolation, let the interpolation handler deal with it
            return false;
          }
          // Not interpolation, continue (# is part of content)
          has_content = true;
          continue;
        }
        
        if (lexer->lookahead == '\\') {
          // Escape sequence - consume the backslash and the next character
          lexer->advance(lexer, false);
          has_content = true;
          if (!lexer->eof(lexer)) {
            lexer->advance(lexer, false);
          }
          continue;
        }
        
        // Regular character
        lexer->advance(lexer, false);
        has_content = true;
      }
      
      if (has_content) {
        lexer->mark_end(lexer);
        lexer->result_symbol = STRING_CONTENT;
        return true;
      }
    }
    
    return false;
  }

  // If we're inside an interpolation, we need to track braces
  if (in_interpolation(scanner)) {
    // Check for opening brace (nested braces in expressions)
    if (lexer->lookahead == '{') {
      inc_brace_depth(scanner);
      // Let the normal grammar handle this
      return false;
    }
    
    // Check for closing brace
    if (valid_symbols[INTERPOLATION_END] && lexer->lookahead == '}') {
      if (get_brace_depth(scanner) == 0) {
        // This closes the interpolation
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
        lexer->result_symbol = INTERPOLATION_END;
        pop_context(scanner);
        return true;
      } else {
        // This closes a nested brace in the expression
        dec_brace_depth(scanner);
        return false;
      }
    }
    
    // Check for nested string start inside interpolation
    if (valid_symbols[STRING_START] && lexer->lookahead == '"') {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = STRING_START;
      push_context(scanner, CTX_STRING);
      return true;
    }
    
    return false;
  }

  // Not inside string or interpolation - check for string start
  if (valid_symbols[STRING_START] && lexer->lookahead == '"') {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
    lexer->result_symbol = STRING_START;
    push_context(scanner, CTX_STRING);
    return true;
  }

  return false;
}
