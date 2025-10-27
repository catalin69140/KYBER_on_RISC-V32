#include <stdint.h>
#include "platform.h"


/* Tiny xorshift32 PRNG seeded by cycle counter */
static uint32_t s = 1u;


void util_seed(void) {
  s = (uint32_t)rdcycle();
  if (s == 0) s = 1u;
}


uint32_t util_rand32(void) {
  uint32_t x = s;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  s = x;
  return x;
}


/* Weak hooks (can be overridden) */
__attribute__((weak)) void board_init(void) {}
