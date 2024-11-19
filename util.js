import crypto from 'crypto';
import { makeRemoteRequest } from './unitree_auth.js';
import { rsaEncrypt, rsaLoadPublicKey, aesDecrypt, generateAesKey } from './encryption.js';

const generateMd5 = (string) => {
  const md5Hash = crypto.createHash('md5');
  md5Hash.update(string);
  return md5Hash.digest('hex');
};

const generateUUID = () => {
  const replaceChar = (char) => {
    const rand = Math.floor(Math.random() * 16);
    if (char === 'x') return rand.toString(16);
    if (char === 'y') return (rand & 0x3 | 0x8).toString(16);
  };

  const uuidTemplate = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return uuidTemplate.split('').map(char => 'xy'.includes(char) ? replaceChar(char) : char).join('');
};

const getNestedField = (message, ...fields) => {
  let currentLevel = message;
  for (const field of fields) {
    if (currentLevel && typeof currentLevel === 'object' && field in currentLevel) {
      currentLevel = currentLevel[field];
    } else {
      return null;
    }
  }
  return currentLevel;
};

const fetchToken = async (email, password) => {
  console.log('Obtaining TOKEN...');
  const path = "login/email";
  const body = {
    email: email,
    password: generateMd5(password)
  };

  try {
    const response = await makeRemoteRequest(path, body, "", "POST");
    if (response.code === 100) {
      const data = response.data;
      return data.accessToken;
    } else {
      console.error("Failed to receive token");
      return null;
    }
  } catch (error) {
    console.error('Error fetching token', error);
    return null;
  }
};

const fetchPublicKey = async () => {
  console.log('Obtaining a Public key...');
  const path = "system/pubKey";

  try {
    const response = await makeRemoteRequest(path, {}, "", "GET");
    if (response.code === 100) {
      const publicKeyPem = response.data;
      return rsaLoadPublicKey(publicKeyPem);
    } else {
      console.error('Failed to receive public key');
      return null;
    }
  } catch (error) {
    console.error('Error fetching public key', error);
    return null;
  }
};

const fetchTurnServerInfo = async (serial, accessToken, publicKey) => {
  console.log('Obtaining TURN server info...');
  const aesKey = generateAesKey();
  const path = "webrtc/account";
  const body = {
    sn: serial,
    sk: rsaEncrypt(aesKey, publicKey)
  };

  try {
    const response = await makeRemoteRequest(path, body, accessToken, "POST");
    if (response.code === 100) {
      return JSON.parse(aesDecrypt(response.data, aesKey));
    } else {
      console.error("Failed to receive TURN server info");
      return null;
    }
  } catch (error) {
    console.error('Error fetching TURN server info', error);
    return null;
  }
};

export const printStatus = (statusType, statusMessage) => {
  const currentTime = new Date().toLocaleTimeString();
  console.log(`🕒 ${statusType.padEnd(25)}: ${statusMessage.padEnd(15)} (${currentTime})`);
};

export { generateMd5, generateUUID, getNestedField, fetchToken, fetchPublicKey, fetchTurnServerInfo };
