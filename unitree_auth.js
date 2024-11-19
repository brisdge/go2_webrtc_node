import crypto from 'crypto';
import axios from 'axios';
import querystring from 'querystring';
import { aesEncrypt, generateAesKey, rsaEncrypt, aesDecrypt, rsaLoadPublicKey } from './encryption.js';

function _calcLocalPathEnding(data1) {
  const strArr = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const last10Chars = data1.slice(-10);
  const chunked = [];

  for (let i = 0; i < last10Chars.length; i += 2) {
    chunked.push(last10Chars.slice(i, i + 2));
  }

  const arrayList = chunked
    .filter(chunk => chunk.length > 1)
    .map(chunk => {
      const secondChar = chunk[1];
      const index = strArr.indexOf(secondChar);
      if (index === -1) {
        console.log(`Character ${secondChar} not found in strArr.`);
      }
      return index;
    })
    .filter(index => index !== -1);

  return arrayList.join('');
}

async function makeRemoteRequest(path, body, token, method = "GET") {
  const APP_SIGN_SECRET = "XyvkwK45hp5PHfA8";
  const UM_CHANNEL_KEY = "UMENG_CHANNEL";
  const BASE_URL = "https://global-robot-api.unitree.com/";

  const appTimestamp = String(Date.now());
  const appNonce = crypto.createHash('md5').update(appTimestamp).digest('hex');
  const signStr = `${APP_SIGN_SECRET}${appTimestamp}${appNonce}`;
  const appSign = crypto.createHash('md5').update(signStr).digest('hex');

  const timezoneOffset = new Date().getTimezoneOffset();
  const sign = timezoneOffset > 0 ? "-" : "+";
  const appTimezone = `GMT${sign}${String(Math.abs(timezoneOffset) / 60).padStart(2, '0')}:${String(Math.abs(timezoneOffset) % 60).padStart(2, '0')}`;

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "DeviceId": "Samsung/GalaxyS20/SM-G981B/s20/10/29",
    "AppTimezone": appTimezone,
    "DevicePlatform": "Android",
    "DeviceModel": "SM-G981B",
    "SystemVersion": "29",
    "AppVersion": "1.8.0",
    "AppLocale": "en_US",
    "AppTimestamp": appTimestamp,
    "AppNonce": appNonce,
    "AppSign": appSign,
    "Channel": UM_CHANNEL_KEY,
    "Token": token,
    "AppName": "Go2"
  };

  const url = `${BASE_URL}${path}`;
  try {
    let response;
    if (method.toUpperCase() === "GET") {
      const params = querystring.stringify(body);
      response = await axios.get(url, { params, headers });
    } else {
      const encodedBody = querystring.stringify(body);
      response = await axios.post(url, encodedBody, { headers });
    }
    return response.data;
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}

async function sendSdpToRemotePeer(serial, sdp, accessToken, publicKey) {
  console.log("Sending SDP to Go2...");
  const aesKey = generateAesKey();
  const path = "webrtc/connect";
  const body = {
    "sn": serial,
    "sk": rsaEncrypt(aesKey, publicKey),
    "data": aesEncrypt(sdp, aesKey),
    "timeout": 5
  };
  const response = await makeRemoteRequest(path, body, accessToken, "POST");
  if (response.code === 100) {
    console.log("Received SDP Answer from Go2!");
    return aesDecrypt(response.data, aesKey);
  } else if (response.code === 1000) {
    console.log("Device not online");
    process.exit(1);
  } else {
    throw new Error(`Failed to receive SDP Answer: ${JSON.stringify(response)}`);
  }
}

async function sendSdpToLocalPeerOldMethod(ip, sdp) {
  const url = `http://${ip}:8081/offer`;
  const headers = { 'Content-Type': 'application/json' };
  try {
    const response = await makeLocalRequest(url, sdp, headers);
    if (response && response.status === 200) {
      console.log(`Received SDP: ${response.data}`);
      return response.data;
    } else {
      throw new Error(`Failed to receive SDP Answer: ${response.status}`);
    }
  } catch (error) {
    console.error(`An error occurred while sending the SDP: ${error}`);
    return null;
  }
}

async function sendSdpToLocalPeerNewMethod(ip, sdp) {
  const url = `http://${ip}:9991/con_notify`;
  try {
    const response = await makeLocalRequest(url);
    if (response) {
      const decodedResponse = Buffer.from(response.data, 'base64').toString('utf-8');
      console.log(`Received con_notify response: ${decodedResponse}`);
      const decodedJson = JSON.parse(decodedResponse);
      const data1 = decodedJson.data1;
      const publicKeyPem = data1.slice(10, data1.length - 10);
      const pathEnding = _calcLocalPathEnding(data1);

      const aesKey = generateAesKey();
      const publicKey = rsaLoadPublicKey(publicKeyPem);

      const body = {
        "data1": aesEncrypt(sdp, aesKey),
        "data2": rsaEncrypt(aesKey, publicKey)
      };

      const postUrl = `http://${ip}:9991/con_ing_${pathEnding}`;
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const postResponse = await makeLocalRequest(postUrl, JSON.stringify(body), headers);

      if (postResponse) {
        const decryptedResponse = aesDecrypt(postResponse.data, aesKey);
        console.log(`Received con_ing_${pathEnding} response: ${decryptedResponse}`);
        return decryptedResponse;
      }
    } else {
      throw new Error("Failed to receive initial public key response.");
    }
  } catch (error) {
    console.error(`An error occurred while sending the SDP: ${error}`);
    return null;
  }
}

async function sendSdpToLocalPeer(ip, sdp) {
  try {
    console.log("Trying to send SDP using the old method...");
    const response = await sendSdpToLocalPeerOldMethod(ip, sdp);
    if (response) {
      console.log("SDP successfully sent using the old method.");
      return response;
    } else {
      console.warn("Old method failed, trying the new method...");
    }
  } catch (error) {
    console.error(`An error occurred with the old method: ${error}`);
    console.log("Falling back to the new method...");
  }

  try {
    return await sendSdpToLocalPeerNewMethod(ip, sdp);
  } catch (error) {
    console.error(`An error occurred with the new method: ${error}`);
    return null;
  }
}

async function makeLocalRequest(url, body = null, headers = null) {
  try {
    const response = await axios.post(url, body, { headers });
    if (response.status === 200) {
      return response;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`An error occurred: ${error}`);
    return null;
  }
}

export { sendSdpToRemotePeer, sendSdpToLocalPeer, sendSdpToLocalPeerOldMethod, sendSdpToLocalPeerNewMethod , makeRemoteRequest, makeLocalRequest};
