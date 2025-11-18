#ifndef SYMMETRIC_H
#define SYMMETRIC_H

#include "params.h"

#ifdef KYBER_90S

#include "aes256ctr.h"
#include "sha2.h"

#if (KYBER_SSBYTES != 32)
#error "90s variant of Kyber can only generate keys of length 256 bits"
#endif

#define hash_h(OUT, IN, INBYTES) sha256(OUT, IN, INBYTES)
#define hash_g(OUT, IN, INBYTES) sha512(OUT, IN, INBYTES)
#define xof_absorb(STATE, IN, X, Y) aes256xof_absorb(STATE, IN, X, Y)
#define xof_squeezeblocks(OUT, OUTBLOCKS, STATE) aes256xof_squeezeblocks(OUT, OUTBLOCKS, STATE)
#define prf(OUT, OUTBYTES, KEY, NONCE) aes256_prf(OUT, OUTBYTES, KEY, NONCE)
#define kdf(OUT, IN, INBYTES) sha256(OUT, IN, INBYTES)

#define XOF_BLOCKBYTES 64

typedef aes256xof_ctx xof_state;

#else /* SHAKE (FIPS202) variant */

#include "fips202.h"

/* Use shake128ctx as the streaming XOF state type */
typedef shake128ctx xof_state;

/* Correct SHAKE-based prototypes */
void kyber_shake128_absorb(shake128ctx *s,
                           const unsigned char *input,
                           unsigned char x,
                           unsigned char y);

void kyber_shake128_squeezeblocks(unsigned char *output,
                                  unsigned long long nblocks,
                                  shake128ctx *s);

void shake256_prf(unsigned char *output,
                  unsigned long long outlen,
                  const unsigned char *key,
                  const unsigned char nonce);

/* Hash & PRF macros */
#define hash_h(OUT, IN, INBYTES) sha3_256(OUT, IN, INBYTES)
#define hash_g(OUT, IN, INBYTES) sha3_512(OUT, IN, INBYTES)

/* XOF abstraction macros */
#define xof_absorb(STATE, IN, X, Y) \
    kyber_shake128_absorb((STATE), (IN), (X), (Y))

#define xof_squeezeblocks(OUT, OUTBLOCKS, STATE) \
    kyber_shake128_squeezeblocks((OUT), (OUTBLOCKS), (STATE))

#define prf(OUT, OUTBYTES, KEY, NONCE) \
    shake256_prf((OUT), (OUTBYTES), (KEY), (NONCE))

#define kdf(OUT, IN, INBYTES) \
    shake256((OUT), KYBER_SSBYTES, (IN), (INBYTES))

#define XOF_BLOCKBYTES 168

#endif /* KYBER_90S */

#endif /* SYMMETRIC_H */
