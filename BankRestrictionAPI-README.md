# Bank Restriction API - Automatic Token Generation

## Overview

This is a **simplified version** of the Bank Restriction Application API that **automatically generates JWT tokens internally**. Unlike the original API (`/bank-restriction-application-bank-api`), this API does **NOT require** clients to pass `Authorization` headers.

## Key Differences

| Feature | Original API | New API (BankRestrictionAPI) |
|---------|-------------|------------------------------|
| Context Path | `/bank-restriction-application-bank-api` | `/bank-restriction-api` |
| Authorization | Requires `Authorization: Bearer <token>` header | No authorization header needed |
| Token Generation | Manual via `/token` endpoint | Automatic (internal Java mediator) |
| Token Service | Depends on Node.js service | Self-contained (Java mediator) |
| Use Case | When client manages tokens | When client shouldn't handle tokens |

## API Endpoints

### Base URL
```
http://localhost:8290/bank-restriction-api
```

### 1. Create Restriction Application
**Endpoint:** `POST /restriction-application`

**Request:**
```bash
curl -X POST http://localhost:8290/bank-restriction-api/restriction-application \
  -H "Content-Type: application/json" \
  -d '{
    "applicantName": "John Doe",
    "restrictionType": "CREDIT_FREEZE",
    "reason": "Suspected fraud"
  }'
```

**Response:**
```json
{
  "id": "12345",
  "status": "PENDING",
  "applicantName": "John Doe",
  "restrictionType": "CREDIT_FREEZE",
  "createdAt": "2025-11-24T10:30:00Z"
}
```

### 2. Get Paginated Applications
**Endpoint:** `GET /restriction-application/paginated`

**Request:**
```bash
curl -X GET "http://localhost:8290/bank-restriction-api/restriction-application/paginated?page=1&size=10"
```

**Response:**
```json
{
  "data": [
    {
      "id": "12345",
      "applicantName": "John Doe",
      "status": "PENDING"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 10,
    "totalPages": 5,
    "totalElements": 50
  }
}
```

### 3. Get Application by ID
**Endpoint:** `GET /restriction-application/{id}`

**Request:**
```bash
curl -X GET http://localhost:8290/bank-restriction-api/restriction-application/12345
```

**Response:**
```json
{
  "id": "12345",
  "applicantName": "John Doe",
  "restrictionType": "CREDIT_FREEZE",
  "status": "PENDING",
  "reason": "Suspected fraud",
  "createdAt": "2025-11-24T10:30:00Z"
}
```

### 4. Approve Application
**Endpoint:** `POST /restriction-application/{id}/approve`

**Request:**
```bash
curl -X POST http://localhost:8290/bank-restriction-api/restriction-application/12345/approve \
  -F "approverComments=Verified and approved" \
  -F "document=@approval-document.pdf"
```

**Response:**
```json
{
  "id": "12345",
  "status": "APPROVED",
  "approvedAt": "2025-11-24T11:00:00Z",
  "approverComments": "Verified and approved"
}
```

## How It Works

### Token Generation Flow

```
Client Request (No Auth Header)
        ↓
BankRestrictionAPI receives request
        ↓
GenerateInternalTokenSequence called
        ↓
AddislandJWTGeneratorMediator (Java Class)
  - Reads private key from file
  - Generates JWT token with ES256
  - Sets JWT_TOKEN property
        ↓
Token stored in message context
        ↓
CallBankAPISequence uses token
  - Adds "Authorization: Bearer <token>" header
  - Calls backend Addisland Bank API
        ↓
Response returned to client
```

### Internal Components

1. **BankRestrictionAPI.xml** - API definition with 4 resources
2. **GenerateInternalTokenSequence.xml** - Sequence that calls Java mediator
3. **AddislandJWTGeneratorMediator.java** - Java class that generates JWT tokens
4. **CallBankAPISequence.xml** - Adds token to Authorization header (reused)

## Configuration

### JWT Token Settings (Hardcoded)

The following settings are hardcoded in the Java mediator:

```java
BANK_ID = "db01bea4-d823-4643-ae9d-e3a5b9ad85e4"
KID = "cbe-1762998726956-hu7b87"
ALG = "ES256" (Elliptic Curve)
AUDIENCE = "https://addisland-api.aii.et/"
TOKEN_EXPIRY = 600 seconds (10 minutes)
```

### Private Key Setup

**Required:** Place your private key at one of these locations:

1. **Production:** `<WSO2_MI_HOME>/repository/deployment/server/synapse-configs/default/resources/bank-private-key.pem`
2. **Development:** `src/main/wso2mi/resources/bank-private-key.pem`
3. **Alternative:** `bank-private-key.pem` (in current directory)

See `src/main/wso2mi/resources/README-PRIVATE-KEY.md` for detailed instructions.

## Deployment

### 1. Ensure Dependencies are Installed

The `pom.xml` includes:
- `com.nimbusds:nimbus-jose-jwt:9.31` (JWT signing)
- WSO2 Synapse and Axis2 dependencies (provided)

### 2. Build the Project

```bash
mvn clean install
```

This will:
- Compile the Java mediator class
- Package into JAR file
- Build the Carbon Application (CAR file)
- Copy dependencies to `deployment/libs/`

### 3. Deploy to WSO2 MI

**Option A: Copy CAR file**
```bash
cp target/addis_land_1.0.0.car <WSO2_MI_HOME>/repository/deployment/server/carbonapps/
```

**Option B: Use Docker**
```bash
mvn clean install -P docker
```

### 4. Place Private Key

Copy your private key to the appropriate location (see Configuration section above).

### 5. Restart WSO2 MI

```bash
cd <WSO2_MI_HOME>/bin
./micro-integrator.sh  # Linux/Mac
micro-integrator.bat   # Windows
```

### 6. Verify Deployment

Check logs for successful deployment:
```
[2025-11-24 10:00:00] INFO - Deploying API: BankRestrictionAPI
[2025-11-24 10:00:01] INFO - API deployed successfully: /bank-restriction-api
```

## Testing

### Test Without Authorization Header

```bash
# This should work (no auth header required)
curl -X POST http://localhost:8290/bank-restriction-api/restriction-application \
  -H "Content-Type: application/json" \
  -d '{"applicantName": "Test User", "restrictionType": "ACCOUNT_FREEZE"}'
```

### Compare with Original API

```bash
# Original API requires auth header (will fail without it)
curl -X POST http://localhost:8290/bank-restriction-application-bank-api/restriction-application \
  -H "Content-Type: application/json" \
  -d '{"applicantName": "Test User"}'
# Response: {"error": "unauthorized", "message": "Authorization header is required"}

# New API does NOT require auth header (will succeed)
curl -X POST http://localhost:8290/bank-restriction-api/restriction-application \
  -H "Content-Type: application/json" \
  -d '{"applicantName": "Test User"}'
# Response: {"id": "12345", "status": "PENDING", ...}
```

## Monitoring & Debugging

### Enable Detailed Logging

Edit `<WSO2_MI_HOME>/conf/log4j2.properties`:

```properties
# Enable debug logging for custom mediator
logger.addisland-jwt.name = com.cbo.wso2.mediator.AddislandJWTGeneratorMediator
logger.addisland-jwt.level = DEBUG
```

### Check Logs

Look for these messages in `<WSO2_MI_HOME>/repository/logs/wso2carbon.log`:

```
[2025-11-24 10:30:00] INFO - AddislandJWTGeneratorMediator: Starting JWT token generation
[2025-11-24 10:30:00] INFO - AddislandJWTGeneratorMediator: Reading private key from: ...
[2025-11-24 10:30:00] INFO - AddislandJWTGeneratorMediator: JWT token generated successfully
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Private key file not found" | Verify key file location and permissions |
| "Invalid key format" | Ensure key is in PEM format (PKCS#8) |
| "Token generation failed" | Check algorithm matches key type (EC for ES256) |
| "Class not found" | Rebuild project and copy JAR to `deployment/libs/` |

## Security Considerations

⚠️ **Important Security Notes:**

1. **Private Key Protection**
   - Never commit private keys to version control
   - Set proper file permissions (600 or 400)
   - Use secure key management in production

2. **Token Expiry**
   - Tokens expire after 10 minutes
   - New tokens are generated for each request
   - No token caching or reuse

3. **Use Cases**
   - Use this API when integrating with trusted internal systems
   - Use the original API when clients should manage their own tokens
   - Consider implementing additional authentication for production

4. **Audit Logging**
   - Enable request/response logging for audit trails
   - Monitor token generation frequency
   - Alert on token generation failures

## Related Documentation

- **Node.js Token Service:** `nodejs/README.md` (reference implementation)
- **Private Key Setup:** `src/main/wso2mi/resources/README-PRIVATE-KEY.md`
- **Original API:** `src/main/wso2mi/artifacts/apis/BankRestrictionApplicationBankAPI.xml`
- **Java Mediator Source:** `src/main/java/com/cbo/wso2/mediator/AddislandJWTGeneratorMediator.java`

## Support

For issues or questions:
1. Check WSO2 MI logs for detailed error messages
2. Review the Java mediator source code
3. Compare with Node.js implementation in `nodejs/index.js`
4. Verify private key format and location


