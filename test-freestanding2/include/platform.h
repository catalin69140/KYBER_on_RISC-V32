#ifndef PLATFORM_H
#define PLATFORM_H
#include <stdint.h>


/* QEMU virt 16550 UART base */
#define UART0_BASE 0x10000000UL
#define UART_RBR_THR (UART0_BASE + 0x00)
#define UART_LSR (UART0_BASE + 0x05)


/* LSR bits */
#define LSR_THRE 0x20


static inline void mmio_write8(uintptr_t addr, uint8_t val) {
  *(volatile uint8_t *)addr = val;
}


static inline uint8_t mmio_read8(uintptr_t addr) {
  return *(volatile uint8_t *)addr;
}


static inline uint64_t rdcycle(void) {
  uint64_t v;
  #if __riscv_xlen == 32
  uint32_t hi, lo, hi2;
  __asm__ volatile (
    "rdcycleh %0\n\t"
    "rdcycle %1\n\t"
    "rdcycleh %2\n\t"
  : "=r"(hi), "=r"(lo), "=r"(hi2));
  if (hi != hi2) {
    __asm__ volatile ("rdcycle %0" : "=r"(lo));
  }
  v = ((uint64_t)hi2 << 32) | lo;
  #else
    __asm__ volatile ("rdcycle %0" : "=r"(v));
  #endif
  return v;
}


#endif /* PLATFORM_H */
