#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# Build frontend assets
npm install --prefix frontend
npm run build --prefix frontend

# Copy frontend build output into the backend's static resources
STATIC_DIR="backend/src/main/resources/static"
rm -rf "${STATIC_DIR}"
mkdir -p "${STATIC_DIR}"
cp -R frontend/dist/. "${STATIC_DIR}"/

# Package the Spring Boot application and run it
mvn -f backend/pom.xml clean package -DskipTests
exec java -jar backend/target/counter-backend-0.0.1-SNAPSHOT.jar
