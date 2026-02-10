# Multi-stage build to bundle the React frontend with the Spring Boot backend
FROM node:18 AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM maven:3.9.6-eclipse-temurin-17 AS backend-build
WORKDIR /app

COPY backend/pom.xml ./backend/pom.xml
RUN mvn -f backend/pom.xml dependency:go-offline

COPY backend/src ./backend/src
COPY --from=frontend-build /app/frontend/dist ./backend/src/main/resources/static
RUN mvn -f backend/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=backend-build /app/backend/target/counter-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
