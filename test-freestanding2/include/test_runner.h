#ifndef TEST_RUNNER_H
#define TEST_RUNNER_H
#include <stdint.h>
#include <stdbool.h>


void uart_putc(char c);
void uart_puts(const char *s);
void uart_print_hex32(uint32_t v);


#define ASSERT_TRUE(cond) do { \
  if (!(cond)) { \
    uart_puts("[FAIL] " __FILE__ ":" ); \
    uart_print_hex32(__LINE__); \
    uart_puts(" ASSERT_TRUE(" #cond ")\n"); \
    return 1; \
  } \
} while (0)


#define ASSERT_EQ_U32(a,b) do { \
  uint32_t _va=(uint32_t)(a), _vb=(uint32_t)(b); \
  if (_va != _vb) { \
    uart_puts("[FAIL] " __FILE__ ":" ); \
    uart_print_hex32(__LINE__); \
    uart_puts(" ASSERT_EQ_U32 got=0x"); \
    uart_print_hex32(_va); \
    uart_puts(" exp=0x"); \
    uart_print_hex32(_vb); \
    uart_puts("\n"); \
    return 1; \
  } \
} while (0)


#endif /* TEST_RUNNER_H */
