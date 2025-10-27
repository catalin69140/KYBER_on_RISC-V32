#include "platform.h"


static inline void uart_wait_tx_empty(void) {
  while ((mmio_read8(UART_LSR) & LSR_THRE) == 0) { /* spin */ }
}


void uart_putc(char c) {
  if (c == '\n') {
    uart_wait_tx_empty();
    mmio_write8(UART_RBR_THR, '\r');
  }
  uart_wait_tx_empty();
  mmio_write8(UART_RBR_THR, (uint8_t)c);
}


void uart_puts(const char *s) {
  while (*s) uart_putc(*s++);
}


static const char HEX[] = "0123456789ABCDEF";


void uart_print_hex32(uint32_t v) {
  for (int i = 7; i >= 0; --i) {
    uart_putc(HEX[(v >> (i*4)) & 0xF]);
  }
}
