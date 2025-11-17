#!/bin/bash

# Load CROSS_PREFIX from riscv_config.mk using make
CROSS_PREFIX=$(make -s -f - print-CROSS_PREFIX << 'EOF'
include ../../../riscv_config.mk
print-%:
	@echo $($*)
EOF
)

echo "Using toolchain: $CROSS_PREFIX"

#kyber files
${CROSS_PREFIX}-gcc -O3 -fno-common -o verify.o               -c verify.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o indcpa.o               -c indcpa.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o kem.o                  -c kem.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o nttc.o                 -c ntt.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o poly.o                 -c poly.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o polyvec.o              -c polyvec.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o reduce.o               -c reduce.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o symmetric-fips202.o    -c symmetric-fips202.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o cbd.o                  -c cbd.c

#asm
${CROSS_PREFIX}-gcc -O3 -fno-common -o ntt.o                  -c ntt_2.S
${CROSS_PREFIX}-gcc -O3 -fno-common -o invntt.o               -c invntt_2.S

#common files
${CROSS_PREFIX}-gcc -O3 -fno-common -o fips202.o              -c fips202.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o sha2.o                 -c sha2.c
${CROSS_PREFIX}-gcc -O3 -fno-common -o keccakf1600.o          -c keccakf1600.c 
${CROSS_PREFIX}-gcc -O3 -fno-common -o randombytes.o          -c randombytes.c 

#size
${CROSS_PREFIX}-ar -crs arch.a *.o
echo "\n\n  KYBER SIZE ROUND 2:"
${CROSS_PREFIX}-size -t arch.a
echo "\n\n"

#clean
rm -f *.o
rm -f *.a
