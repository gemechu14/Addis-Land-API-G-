# Token Service - Usage Modes

## 🌐 Server Mode (Default) - For WSO2 MI Integration

**Command:**
```bash
node index.js
# OR
npm start
```

**Behavior:**
- ✅ Starts HTTP server on port 3000
- ✅ Runs continuously (doesn't exit)
- ✅ Exposes `/token` and `/health` endpoints
- ✅ Generates tokens on-demand when WSO2 MI requests them

**Output:**
```
🚀 Bank Token Service running on http://localhost:3000
   - Token endpoint: http://localhost:3000/token
   - Health check: http://localhost:3000/health
```

**Use Case:**
- Production/Development environment where WSO2 MI needs continuous access to token generation

**How WSO2 MI Uses It:**
```
1. WSO2 MI receives API request
2. WSO2 MI → GET http://localhost:3000/token
3. Token Service → Returns fresh JWT
4. WSO2 MI → Calls Addisland API with JWT
5. Response returned to client
```

---

## 🔧 CLI Mode - For Testing & Verification

**Command:**
```bash
node index.js --cli
# OR
npm run cli
```

**Behavior:**
- Generates one JWT token
- Makes a test API call to `/api/bank-sample/info`
- Prints the token and response
- ❌ Exits immediately (doesn't stay running)

**Output:**
```
Running in CLI mode (one-time token generation)...

Generated Token: eyJhbGciOiJFUzI1NiIsImtpZCI6...

Making API call to /api/bank-sample/info...

Response Status: 200
Response Data: {
  "bank": { ... },
  "key": { ... },
  "requestInfo": { ... },
  "token": "..."
}
```

**Use Case:**
- Testing that token generation works
- Verifying bank credentials
- Debugging JWT issues
- Getting a token for manual API testing

---

## Comparison Table

| Feature | Server Mode (Default) | CLI Mode (`--cli`) |
|---------|----------------------|-------------------|
| **Command** | `node index.js` | `node index.js --cli` |
| **Stays Running** | ✅ Yes | ❌ No (exits after one run) |
| **HTTP Endpoints** | ✅ Yes (/token, /health) | ❌ No |
| **Token Generation** | ✅ On-demand (multiple) | ⚠️ One-time only |
| **API Test Call** | ❌ No | ✅ Yes |
| **WSO2 MI Compatible** | ✅ Yes | ❌ No |
| **Use Case** | Production/Integration | Testing/Debugging |

---

## Examples

### Example 1: Development Setup

**Terminal 1 - Start Token Service:**
```bash
cd nodejs
node index.js
# Stays running...
```

**Terminal 2 - Start WSO2 MI:**
```bash
cd <WSO2_MI_HOME>
./bin/micro-integrator.sh
# WSO2 MI can now call http://localhost:3000/token
```

**Terminal 3 - Test the Integration:**
```bash
curl http://localhost:8290/bank-restriction-api/restriction-application/paginated
```

---

### Example 2: Verify Credentials

```bash
cd nodejs
node index.js --cli
```

**If successful:**
- ✅ Token is generated
- ✅ API call returns 200
- ✅ Bank information is displayed

**If fails:**
- ❌ Check BANK_ID, KID values
- ❌ Verify private key file exists
- ❌ Check private key matches registered public key

---

## Quick Reference

### I want to integrate with WSO2 MI
```bash
node index.js  # Default server mode
```

### I want to test if my credentials work
```bash
node index.js --cli  # CLI mode
```

### I want to get a token for manual testing
```bash
# Get token in CLI mode
node index.js --cli

# OR get token from server mode
curl http://localhost:3000/token
```

### I want the service to run in the background
```bash
# Windows
start /B node index.js

# Linux/Mac
node index.js &

# Or use PM2
npm install -g pm2
pm2 start index.js --name token-service
```

---

## Migration Note

**Previous Behavior (Before Fix):**
- Default was CLI mode (exit after one run)
- Had to use `--server` flag to keep running
- ❌ Confusing for integration use case

**Current Behavior (After Fix):**
- Default is Server mode (stays running)
- Use `--cli` flag for one-time testing
- ✅ Better for WSO2 MI integration

**If you have scripts using the old behavior:**
```bash
# Old way (still works but unnecessary now)
node index.js --server  # This will fail, flag removed

# New way (default behavior)
node index.js  # Just run without flags
```

To get the old "run once and exit" behavior:
```bash
node index.js --cli  # Use --cli flag instead
```









