# Kyber on RISC-V

**Author:** [Denisa Greconici](https://github.com/denigreco/Kyber_RISC_V_Thesis) \
This project is based on the [mupq/pqriscv](https://github.com/mupq/pqriscv) repository.\
The optimized Kyber implementation for RISC-V is in the folder:  `krypto_kem`


### Prerequisites

---

1. Make sure that you install the [RISC-V GNU toolchain](https://github.com/riscv/riscv-gnu-toolchain). 
2. Make sure your current jdk is 1.8 (java -version). It does not work with newer versions of jdk.
3. Install [SBT](https://www.scala-sbt.org/).
4. Install [Verilator](https://www.veripool.org/wiki/verilator).
5. Clone the [pqriscv-vexriscv](https://github.com/mupq/pqriscv-vexriscv.git) repository.

> Note: For more details for each individual step look at README.md from the root folder.

---

### How to reproduce the [results](https://www.cs.ru.nl/masters-theses/2020/D_Greconici___KYBER_on_RISC-V.pdf)

---

First, go to the `Kyber` folder and compile all levels of Kyber using the following commands:
```bash
./build_everything.py -s pqvexriscvsim kyber512
./build_everything.py -s pqvexriscvsim kyber768
./build_everything.py -s pqvexriscvsim kyber1024
```

All binaries are generated in the `bin` folder and they need to be manually run one by one. In order to reproduce the results, switch to the folder where `pqriscv-vexriscv` is cloned. 

Switch to the folfer `pqriscv-vexriscv` and we are using the following template command to explain how to run all the binaries:
```bash
sbt "runMain mupq.PQVexRiscvSim --init ../Kyber/bin/crypto_kem_kyber768_kyber768r1_speed.bin"
```

In this template, `crypto_kem_kyber768_kyber768r1_speed.bin` is the name of the binary that we are executing (generated previously). 

Replace `kyber768` with `kyber512` or `kyber1024` to get the results specific to the other security levels of Kyber. 

Replace `r1` with `r2` to get the results from round 2, and with `ref1` or `ref2` to get the results from the reference code of round 1 and 2. Each test has to be run individually. The current command produces the speed results indicated by the last word in it: `speed`. 

To compute how much Keccak takes in each block (key generation, encapsulation and decapsulation), replace the `speed` word with `hashing`. 
```bash
sbt "runMain mupq.PQVexRiscvSim --init ../Kyber/bin/crypto_kem_kyber768_kyber768r1_hashing.bin"
```

To get the `code size` of Kyber round 1 and 2, go to the the thesis folder and then run: 
```bash
cd crypto_kem/code-size/round1
sh code_size.sh
cd ../round2
sh code_size.sh
```
