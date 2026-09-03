#!/bin/sh
cd /server/apps/backend

echo "Running database migrations..."
pnpm medusa db:migrate


echo "Starting Medusa development server..."
pnpm dev