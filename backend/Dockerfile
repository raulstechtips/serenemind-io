# pull official base image
FROM python:3.13.3

# set work directory
WORKDIR /usr/src/app

# copy project 
COPY . /usr/src/app/

# set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# install dependencies (including PostgreSQL 15 client and AWS CLI)
RUN apt-get -y update &&  \
    apt-get install -y wget gnupg lsb-release ca-certificates && \
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg && \
    apt-get -y update && \
    TZ=UTC DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends bash git libpq-dev \
        postgresql-client-15 \
        gcc \
        python3-dev \
        musl-tools \
        awscli tzdata jq locales && \
    rm -rf /var/lib/apt/lists/*

# set UTF-8 locale to avoid perl locale warnings from pg_dump
# ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

# install dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r /usr/src/app/requirements.txt
RUN git config --global --add safe.directory /workspace

EXPOSE 8000

# RUN sed -i 's/\r$//g' /workspace/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

# Add DB backup utility
# COPY scripts/db_backup.sh /usr/local/bin/db_backup.sh
# RUN chmod +x /usr/local/bin/db_backup.sh

# run entrypoint.sh
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]