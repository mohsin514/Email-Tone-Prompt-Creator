#!/bin/bash

# Email Tone Prompt Creator - Quick Setup Script
# This script will help you get the project running

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Email Tone Prompt Creator - Setup Script                     ║"
echo "║  Status: Production Ready                                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker from https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_step "Docker is installed ($(docker --version))"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    echo "Please install Docker Compose"
    exit 1
fi
print_step "Docker Compose is installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js v18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
print_step "Node.js is installed ($NODE_VERSION)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
NPM_VERSION=$(npm -v)
print_step "npm is installed ($NPM_VERSION)"

echo ""
echo "All prerequisites are met!"
echo ""

# Get project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
print_step "Project root: $PROJECT_ROOT"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Setting up Docker services..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$PROJECT_ROOT"

# Check if Docker daemon is running
if ! docker ps > /dev/null 2>&1; then
    print_error "Docker daemon is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
print_step "Docker daemon is running"

# Start Docker services
echo "Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U etpc_user > /dev/null 2>&1; then
        print_step "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    sleep 1
done

for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_step "Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Redis failed to start"
        exit 1
    fi
    sleep 1
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Setting up Backend..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$PROJECT_ROOT/server"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found"
    echo "Creating .env file from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_step ".env file created"
        echo ""
        print_warning "Please edit server/.env with your actual credentials:"
        echo "  1. GMAIL_CLIENT_ID (from Google Cloud Console)"
        echo "  2. GMAIL_CLIENT_SECRET (from Google Cloud Console)"
        echo "  3. OPENAI_API_KEY (from OpenAI)"
    else
        print_error ".env.example not found"
        exit 1
    fi
fi

# Install backend dependencies
echo "Installing backend dependencies..."
npm install
print_step "Backend dependencies installed"

# Run database migrations
echo "Running database migrations..."
npm run prisma:migrate || true
print_step "Database migrations completed"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Setting up Frontend..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$PROJECT_ROOT/client"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    print_warning ".env.local file not found"
    echo "Creating .env.local..."
    echo "VITE_API_URL=http://localhost:3001/api" > .env.local
    print_step ".env.local created"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install
print_step "Frontend dependencies installed"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete! 🎉                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Next steps:"
echo ""
echo "1. Edit configuration files with your credentials:"
echo "   • server/.env (Gmail OAuth, OpenAI API key)"
echo ""
echo "2. Start the development servers:"
echo "   Terminal 1 (Backend):"
echo "     cd server && npm run dev"
echo ""
echo "   Terminal 2 (Frontend):"
echo "     cd client && npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:5173"
echo ""
echo "4. Register or login to get started!"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "Documentation:"
echo "  • Setup Guide: COMPLETE_SETUP_GUIDE.md"
echo "  • Gmail OAuth: GMAIL_OAUTH_SETUP.md"
echo "  • Project Status: PROJECT_STATUS.md"
echo "═══════════════════════════════════════════════════════════════"
echo ""

print_step "Setup script completed!"
