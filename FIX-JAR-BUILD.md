# Fix: JAR Not Containing Compiled Classes

## Problem Identified

The JAR file was being created but **didn't contain the compiled Java classes**. This happened because:

1. Project has `packaging>pom</packaging>` - Maven doesn't automatically compile Java sources
2. Compiler plugin wasn't explicitly executing
3. JAR plugin wasn't configured to use the correct classes directory

## Solution Applied

Updated `pom.xml` with:

1. ✅ **Explicit compiler execution** - Forces compilation even with pom packaging
2. ✅ **Source/Output directories** - Explicitly set in build section
3. ✅ **JAR plugin configuration** - Uses correct classes directory

## Changes Made to pom.xml

### 1. Added Build Directories
```xml
<build>
  <sourceDirectory>src/main/java</sourceDirectory>
  <outputDirectory>target/classes</outputDirectory>
  ...
</build>
```

### 2. Explicit Compiler Execution
```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <executions>
    <execution>
      <id>default-compile</id>
      <phase>compile</phase>
      <goals>
        <goal>compile</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

### 3. JAR Plugin Configuration
```xml
<configuration>
  <classifier>mediator</classifier>
  <classesDirectory>${project.build.outputDirectory}</classesDirectory>
  <includes>
    <include>com/cbo/wso2/mediator/**</include>
  </includes>
</configuration>
```

## Steps to Fix

### 1. Clean and Rebuild
```bash
cd d:\WSO2\Addis_Land
mvn clean install
```

### 2. Verify Classes Were Compiled
```powershell
# Check if classes exist
dir target\classes\com\cbo\wso2\mediator\*.class
```

Should show: `AddislandJWTGeneratorMediator.class`

### 3. Verify JAR Contains Classes
```powershell
# List JAR contents
jar tf target\addis_land-1.0.0-mediator.jar
```

Should include:
```
com/cbo/wso2/mediator/AddislandJWTGeneratorMediator.class
META-INF/MANIFEST.MF
```

### 4. Verify JAR Was Copied
```powershell
# Check deployment/libs
dir deployment\libs\addis_land-1.0.0-mediator.jar
```

### 5. Deploy CAR File
```powershell
# Copy CAR to WSO2 MI
Copy-Item target\addis_land_1.0.0.car <WSO2_MI_HOME>\repository\deployment\server\carbonapps\
```

### 6. Restart WSO2 MI
```powershell
cd <WSO2_MI_HOME>\bin
.\micro-integrator.bat restart
```

### 7. Check Logs
Look for:
```
✅ [INFO] Deploying API: BankRestrictionAPI
✅ [INFO] API deployed successfully: /bank-restriction-api
```

**NOT:**
```
❌ ClassNotFoundException: com.cbo.wso2.mediator.AddislandJWTGeneratorMediator
```

## Expected Build Output

When you run `mvn clean install`, you should see:

```
[INFO] --- maven-compiler-plugin:3.8.1:compile (default-compile) @ addis_land ---
[INFO] Changes detected - recompiling the module!
[INFO] Compiling 1 source file to D:\WSO2\Addis_Land\target\classes
[INFO] --- maven-jar-plugin:jar (build-mediator-jar) @ addis_land ---
[INFO] Building jar: D:\WSO2\Addis_Land\target\addis_land-1.0.0-mediator.jar
[INFO] --- maven-antrun-plugin:run (copy-mediator-jar) @ addis_land ---
[INFO] Executing tasks
[INFO]      [echo] Copied mediator JAR: addis_land-1.0.0-mediator.jar to deployment/libs/
[INFO] --- vscode-car-plugin:car (default) @ addis_land ---
[INFO] Building CAR: D:\WSO2\Addis_Land\target\addis_land_1.0.0.car
```

## Verification Checklist

After rebuilding, verify:

- [ ] `target/classes/com/cbo/wso2/mediator/AddislandJWTGeneratorMediator.class` exists
- [ ] `target/addis_land-1.0.0-mediator.jar` contains the class file
- [ ] `deployment/libs/addis_land-1.0.0-mediator.jar` exists
- [ ] CAR file includes the JAR in `libs/` folder
- [ ] WSO2 MI can load the class (no ClassNotFoundException)

## Alternative: Manual JAR Placement

If the CAR file still doesn't work, manually place the JAR:

```powershell
# Copy JAR directly to WSO2 MI lib directory
Copy-Item target\addis_land-1.0.0-mediator.jar <WSO2_MI_HOME>\lib\
Copy-Item deployment\libs\nimbus-jose-jwt-9.31.jar <WSO2_MI_HOME>\lib\

# Restart WSO2 MI
cd <WSO2_MI_HOME>\bin
.\micro-integrator.bat restart
```

## Troubleshooting

### Issue: Still no classes in JAR
**Solution:**
1. Check if `target/classes` directory exists after compilation
2. Verify Java source file is in `src/main/java/com/cbo/wso2/mediator/`
3. Check for compilation errors in build output
4. Try: `mvn clean compile` first, then check `target/classes`

### Issue: Compiler not running
**Solution:**
- Check Maven output for compiler plugin execution
- Verify `maven-compiler-plugin` version is correct
- Try: `mvn clean compile` to force compilation

### Issue: JAR still empty
**Solution:**
- Verify `classesDirectory` points to `target/classes`
- Check `includes` pattern matches your package structure
- Try removing `includes` to include all classes

## Next Steps

1. Run `mvn clean install`
2. Verify JAR contains classes (use `jar tf` command)
3. Deploy CAR file
4. Test the API endpoint

The fix ensures Java sources are compiled and included in the JAR, which should resolve the ClassNotFoundException.



