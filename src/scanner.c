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
};

// Context type for the stack
typedef enum {
  CTX_STRING,        // Inside a string literal
  CTX_INTERPOLATION, // Inside an interpolation #{...}
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

  // Handle block comment
  if (valid_symbols[BLOCK_COMMENT]) {
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

    // Check for interpolation start: #{
    if (valid_symbols[INTERPOLATION_START] && lexer->lookahead == '#') {
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
        
        if (lexer->lookahead == '#') {
          // Check if this is the start of interpolation
          lexer->mark_end(lexer);
          lexer->advance(lexer, false);
          if (lexer->lookahead == '{') {
            // This is interpolation, stop before the #
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
