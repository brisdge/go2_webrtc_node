import { randomUUID } from 'crypto';
import { publicEncrypt, privateDecrypt, generateKeyPairSync } from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import base64 from 'base-64';

const AES_BLOCK_SIZE = 16;

function _generateUUID() {
    const uuidBuffer = randomUUID().replace(/-/g, '');
    return uuidBuffer;
}

function pad(data) {
    const padding = AES_BLOCK_SIZE - (data.length % AES_BLOCK_SIZE);
    return data + String.fromCharCode(padding).repeat(padding);
}

function unpad(data) {
    const padding = data.charCodeAt(data.length - 1);
    return data.slice(0, -padding);
}

function aesEncrypt(data, key) {
    const keyBuffer = Buffer.from(key, 'utf-8');
    const paddedData = pad(data);
    const cipher = createCipheriv('aes-256-ecb', keyBuffer, null);
    let encryptedData = cipher.update(paddedData, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    return encryptedData;
}

function aesDecrypt(encryptedData, key) {
    const keyBuffer = Buffer.from(key, 'utf-8');
    const encryptedDataBuffer = base64.decode(encryptedData);
    const decipher = createDecipheriv('aes-256-ecb', keyBuffer, null);
    let decryptedData = decipher.update(encryptedDataBuffer, null, 'utf8');
    decryptedData += decipher.final('utf8');
    return unpad(decryptedData);
}

function generateAesKey() {
    return _generateUUID();
}

function rsaLoadPublicKey(pemData) {
    const buffer = Buffer.from(pemData, 'base64');
    return buffer;
}

function rsaEncrypt(data, publicKeyBuffer) {
    const encryptedData = publicEncrypt({
        key: publicKeyBuffer,
        padding: require('crypto').constants.RSA_PKCS1_PADDING,
    }, Buffer.from(data, 'utf8'));
    return base64.encode(encryptedData);
}

export {
    _generateUUID,
    pad,
    unpad,
    aesEncrypt,
    aesDecrypt,
    generateAesKey,
    rsaLoadPublicKey,
    rsaEncrypt
};
