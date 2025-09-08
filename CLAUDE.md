# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a full-stack point-of-sale (POS) system called "Electro Caja" with client/server architecture:

- **Client**: React 19 + Vite frontend with TailwindCSS, state management via Zustand
- **Server**: Express.js backend with Prisma ORM, PostgreSQL database, WhatsApp integration
- **Real-time**: Socket.IO for multi-session POS coordination and live updates
- **Authentication**: JWT-based with role-based access control (admin, supervisor, cajero, viewer)

### Key Components

**Frontend (`client/src/`):**
- `App.jsx`: Main application component with authentication and caja (cash register) state
- `components/`: UI components including Dashboard, Header, LoginModal, inventory management
- `store/`: Zustand stores for state management (auth, caja, inventory, notifications)
- `services/`: API communication layer
- `hooks/`: Custom React hooks including Socket.IO event handling

**Backend (`server/src/`):**
- `app.js`: Express application setup with middleware and routes
- `controllers/`: Business logic for auth, inventory, cash register operations, WhatsApp
- `routes/`: API endpoint definitions
- `config/`: Database and application configuration
- `middleware/`: Authentication and validation middleware

**Database:**
- PostgreSQL with Prisma ORM
- Complex schema with users, cash registers (cajas), transactions, inventory, audit trails
- Support for multi-currency (USD/BS), payment methods, stock movements

## Development Commands

### Client (Frontend)
```bash
cd client
npm run dev        # Start development server (Vite)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Server (Backend)
```bash
cd server
npm run dev        # Start with nodemon (development)
npm start          # Start production server
npm run db:generate # Generate Prisma client
npm run db:push    # Push schema changes to database
npm run db:studio  # Open Prisma Studio
npm run db:seed    # Seed database with initial data
```

## Configuration

**Environment Variables:**
- Client: Copy `client/.env.example` to `client/.env`
- Server: Copy `server/src/.env.example` to `server/.env`

**Key Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `PORT`: Server port (default 3001)
- Client uses `VITE_API_URL` to connect to backend

## Production & Development Environments

**Production Environment:**
- URL: https://192.168.1.5:5173
- Server: Ubuntu LTS 24.04
- Status: Full production deployment with SSL certificates
- Real-time multi-terminal POS coordination active

**Development Environment:**
- URL: https://192.168.1.11:5173
- Server port: 3001 (HTTPS)
- Client port: 5173 (HTTPS with Vite dev server)
- SSL certificates: localhost+2.pem / localhost+2-key.pem
- Real-time sync: Socket.IO integration for multi-terminal coordination

**SSL Configuration:**
- Both environments use HTTPS for security compliance
- Certificates configured in both client/vite.config.js and server/src/app.js
- Chrome compatibility resolved with proper certificate extensions
- Development certificates: localhost+2.pem and localhost+2-key.pem

**GitHub Integration:**
- Repository actively maintained with regular commits
- SSL configuration fixes and system optimizations committed
- Collaborative development workflow in progress

## Key Features

- **Multi-user POS system** with role-based permissions
- **Cash register management** (opening/closing with physical counts)
- **Inventory management** with barcode scanning support
- **Sales transactions** with multiple payment methods
- **WhatsApp integration** for customer communication
- **Real-time synchronization** between multiple POS terminals
- **Audit trails** for all critical operations
- **PDF generation** for receipts and reports
- **Stock movement tracking** with automatic reservations

## Database Operations

Always use Prisma commands for database operations:
- Schema changes require `npm run db:push` in server directory
- Generate client after schema changes with `npm run db:generate`
- Use `npm run db:studio` to visually inspect/edit database

## Testing

No specific test framework is configured. When implementing tests, examine the codebase to determine appropriate testing approach and update this file accordingly.