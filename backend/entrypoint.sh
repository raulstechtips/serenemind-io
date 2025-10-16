#!/bin/sh

if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for PostgreSQL..."
    until pg_isready --host=$SQL_HOST --username=$SQL_USER
    do
        echo "Waiting for PostgreSQL..."
        sleep 1
    done
    echo "PostgreSQL started"
fi

# Production setup
if [ "$APP_ENV" = "prod" ] || [ "$APP_ENV" = "stage" ]
then
    echo "Running in production mode..."
    
    # Create cache directory
    mkdir -p /tmp/django_cache
    
    # Apply database migrations
    echo "Applying database migrations..."
    python manage.py migrate
    
    # Collect static files
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Start production server
    echo "Starting production server..."
    exec gunicorn config.asgi:application \
        --workers 4 \
        --worker-class uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:8000 \
        --timeout 120 \
        --keep-alive 2 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --log-level info \
        --access-logfile - \
        --error-logfile - \
        -c gunicorn_conf.py
    
else
    # Development mode
    echo "Running in development mode..."
    exec "$@"
fi