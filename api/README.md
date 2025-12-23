# Masomodash API

A NestJS-based API for the Teachers Marketplace platform.

## Features

- 🏗️ **Clean Architecture**: Modular design with separation of concerns
- 🔐 **Authentication**: JWT-based auth with refresh tokens
- 📊 **Database**: PostgreSQL with TypeORM
- 🛡️ **Security**: Rate limiting, validation, and security headers
- 📝 **Validation**: Class-validator for request validation
- 🔄 **Auto-Transform**: Request/response transformation
- 📋 **Logging**: Request/response logging
- ⚡ **Performance**: Optimized queries and caching ready

## Quick Start

### Prerequisites

- Node.js 22+ 
- PostgreSQL 17+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   \`\`\`bash
   cd api
   npm install
   \`\`\`

2. **Environment setup:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Database setup:**
   \`\`\`bash
   # Create database
   createdb eduai_dev
   
   # Run migrations
   npm run migration:run
   
   # Seed data
   npm run seed
   \`\`\`

4. **Start development server:**
   \`\`\`bash
   npm run start:dev
   \`\`\`

The API will be available at `http://localhost:3000/api/v1`

## Environment Variables

Key environment variables (see `.env.example` for complete list):

\`\`\`bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=eduai_dev

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
\`\`\`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users/profile` - Get current user profile
- `PATCH /api/v1/users/profile` - Update profile
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin only)

## Architecture

\`\`\`
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── config/                # Configuration files
├── common/                # Shared utilities
│   ├── decorators/       # Custom decorators
│   ├── guards/           # Authentication guards
│   ├── interceptors/     # Request/response interceptors
│   ├── filters/          # Exception filters
│   ├── pipes/            # Validation pipes
│   ├── enums/            # Common enums
│   └── interfaces/       # Common interfaces
├── modules/              # Feature modules
│   ├── auth/            # Authentication
│   ├── users/           # User management
│   └── ...              # Other modules
└── database/            # Database related
    ├── migrations/      # Database migrations
    └── seeds/           # Database seeds
\`\`\`

## Database

The application uses PostgreSQL with TypeORM for database operations.

### Running Migrations

\`\`\`bash
# Generate new migration
npm run migration:generate  MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
\`\`\`

### Seeding Data

\`\`\`bash
npm run seed
\`\`\`

## Testing

\`\`\`bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
\`\`\`

## Development

### Code Structure

- Follow **Clean Architecture** principles
- Use **Repository pattern** for data access
- Implement **DTO pattern** for data validation
- Apply **SOLID principles**

### Adding New Modules

1. Create module directory in `src/modules/`
2. Add entities, DTOs, services, controllers
3. Register in main `app.module.ts`

### Best Practices

- Always validate input with DTOs
- Use TypeScript strictly
- Write comprehensive tests
- Follow naming conventions
- Document complex business logic

## Production Deployment

1. **Build the application:**
   \`\`\`bash
   npm run build
   \`\`\`

2. **Set production environment variables**

3. **Run migrations:**
   \`\`\`bash
   npm run migration:run
   \`\`\`

4. **Start the application:**
   \`\`\`bash
   npm run start:prod
   \`\`\`

## License

Private - All rights reserved