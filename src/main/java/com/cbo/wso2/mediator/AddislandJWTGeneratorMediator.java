package com.cbo.wso2.mediator;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.apache.synapse.MessageContext;
import org.apache.synapse.mediators.AbstractMediator;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.stream.Collectors;

/**
 * Addisland JWT Generator Mediator
 *
 * Generates JWT tokens for Addisland Bank API authentication.
 * Loads private key from classpath (bundled in JAR).
 * 
 * Supports both EC PRIVATE KEY (SEC1) and PRIVATE KEY (PKCS#8) formats.
 */
public class AddislandJWTGeneratorMediator extends AbstractMediator {

    private static final String BANK_ID = "db01bea4-d823-4643-ae9d-e3a5b9ad85e4";
    private static final String KID = "cbe-1762998726956-hu7b87";
    private static final String ALG = "ES256"; // ES256 or RS256
    private static final String AUDIENCE = "https://addisland-api.aii.et/";
    private static final int TOKEN_EXPIRY_SECONDS = 600; // 10 minutes

    // Private key loaded from classpath (bundled in JAR next to this class)
    private static final String CLASSPATH_KEY = "/com/cbo/wso2/mediator/bank-private-key.pem";

    @Override
    public boolean mediate(MessageContext messageContext) {
        try {
            log.info("AddislandJWTGeneratorMediator: Starting JWT token generation");
            String jwtToken = generateJWT();
            messageContext.setProperty("JWT_TOKEN", jwtToken);
            log.info("AddislandJWTGeneratorMediator: JWT token generated successfully");
            return true;
        } catch (Exception e) {
            log.error("AddislandJWTGeneratorMediator: Error generating JWT token", e);
            messageContext.setProperty("JWT_TOKEN", "");
            messageContext.setProperty("JWT_ERROR", e.getMessage());
            return true;
        }
    }

    private String generateJWT() throws Exception {
        String privateKeyPEM = readPrivateKey();

        Date now = new Date();
        Date expiryTime = new Date(now.getTime() + (TOKEN_EXPIRY_SECONDS * 1000));

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .issuer("bank:" + BANK_ID)
                .subject("bank:" + BANK_ID)
                .audience(AUDIENCE)
                .issueTime(now)
                .expirationTime(expiryTime)
                .build();

        return signJWT(claimsSet, privateKeyPEM).serialize();
    }

    private SignedJWT signJWT(JWTClaimsSet claimsSet, String privateKeyPEM) throws Exception {
        JWSHeader header;
        SignedJWT signedJWT;

        switch (ALG) {
            case "ES256":
                header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                        .keyID(KID)
                        .type(com.nimbusds.jose.JOSEObjectType.JWT)
                        .build();
                signedJWT = new SignedJWT(header, claimsSet);
                ECPrivateKey ecPrivateKey = loadECPrivateKey(privateKeyPEM);
                signedJWT.sign(new ECDSASigner(ecPrivateKey));
                break;
            case "RS256":
                header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                        .keyID(KID)
                        .type(com.nimbusds.jose.JOSEObjectType.JWT)
                        .build();
                signedJWT = new SignedJWT(header, claimsSet);
                RSAPrivateKey rsaPrivateKey = loadRSAPrivateKey(privateKeyPEM);
                signedJWT.sign(new RSASSASigner(rsaPrivateKey));
                break;
            default:
                throw new IllegalArgumentException("Unsupported algorithm: " + ALG);
        }

        return signedJWT    ;
    }

    private String readPrivateKey() throws IOException {
        // Load from classpath (bundled in JAR)
        try (InputStream in = getClass().getResourceAsStream(CLASSPATH_KEY)) {
            if (in != null) {
                log.info("AddislandJWTGeneratorMediator: Loading private key from classpath: " + CLASSPATH_KEY);
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                    return reader.lines().collect(Collectors.joining("\n"));
                }
            }
        }
        throw new IOException("Private key not found in classpath: " + CLASSPATH_KEY + 
            ". Make sure bank-private-key.pem is in src/main/java/com/cbo/wso2/mediator/");
    }

    /**
     * Load EC private key from PEM format.
     * Supports both PKCS#8 (-----BEGIN PRIVATE KEY-----) and SEC1 (-----BEGIN EC PRIVATE KEY-----).
     */
    private ECPrivateKey loadECPrivateKey(String privateKeyPEM) throws Exception {
        PrivateKey key = loadPrivateKey(privateKeyPEM, "EC");
        if (key instanceof ECPrivateKey) {
            return (ECPrivateKey) key;
        }
        throw new IllegalArgumentException("Provided key is not an EC private key");
    }

    /**
     * Load RSA private key from PEM format (PKCS#8 or PKCS#1).
     */
    private RSAPrivateKey loadRSAPrivateKey(String privateKeyPEM) throws Exception {
        PrivateKey key = loadPrivateKey(privateKeyPEM, "RSA");
        if (key instanceof RSAPrivateKey) {
            return (RSAPrivateKey) key;
        }
        throw new IllegalArgumentException("Provided key is not an RSA private key");
    }

    private PrivateKey loadPrivateKey(String pem, String algorithm) throws Exception {
        String sanitized = pem
                .replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(sanitized);

        KeyFactory factory = KeyFactory.getInstance(algorithm);
        try {
            return factory.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
        } catch (InvalidKeySpecException ex) {
            if ("EC".equals(algorithm) && pem.contains("EC PRIVATE KEY")) {
                byte[] pkcs8 = convertEcSec1ToPkcs8(keyBytes);
                return factory.generatePrivate(new PKCS8EncodedKeySpec(pkcs8));
            }
            if ("RSA".equals(algorithm) && pem.contains("RSA PRIVATE KEY")) {
                byte[] pkcs8 = convertRsaPkcs1ToPkcs8(keyBytes);
                return factory.generatePrivate(new PKCS8EncodedKeySpec(pkcs8));
            }
            throw ex;
        }
    }

    private byte[] convertEcSec1ToPkcs8(byte[] sec1Key) throws IOException {
        byte[] ecAlgorithmIdentifier = new byte[] {
                0x30, 0x13,
                0x06, 0x07, 0x2A, (byte) 0x86, 0x48, (byte) 0xCE, 0x3D, 0x02, 0x01,
                0x06, 0x08, 0x2A, (byte) 0x86, 0x48, (byte) 0xCE, 0x3D, 0x03, 0x01, 0x07
        };
        byte[] privateKeyOctetString = buildOctetString(sec1Key);
        return buildSequence(
                new byte[] {0x02, 0x01, 0x00},
                ecAlgorithmIdentifier,
                privateKeyOctetString
        );
    }

    private byte[] convertRsaPkcs1ToPkcs8(byte[] pkcs1Key) throws IOException {
        byte[] rsaAlgorithmIdentifier = new byte[] {
                0x30, 0x0D,
                0x06, 0x09, 0x2A, (byte) 0x86, 0x48, (byte) 0x86, (byte) 0xF7, 0x0D, 0x01, 0x01, 0x01,
                0x05, 0x00
        };
        byte[] privateKeyOctetString = buildOctetString(pkcs1Key);
        return buildSequence(
                new byte[] {0x02, 0x01, 0x00},
                rsaAlgorithmIdentifier,
                privateKeyOctetString
        );
    }

    private byte[] buildOctetString(byte[] content) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0x04);
        writeLength(out, content.length);
        out.write(content);
        return out.toByteArray();
    }

    private byte[] buildSequence(byte[]... elements) throws IOException {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        for (byte[] element : elements) {
            body.write(element);
        }
        byte[] bodyBytes = body.toByteArray();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0x30);
        writeLength(out, bodyBytes.length);
        out.write(bodyBytes);
        return out.toByteArray();
    }

    private void writeLength(ByteArrayOutputStream out, int length) {
        if (length < 0x80) {
            out.write(length);
            return;
        }
        int numBytes = (Integer.SIZE - Integer.numberOfLeadingZeros(length) + 7) / 8;
        out.write(0x80 | numBytes);
        for (int i = numBytes - 1; i >= 0; i--) {
            out.write((length >> (8 * i)) & 0xFF);
        }
    }
}
