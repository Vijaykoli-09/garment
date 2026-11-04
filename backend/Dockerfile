# # Use official OpenJDK image
# FROM eclipse-temurin:17-jdk-alpine

# # Set working directory
# WORKDIR /app

# # Copy Maven wrapper and pom.xml
# COPY mvnw .
# COPY .mvn .mvn
# COPY pom.xml .

# # Give permission to mvnw
# RUN chmod +x mvnw

# # Download dependencies
# RUN ./mvnw dependency:go-offline

# # Copy source code
# COPY src src

# # Build application
# RUN ./mvnw clean package -DskipTests

# # Expose port (Render provides PORT)
# EXPOSE 8080

# # Run application
# CMD ["sh", "-c", "java -jar target/*.jar --server.port=${PORT}"]





# # ---------- Build stage ----------
# FROM eclipse-temurin:17-jdk-alpine AS build
# WORKDIR /app

# # Copy Maven wrapper and pom.xml (cached unless pom changes)
# COPY mvnw .
# COPY .mvn .mvn
# COPY pom.xml .
# RUN chmod +x mvnw && ./mvnw -q dependency:go-offline

# # Copy source and build
# COPY src src
# RUN ./mvnw -q clean package -DskipTests

# # ---------- Run stage (small JRE image, no Maven/source) ----------
# FROM eclipse-temurin:17-jre-alpine
# WORKDIR /app

# COPY --from=build /app/target/*.jar app.jar

# EXPOSE 8080

# # Heap = 60% of container RAM (safe for 512 MB). Exit on OOM so Render restarts at once.
# # Can be overridden from Render > Environment by setting JAVA_OPTS (no code change).
# ENV JAVA_OPTS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError"

# CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT:-8080}"]



# # Use official OpenJDK image
# FROM eclipse-temurin:17-jdk-alpine

# # Set working directory
# WORKDIR /app

# # Copy Maven wrapper and pom.xml
# COPY mvnw .
# COPY .mvn .mvn
# COPY pom.xml .

# # Give permission to mvnw
# RUN chmod +x mvnw

# # Download dependencies
# RUN ./mvnw dependency:go-offline

# # Copy source code
# COPY src src

# # Build application
# RUN ./mvnw clean package -DskipTests

# # Expose port (Render provides PORT)
# EXPOSE 8080

# # Run application
# CMD ["sh", "-c", "java -jar target/*.jar --server.port=${PORT}"]





# ---------- Build stage ----------
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and pom.xml (cached unless pom changes)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline

# Copy source and build
COPY src src
RUN ./mvnw -q clean package -DskipTests

# ---------- Run stage (small JRE image, no Maven/source) ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Heap = 60% of container RAM (safe for 512 MB). Exit on OOM so Render restarts at once.
# Can be overridden from Render > Environment by setting JAVA_OPTS (no code change).
# Memory budget for a 512 MiB Render container (free plan, ~0.15 vCPU):
#   heap ~205 MiB (40%) + metaspace <=160 MiB + code cache <=64 MiB + direct buffers <=64 MiB
#   + thread stacks at 512 KiB. The old 60% heap (~307 MiB) left no room for non-heap memory,
#   so the container hit the 512 MiB limit and was OOM-killed.
# Override without a rebuild: Render > Environment > JAVA_OPTS.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=40 -XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=64m -XX:MaxDirectMemorySize=64m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError"

CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT:-8080}"]