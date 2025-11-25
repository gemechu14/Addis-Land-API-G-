# Bank Authorization Token Service

JWT token generator for Addisland Land Bank API authentication.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Start Server (Default Mode)
```bash
npm start
# OR
node index.js
```

The HTTP server will start on **http://localhost:3000** and run continuously.

**Endpoints:**
- `GET /token` - Generate a fresh JWT token
- `GET /health` - Health check endpoint

### Test Mode (One-time Token Generation)
```bash
npm run cli
# OR
node index.js --cli
```

This generates a token, makes a test API call to verify it works, then exits.

## Configuration

### Environment Variables

Create a `.env` file or set these variables:

```bash
BANK_ID=db01bea4-d823-4643-ae9d-e3a5b9ad85e4
KID=cbe-1762998726956-hu7b87
ALG=ES256
PRIVATE_KEY_PATH=./bank-private-key.pem
BASE_URL=https://addisland-api.aii.et/
BANK_API_AUDIENCE=https://addisland-api.aii.et/
PORT=3000
```

### Required Files

- `bank-private-key.pem` - Bank's private key file (must be in this directory)

## Usage Examples

### Server Mode (For WSO2 MI Integration)

```bash
# Start the server
node index.js

# Output:
# 🚀 Bank Token Service running on http://localhost:3000
#    - Token endpoint: http://localhost:3000/token
#    - Health check: http://localhost:3000/health

# In another terminal, fetch a token:
curl http://localhost:3000/token

# Response:
# {
#   "token": "eyJhbGciOiJFUzI1NiIsImtpZCI6...",
#   "expiresIn": 600,
#   "tokenType": "Bearer"
# }
```

### CLI Mode (For Testing)

```bash
# Generate token and test it
node index.js --cli

# Output:
# Running in CLI mode (one-time token generation)...
# 
# Generated Token: eyJhbGciOiJFUzI1NiIsImtpZCI6...
# 
# Making API call to /api/bank-sample/info...
# 
# Response Status: 200
# Response Data: { ... }
```

## API Examples

### Health Check
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "bank-token-service"
}
```

### Get Token
```bash
curl http://localhost:3000/token
```

**Response:**
```json
{
  "token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImNiZS0xNzYyOTk4NzI2OTU2LWh1N2I4NyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiYW5rOmRiMDFiZWE0LWQ4MjMtNDY0My1hZTlkLWUzYTViOWFkODVlNCIsInN1YiI6ImJhbms6ZGIwMWJlYTQtZDgyMy00NjQzLWFlOWQtZTNhNWI5YWQ4NWU0IiwiYXVkIjoiaHR0cHM6Ly9hZGRpc2xhbmQtYXBpLmFpaS5ldC8iLCJpYXQiOjE3NjM2NzI2MjQsImV4cCI6MTc2MzY3MzIyNH0.qQm8qk2NOOqtMWIY03ktqPD4FVSmBUN_lQeQVa2CzZNE17P3vSo8IlUfIgE0wV6SciVe9drW-p4FTNllLIcWog",
  "expiresIn": 600,
  "tokenType": "Bearer"
}
```

### Use Token with API
```bash
TOKEN=$(curl -s http://localhost:3000/token | jq -r .token)
curl -H "Authorization: Bearer $TOKEN" https://addisland-api.aii.et/bank-restriction-application-bank-api/paginated
```

## JWT Token Details

**Header:**
```json
{
  "alg": "ES256",
  "kid": "cbe-1762998726956-hu7b87",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "iss": "bank:db01bea4-d823-4643-ae9d-e3a5b9ad85e4",
  "sub": "bank:db01bea4-d823-4643-ae9d-e3a5b9ad85e4",
  "aud": "https://addisland-api.aii.et/",
  "iat": 1763672624,
  "exp": 1763673224
}
```

- **Algorithm:** ES256 (ECDSA with SHA-256)
- **Expiry:** 10 minutes (600 seconds)
- **Key Rotation:** Supported via `kid` header

## Startup Scripts

### Windows
```bash
start-token-service.bat
```

### Linux/Mac
```bash
chmod +x start-token-service.sh
./start-token-service.sh
```

These scripts check for dependencies, verify the private key exists, and start the server.

## Troubleshooting

### Error: "Cannot find module 'express'"
```bash
npm install
```

### Error: "bank-private-key.pem not found"
Ensure the private key file is in the `nodejs` directory.

### Error: "EADDRINUSE: address already in use :::3000"
Port 3000 is already in use. Either:
1. Stop the other service using port 3000
2. Change the port: `PORT=3001 node index.js`

### Error: "invalid_jwt" from API
- Check that BANK_ID, KID match your registered credentials
- Verify the private key is correct
- Check that token hasn't expired (10 min validity)

## Security Notes

⚠️ **Important:**
- Never commit `bank-private-key.pem` to version control
- Keep the private key file secure (file permissions 600 on Unix)
- Don't expose this service to the public internet
- Use HTTPS in production
- Rotate keys regularly using the KID mechanism

## Integration with WSO2 MI

This token service is designed to work with WSO2 Micro Integrator:

1. Start this service: `node index.js`
2. WSO2 MI calls `http://localhost:3000/token` to get JWT
3. WSO2 MI uses the JWT to authenticate with Addisland API
4. Tokens are generated fresh on each request

See the main project README for complete integration documentation.

## Dependencies

- **express** ^4.18.2 - HTTP server framework
- **axios** ^1.13.1 - HTTP client for API calls
- **jose** ^6.1.0 - JWT signing and verification
- **crypto** (built-in) - Cryptographic operations

## License

Part of the Addisland Land Bank API integration project.
