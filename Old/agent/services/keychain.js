import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const NEXUS_DIR = path.join(os.homedir(), '.nexus');
const KEY_FILE = path.join(NEXUS_DIR, 'secret.key');
const CREDENTIALS_FILE = path.join(NEXUS_DIR, 'credentials.enc');

// Ensure directory exists
if (!fs.existsSync(NEXUS_DIR)) {
  fs.mkdirSync(NEXUS_DIR, { recursive: true });
}

// Get or create encryption key
function getEncryptionKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE);
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key, { mode: 0o600 }); // Restrictive permissions
  return key;
}

const ALGORITHM = 'aes-256-gcm';

export function saveCredential(provider, token) {
  try {
    const key = getEncryptionKey();
    let credentials = {};

    if (fs.existsSync(CREDENTIALS_FILE)) {
      const encryptedData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
      
      const decipher = crypto.createDecipheriv(
        ALGORITHM, 
        key, 
        Buffer.from(ivHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      credentials = JSON.parse(decrypted);
    }

    credentials[provider] = token;

    // Encrypt updated credentials
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    const payload = `${iv.toString('hex')}:${authTag}:${encrypted}`;
    
    fs.writeFileSync(CREDENTIALS_FILE, payload, { mode: 0o600 });
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: `Failed to save credential: ${err.message}` };
  }
}

export function getCredential(provider) {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const key = getEncryptionKey();
    const encryptedData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      key, 
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const credentials = JSON.parse(decrypted);
    return credentials[provider] || null;
  } catch (err) {
    console.error(`Failed to read credentials: ${err.message}`);
    return null;
  }
}
