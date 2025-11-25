/**
 * Bank Authorization Token Creator
 *
 * This module generates JWT (JSON Web Token) authorization tokens for bank API authentication.
 * It uses asymmetric cryptography (ES256, RS256, or EdDSA) to sign tokens that can be used
 * to authenticate requests to the bank API.
 *
 * The token includes:
 * - Bank identification (BANK_ID)
 * - Key identifier (KID) for key rotation
 * - Issuer and subject claims
 * - Audience validation
 * - Expiration time (10 minutes default)
 *
 * @format
 * @module bank-auth-token
 * @requires fs - File system operations for reading private key
 * @requires axios - HTTP client for API requests
 * @requires crypto - Cryptographic operations for key conversion
 * @requires jose - JWT signing and key import utilities
 */

import fs from "fs";
import axios from "axios";
import crypto from "crypto";
import express from "express";
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from "jose";

/**
 * Environment Variables Configuration
 *
 * Required:
 * - BANK_ID: Unique identifier for the bank (UUID format)
 * - KID: Key identifier for the signing key (used for key rotation)
 * - PRIVATE_KEY_PATH: Path to the bank's private key file (PEM format)
 *
 * Optional:
 * - BASE_URL: Base URL for the bank API (default: https://addisland-api.aii.et/)
 * - ALG: Signing algorithm - must be one of: ES256, RS256, or EdDSA (default: ES256)
 * - BANK_API_AUDIENCE: Audience claim for the JWT (default: https://addisland-api.aii.et/)
 */
const {
  BASE_URL = "https://addisland-api.aii.et/",
  BANK_ID = "db01bea4-d823-4643-ae9d-e3a5b9ad85e4",
  KID = "cbe-1762998726956-hu7b87",
  ALG = "ES256",
  PRIVATE_KEY_PATH = "./bank-private-key.pem",
  BANK_API_AUDIENCE,
} = process.env;

// Validate required environment variables
if (!BANK_ID) {
  throw new Error("Missing required environment variable: BANK_ID");
}
if (!KID) {
  throw new Error("Missing required environment variable: KID");
}
if (!["ES256", "RS256", "EdDSA"].includes(ALG)) {
  throw new Error("ALG must be one of: ES256 | RS256 | EdDSA");
}

// Set audience claim - defaults to base URL if not specified
const AUD = BANK_API_AUDIENCE || "https://addisland-api.aii.et/";

/**
 * Signs a JWT token for bank API authentication
 *
 * This function:
 * 1. Reads the bank's private key from the file system
 * 2. Converts the key to PKCS#8 format (required by jose library)
 * 3. Creates a JWT with the following claims:
 *    - iss (issuer): "bank:{BANK_ID}"
 *    - sub (subject): "bank:{BANK_ID}"
 *    - aud (audience): API audience URL
 *    - iat (issued at): Current timestamp
 *    - exp (expiration): 10 minutes from issuance
 * 4. Signs the token using the specified algorithm
 *
 * @returns {Promise<string>} A signed JWT token string
 * @throws {Error} If the private key file cannot be read or is invalid
 * @throws {Error} If key import or signing fails
 *
 * @example
 * const token = await signPartnerJwt();
 * // Returns: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImNiZS0xNzYyOTk4NzI2OTU2LWh1N2I4NyJ9..."
 */
async function signPartnerJwt() {
  // Read the private key file from the filesystem
  const privatePem = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");

  // Convert the private key to PKCS#8 format (required by jose library)
  // This ensures compatibility regardless of the original key format
  const pkcs8Pem = crypto
    .createPrivateKey(privatePem)
    .export({ type: "pkcs8", format: "pem" })
    .toString();

  // Import the key in the format required by the jose library
  const key = await importPKCS8(pkcs8Pem, ALG);

  // Get current Unix timestamp (seconds since epoch)
  const now = Math.floor(Date.now() / 1000);

  // Create and sign the JWT token
  return await new SignJWT({})
    // Set JWT header: algorithm, key ID, and type
    .setProtectedHeader({ alg: ALG, kid: KID, typ: "JWT" })
    // Set issuer claim: identifies the bank issuing the token
    .setIssuer(`bank:${BANK_ID}`)
    // Set subject claim: identifies the bank the token is for
    .setSubject(`bank:${BANK_ID}`)
    // Set audience claim: identifies the intended recipient of the token
    .setAudience(AUD)
    // Set issued at time: when the token was created
    .setIssuedAt(now)
    // Set expiration time: 10 minutes (600 seconds) from now
    .setExpirationTime(now + 600)
    // Sign the token with the private key
    .sign(key);
}

/**
 * Main execution function
 *
 * Generates an authorization token and creates an axios HTTP client instance
 * configured with the token for making authenticated API requests.
 *
 * The token is logged to the console, and then a sample API call is made to
 * demonstrate token usage.
 *
 * @returns {Promise<void>}
 * @throws {Error} If token generation or HTTP client creation fails
 */
async function main() {
  // Generate the JWT authorization token
  const token = await signPartnerJwt();

  // Create an axios HTTP client instance with the token
  // This client can be used to make authenticated requests to the bank API
  const http = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    // Accept all HTTP status codes (don't throw on error status codes)
    validateStatus: () => true,
    // Set request timeout to 15 seconds
    timeout: 15000,
  });

  // Output the token to console
  // Banks can use this token in the Authorization header: "Bearer {token}"
  console.log("Generated Token:", token);
  console.log("\nMaking API call to /api/bank-sample/info...\n");

  // Make a sample API call to test the token
  try {
    const response = await http.get("/api/bank-sample/info");
    console.log("Response Status:", response.status);

    // Combine API response with the token used for the request
    const responseWithToken = {
      ...response.data,
      token: token,
    };

    console.log("Response Data:", JSON.stringify(responseWithToken, null, 2));
  } catch (error) {
    console.error("API Call Error:", error.message);
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", error.response.data);
    }
    throw error;
  }
}

/**
 * HTTP Server for Token Generation
 * 
 * Provides a REST endpoint for WSO2 MI to fetch JWT tokens
 * GET /token - Returns a fresh JWT token
 */
function startTokenService() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "bank-token-service" });
  });

  // Token generation endpoint
  app.get("/token", async (req, res) => {
    try {
      const token = await signPartnerJwt();
      res.json({ 
        token,
        expiresIn: 600,
        tokenType: "Bearer"
      });
    } catch (error) {
      console.error("Token generation error:", error);
      res.status(500).json({ 
        error: "token_generation_failed",
        message: error.message 
      });
    }
  });

  // Token validation endpoint
  app.use(express.json());
  app.post("/validate-token", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          valid: false,
          message: "Token is required"
        });
      }

      // Remove "Bearer " prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, "");

      // Read the private key to get the public key for verification
      const privatePem = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
      const privateKey = crypto.createPrivateKey(privatePem);
      
      // Extract the public key from the private key
      const publicKey = crypto.createPublicKey(privateKey);
      const publicPem = publicKey.export({ type: "spki", format: "pem" });

      // Import the public key for verification
      const { importSPKI } = await import("jose");
      const key = await importSPKI(publicPem, ALG);

      // Verify the JWT token
      const { payload } = await jwtVerify(cleanToken, key, {
        issuer: `bank:${BANK_ID}`,
        audience: AUD,
      });

      // Token is valid
      res.json({
        valid: true,
        message: "Token is valid",
        expiresAt: payload.exp,
        issuedAt: payload.iat
      });
    } catch (error) {
      console.error("Token validation error:", error.message);
      
      // Determine the error type
      let message = "Token validation failed";
      if (error.code === "ERR_JWT_EXPIRED") {
        message = "Token has expired";
      } else if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
        message = "Invalid token signature";
      } else if (error.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
        message = "Token claims validation failed";
      }

      res.json({
        valid: false,
        message,
        error: error.code || error.message
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 Bank Token Service running on http://localhost:${PORT}`);
    console.log(`   - Token endpoint: http://localhost:${PORT}/token`);
    console.log(`   - Validation endpoint: http://localhost:${PORT}/validate-token`);
    console.log(`   - Health check: http://localhost:${PORT}/health\n`);
  });
}

// Check if we should run in CLI mode (one-time token generation) or server mode (default)
const isCliMode = process.argv.includes("--cli") || process.env.RUN_CLI === "true";

if (isCliMode) {
  // Run in CLI mode (generate token once and test API call)
  console.log("Running in CLI mode (one-time token generation)...\n");
  main().catch((err) => {
    console.error("Error:", err?.response?.data || err.message || err);
    process.exit(1);
  });
} else {
  // Run as HTTP server (DEFAULT MODE)
  startTokenService();
}
