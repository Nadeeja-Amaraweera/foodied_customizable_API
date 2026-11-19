# 🥘 Foodied — Backend REST API

> **High-performance, secure Node.js, Express, and TypeScript RESTful API powering the Foodied food ordering platform with MongoDB, JWT Authentication, Supabase Storage, and Google Gemini AI.**

---

## 🌟 Overview

The **Foodied Backend API** serves as the central engine for the Foodied food ordering ecosystem. Designed with clean architectural separation across controllers, services, models, and middleware, the API provides:

- **Enterprise Security**: Role-Based Access Control (RBAC), cryptographically signed JWT access & refresh tokens, and Google OAuth 2.0 token validation.
- **Server-Side Price Validation**: Custom mathematical validation engines that prevent client-side cart tampering before order submission.
- **Cloud Media Pipeline**: Secure multipart/form-data upload pipeline streaming dish images to Supabase Storage.
- **Conversational AI Service**: High-speed AI endpoints communicating with the Google Gemini API to deliver culinary recommendations and dietary insights.
- **Flexible Execution**: Standard long-running Node.js server with automated listener initialization alongside Vercel Serverless Function compatibility.

---

## ✨ Core Features

### 🔐 Authentication & Role-Based Access Control (RBAC)
- **Token Dual-Phase Authentication**: Issues short-lived access tokens (`15m`) and long-lived refresh tokens (`7d`) with automatic rotation via `/api/v1/auth/refresh`.
- **Bcrypt Password Security**: Passwords hashed using Bcrypt with 10 salt rounds.
- **Google OAuth 2.0 Integration**: Validates Google ID tokens via `google-auth-library` and automatically registers or authenticates users.
- **Role Verification**: Middleware (`authenticate`, `isAdmin`) guards administrative capabilities while allowing guest/customer interactions.

### 🍔 Menu & Product Catalog
- **Full CRUD Support**: Manage food items, descriptions, base prices, categories, and availability.
- **Deep Customization Schemas**: Stores customizable option matrices (sizes, crust types, cheese selections, toppings, sauces, extras).
- **Supabase Cloud Uploads**: Integrated Multer and `@supabase/supabase-js` storage handler supporting JPEG, PNG, and WebP media.

### 🧾 Order Engine & Price Integrity
- **Server-Side Price Validation**: `/api/v1/orders/validate-price` dynamically verifies every base item, size multiplier, and topping additive against database records to prevent client-side payload tampering.
- **Order Lifecycle Management**: Tracks state transitions:
  $$\text{PENDING} \longrightarrow \text{PREPARING} \longrightarrow \text{READY} \longrightarrow \text{DELIVERED} \quad (\text{or } \text{CANCELLED})$$
- **Customer Order Tracking**: Dedicated `/api/v1/orders/my-orders` endpoint for logged-in diners.

### 🤖 Gemini AI Assistant Integration
- **Foodied AI Chef**: Uses the Google Gemini model to deliver contextual food suggestions, allergen guidance, and pairing recommendations.
- **Zero Frontend Key Exposure**: Server-side proxy guarantees that the Google Gemini API key remains strictly confidential.

---

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Runtime & Language** | [Node.js](https://nodejs.org/) (v18+) & [TypeScript](https://www.typescriptlang.org/) |
| **Web Framework** | [Express.js](https://expressjs.com/) (v5.x) |
| **Database & ODM** | [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) (v9.x) |
| **Authentication** | [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken), [bcryptjs](https://www.npmjs.com/package/bcryptjs), [google-auth-library](https://www.npmjs.com/package/google-auth-library) |
| **Cloud Storage** | [Supabase Storage](https://supabase.com/storage) (`@supabase/supabase-js`) |
| **AI Integration** | [Google Gemini API](https://ai.google.dev/) (via Axios) |
| **File Handling** | [Multer](https://www.npmjs.com/package/multer) |
| **Dev Tooling** | `tsx` watch mode, TypeScript compiler (`tsc`) |

---

## 📁 Directory Structure

```text
foodied_customizable/
├── src/
│   ├── config/
│   │   └── supabase.ts         # Supabase client credentials & bucket configuration
│   ├── controllers/
│   │   ├── auth.controller.ts  # Login, registration, token refresh, Google OAuth
│   │   ├── chat.controller.ts  # Gemini AI chat assistant handler
│   │   ├── order.controller.ts # Order creation, price validation, status updates
│   │   └── product.controller.ts # Menu catalog CRUD operations
│   ├── middlewares/
│   │   ├── auth.ts             # JWT authentication & isAdmin guard
│   │   └── upload.middleware.ts # Multer image parser & error handler
│   ├── models/
│   │   ├── admin.product.ts    # Product & CustomizationOption Mongoose schema
│   │   ├── order.model.ts      # Order items, customer info & status schema
│   │   └── user.model.ts       # User account & RBAC role schema
│   ├── routes/
│   │   ├── auth.routes.ts      # /api/v1/auth routes
│   │   ├── chat.routes.ts      # /api/v1/chat routes
│   │   ├── order.routes.ts     # /api/v1/orders routes
│   │   └── product.routes.ts   # /api/v1/products routes
│   ├── service/
│   │   ├── chat.service.ts     # Google Gemini API interaction logic
│   │   ├── price-validator.ts  # Server-side pricing recalculation engine
│   │   └── upload.service.ts   # Supabase cloud asset uploader
│   ├── util/
│   │   └── jwt.ts              # Sign & verify access and refresh tokens
│   ├── createAdmin.ts          # CLI script to seed an initial Super Admin
│   └── index.ts                # Express app entrypoint, routes, & DB connection
├── .env.example
├── package.json
├── tsconfig.json
└── vercel.json                 # Vercel serverless deployment rewrite rules
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB community server or MongoDB Atlas cluster URI
- **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/)
- **Supabase Account**: Project URL and Key for image uploads

### 2. Installation
Clone the repository and install dependencies:

```bash
cd foodied_customizable
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Populate the configuration values:

```env
PORT=3000

# MongoDB URI (supports MONGO_LOCAL_URL, MONGO_URL, or MONGODB_URI)
MONGO_LOCAL_URL=mongodb://localhost:27017/food_customize_db_mongo

# JWT Secrets
JWT_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

# Google OAuth 2.0 Web Client ID
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Supabase Storage Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_or_service_role_key

# Google Gemini API Key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 4. Seed Super Admin User (Optional)
To quickly create an initial administrative user for testing:

```bash
npx tsx src/createAdmin.ts
```
*Creates `nadeeja@gmail.com` with password `123456` and role `ADMIN`.*

### 5. Running the Application

```bash
# Run in development mode with live watch
npm run dev

# Build TypeScript to dist/
npm run build

# Start production server
npm start
```
The server will start listening at: **`http://localhost:3000`**

---

## 📡 Complete REST API Reference

Base URL: `http://localhost:3000/api/v1`

### 🩺 Health & Diagnostic Endpoints
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root server status check | Public |
| `GET` | `/api/v1` | API v1 status and active database name | Public |

---

### 🔑 Authentication Routes (`/api/v1/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new customer (`name`, `email`, `password`) | Public |
| `POST` | `/api/v1/auth/login` | Authenticate customer credentials | Public |
| `POST` | `/api/v1/auth/admin/login`| Authenticate administrator credentials | Public |
| `POST` | `/api/v1/auth/google` | Sign in or register via Google ID token | Public |
| `POST` | `/api/v1/auth/refresh` | Exchange valid refresh token for new access token | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Authenticated |
| `PUT` | `/api/v1/auth/profile` | Update user name and personal information | Authenticated |
| `GET` | `/api/v1/auth/users` | List all registered users | Admin Only |

---

### 🍕 Product Catalog Routes (`/api/v1/products`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Retrieve all available menu items | Public |
| `GET` | `/api/v1/products/:id` | Retrieve single item by ID with customization options | Public |
| `POST` | `/api/v1/products` | Create new dish with image upload (`multipart/form-data`) | Admin Only |
| `PUT` | `/api/v1/products/:id` | Update existing dish and upload replacement image | Admin Only |
| `PATCH`| `/api/v1/products/:id/availability` | Toggle item in-stock status | Admin Only |
| `DELETE`| `/api/v1/products/:id` | Remove a product from the catalog | Admin Only |

---

### 📦 Order Routes (`/api/v1/orders`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders/validate-price` | Recalculate and validate custom item pricing | Public |
| `POST` | `/api/v1/orders` | Submit new customer order with delivery info | Public / Customer |
| `GET` | `/api/v1/orders/my-orders` | Fetch logged-in customer's order history | Authenticated |
| `GET` | `/api/v1/orders` | List all orders with status filtering | Admin Only |
| `GET` | `/api/v1/orders/:id` | Fetch full order details | Admin Only |
| `PATCH`| `/api/v1/orders/:id/status` | Update status (`PREPARING`, `READY`, `DELIVERED`, etc.) | Admin Only |

---

### 🤖 AI Chatbot Assistant (`/api/v1/chat`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/chat` | Send customer prompt and receive AI culinary advice | Public |

#### Example Request:
```json
{
  "message": "Can you recommend a vegetarian pizza with a spicy kick?"
}
```

#### Example Response:
```json
{
  "status": "success",
  "data": {
    "reply": "I recommend our Artisan Wood-Fired Margherita customized with jalapeños, chili-infused olive oil, and fresh crushed red peppers on our slow-fermented thin crust!"
  }
}
```

---

## 🔒 Security & Data Integrity

- **Environment Secrets**: Credentials (database URLs, JWT secrets, Google keys) are strictly managed via environment variables and never logged or exposed.
- **Input Validation**: Sanitizes and validates incoming payloads with specific status codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).
- **CORS Configured**: Cross-Origin Resource Sharing enabled for seamless connection to the Foodied frontend Vite dev server and production clients.

---

## 📄 License
This project is developed as part of the IJSE RAD Module Examination. All rights reserved.

