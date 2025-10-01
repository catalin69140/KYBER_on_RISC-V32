#!/bin/bash

# This was tested on Ubuntu 24.04.03(live-server-arm64).



# This command is for the GNU toolchain dependencies:
sudo apt-get install autoconf automake autotools-dev curl python3 libmpc-dev libmpfr-dev libgmp-dev gawk build-essential bison flex texinfo gperf libtool patchutils bc zlib1g-dev libexpat-dev

# This command is used by GDB so can run a dashboard script:
sudo apt-get install python-dev



# The following may not be necessary on 24.04.03(live-server-arm64) but my tests included it:
sudo apt install ninja-build libglib2.0-dev libpixman-1-dev



# This is a useful tool for viewing the configuration of the QEMU-emulated machines:
sudo apt install device-tree-compiler

