# KYBER_on_RISC-V32

To use a specific JDK for within your environment, you'll need to set the JAVA_HOME environment variable after you activate the Python environment. Since environment variables are typically isolated within the active shell session (or virtual environment session)

<details>
<summary>

## RISC-V GNU toolchain Installation (Click to Expand) ⚙️

</summary>
  
---

write here

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
