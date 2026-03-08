# Use the official pgvector image
FROM pgvector/pgvector:pg16

# Copy the initialization script into the specialized Docker directory
# Any .sql script here runs automatically on first startup
COPY init.sql /docker-entrypoint-initdb.d/

# Set default environment variables (can be overridden at runtime)
ENV POSTGRES_DB=dealership
ENV POSTGRES_PASSWORD=dealership