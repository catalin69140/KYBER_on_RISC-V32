# KYBER on RISC-V32I — GNU Toolchain, QEMU & Quickstart (Ubuntu)

This project runs **CRYSTALS-Kyber** on **RV32** using the **RISC-V GNU (ELF/Newlib) toolchain** and **QEMU**.
The toolchain installs under your user folder, next to this repo.

Source: [Denisa Greconici](https://github.com/denigreco/Kyber_RISC_V_Thesis)

It follows the structure of [John Winans’](https://github.com/johnwinans/riscv-toolchain-install-guide) guide for predictable installs and paths.

* **Toolchain & QEMU path:** `~/Kyber-Project/riscv/install/rv32i/bin`
* **Project location:** `~/Kyber-Project/KYBER_on_RISC-V32`
* **Default ISA/ABI:** `-march=rv32i`, `-mabi=ilp32`

> To uninstall the toolchain, remove `~/Kyber-Project/riscv/`.
> Your repo remains in `~/Kyber-Project/KYBER_on_RISC-V32`.

---

For MacOS at the moment I do not have a solution on how to run it as there were some problem with the toolchain set-up.

---

Tested on Ubuntu 24.04. It should work from Ubuntu 20.04 and up.

## 1) Ubuntu prerequisites

```bash
sudo apt update
sudo apt install -y git build-essential autoconf automake autotools-dev \
  curl python3 libmpc-dev libmpfr-dev libgmp-dev gawk gperf bison flex \
  texinfo help2man libtool patchutils zlib1g-dev libexpat1-dev ninja-build \
  cmake libglib2.0-dev libpixman-1-dev
```

---

## 2) Get the project

```bash
mkdir -p Kyber-Project
cd Kyber-Project
git clone https://github.com/catalin69140/KYBER_on_RISC-V32.git
cd KYBER_on_RISC-V32
```

---

Follow the next sections in order.

---

<details>
<summary>

## RISC-V GNU toolchain Installation (Click to Expand) ⚙️

</summary>
  
---

## 1) One-command setup (deps → submodules → toolchain → QEMU)

```bash
# from the repo root
./setup.sh
```

> Note that this can take the better part of an hour to complete!

This will:

* Install OS dependencies (idempotent)
* Initialize & update submodules at pinned commits
* Build **rv32i** GNU toolchain + QEMU into `~/Kyber-Project/riscv/install/rv32i`

Add tools to your PATH:

```bash
echo 'export PATH=$HOME/Kyber-Project/riscv/install/rv32i/bin:$PATH' >> ~/.bashrc
export PATH=$HOME/Kyber-Project/riscv/install/rv32i/bin:$PATH
```

Sanity checks:

```bash
which riscv32-unknown-elf-gcc && riscv32-unknown-elf-gcc --version
which qemu-system-riscv32 && qemu-system-riscv32 --version
```

---

## 2) Build & run KYBER (**rv32i** by default)

```bash
# Default build = Kyber-768 (KYBER_K=3), ISA = rv32i
make

# Run on QEMU (virt, headless)
make run-qemu
```

Pick a Kyber parameter set:

```bash
make kyber512     # KYBER_K=2
make kyber768     # KYBER_K=3 (default)
make kyber1024    # KYBER_K=4
```

---

## 3) (Optional) Spike + proxy kernel

```bash
make run-spike
```

---

## 4) Hello-UART smoke test

```bash
make run-hello
# expected output:
# hello from rv32 on qemu virt!
```

---

here next


</details>

---

<details>
<summary>
  
## JDK Set-Up (Click to Expand) ⚙️
  
</summary>
  
---

# JDK Set-Up

This chapter explains how to correctly set the **`JAVA_HOME`** environment variable in an Ubuntu environment and how to specifically configure your system to use **Java 8 (JDK 1.8)**, which is often required for older or legacy projects.

-----

## 1\. Determine the Required JDK Version

This project requires **Java 8 (JDK 1.8)**. If you have newer versions installed, you need to either install Java 8 or switch your system's default Java version to 8.

### 1.1 Check Your Current Version

Run this command in your terminal to check the currently active Java version:

```bash
java -version
```

  * If the output starts with `java version "1.8.0_..."` or `openjdk version "1.8.0_..."`, you are all set for the version requirement and can proceed to **Section 3**.
  * If the version is newer (e.g., 11, 17, or 21), proceed to **Section 1.2**.

### 1.2 Install OpenJDK 8 JRE

If Java 8 is not installed, use the following command to install the OpenJDK 8 Runtime Environment (JRE):

```bash
sudo apt-get update
sudo apt-get install openjdk-8-jre
```

This ensures the necessary Java 8 files are on your system.

-----

## 2\. Switch the System Default to Java 8

When multiple Java versions are installed, Ubuntu uses the `update-alternatives` system to manage which version the `java` command points to.

1.  Execute the following command to view a list of all installed Java executables:

    ```bash
    sudo update-alternatives --config java
    ```

2.  A numbered list will appear. Identify the selection number that corresponds to the **Java 8 path** (it will look similar to `/usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java`).

    ```
      Selection    Path                                            Priority   Status
    ------------------------------------------------------------
      0            /usr/lib/jvm/java-17-openjdk-amd64/bin/java      1711       auto mode
      1            /usr/lib/jvm/java-11-openjdk-amd64/bin/java      1100       manual mode
    * 2            /usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java   1081       manual mode

    Press <enter> to keep the current choice[*], or type selection number:
    ```

3.  Type the corresponding number for **Java 8** and press **Enter**. This sets Java 8 as the new system default.

-----

## 3\. Set the JAVA\_HOME Environment Variable

The `JAVA_HOME` variable is essential for build tools (like Maven, Gradle) and other Java applications to locate the correct JDK installation. This step makes the change permanent for your user.

### 3.1 Find the JDK 8 Path

You need the path to the Java 8 installation directory (the folder that contains the `bin` directory). For OpenJDK 8, this path is typically:

```
/usr/lib/jvm/java-8-openjdk-amd64
```

*Note: If your system uses a different naming convention, find the correct path in the list generated in Section 2, but use the path *without* the `/jre/bin/java` suffix.*

### 3.2 Edit the Shell Configuration File

1.  Open your user's shell configuration file, usually **`~/.bashrc`**:

    ```bash
    nano ~/.bashrc
    ```

2.  Add the following lines to the end of the file, ensuring you use your specific Java 8 path:

    ```bash
    # Setting JAVA_HOME to Java 8 (JDK 1.8) for this project requirement
    export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
    # Optionally, add the JDK's bin directory to your PATH
    export PATH=$JAVA_HOME/bin:$PATH
    ```
    
    *Note: Typing these commands in the terminal is possible but it will only hold in the current terminal. Closing the terminal it resets the JDK.*
    
4.  Save the file (**Ctrl+O**, then **Enter** in `nano`) and exit (**Ctrl+X** in `nano`).

### 3.3 Apply Changes

Reload the configuration file so the new variable takes effect in your current terminal session:

```bash
source ~/.bashrc
```

-----

## 4\. Verification

Confirm that both the system default and the `JAVA_HOME` variable are pointing to Java 8.

1.  **Verify `JAVA_HOME`:**

    ```bash
    echo $JAVA_HOME
    ```

    Output should show the Java 8 installation path.

2.  **Verify Java Version:**

    ```bash
    java -version
    ```

    Output should start with `java version "1.8.0_..."`.

You can now use your required project tools and run Java applications, as they will correctly identify and use the Java 8 installation.

</details>
