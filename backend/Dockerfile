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
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError"

CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT:-8080}"]