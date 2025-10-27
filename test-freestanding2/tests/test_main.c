#include <stdint.h>
#include <stdbool.h>
#include "platform.h"
#include "test_runner.h"


/* Prototypes */
void util_seed(void);
uint32_t util_rand32(void);
void board_init(void);


static int test_math(void) {
  ASSERT_EQ_U32(1+1, 2);                          // checks addition
  ASSERT_EQ_U32(3*7, 21);                         // checks multiplication
  ASSERT_TRUE(((uint32_t)0xDEADBEEF) != 0);       // sanity check that constants work
  return 0;
}


static int test_prng(void) {
  util_seed();                   // seed PRNG with rdcycle (hardware cycle counter)
  uint32_t a = util_rand32();    // get one random number
  uint32_t b = util_rand32();    // get another
  ASSERT_TRUE(a != b);           // ensure they differ
  return 0;
}


int main(void) {
  board_init();
  uart_puts("\n=== test-freestanding2 (rv32) ===\n");


  int fails = 0;
  if (test_math()) fails++;
  if (test_prng()) fails++;


  if (fails == 0) {
    uart_puts("[PASS] All tests passed\n");
  } 
  else {
    uart_puts("[FAIL] ");
    uart_print_hex32((uint32_t)fails);
    uart_puts(" test(s) failed\n");
  }


  /* Return to halt loop */
  return 0;
}
