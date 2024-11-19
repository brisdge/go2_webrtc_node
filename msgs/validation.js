import crypto from 'crypto';
import { DATA_CHANNEL_TYPE } from '../constants.js';

export class WebRTCDataChannelValidaton {
    constructor(channel, pubSub) {
        this.channel = channel;
        this.publish = pubSub.publish;
        this.onValidateCallbacks = [];
        this.key = "";
    }

    setOnValidateCallback(callback) {
        if (callback && typeof callback === 'function') {
            this.onValidateCallbacks.push(callback);
        }
    }

    async handleResponse(message) {
        if (message.data === "Validation Ok.") {
            console.log("Validation succeed");
            for (const callback of this.onValidateCallbacks) {
                callback();
            }
        } else {
            this.channel._setReadyState("open");
            this.key = message.data;
            await this.publish(
                "",
                this.encryptKey(this.key),
                DATA_CHANNEL_TYPE["VALIDATION"],
            );
        }
    }

    async handleErrResponse(message) {
        if (message.info === "Validation Needed.") {
            await this.publish(
                "",
                this.encryptKey(this.key),
                DATA_CHANNEL_TYPE["VALIDATION"],
            );
        }
    }

    static hexToBase64(hexStr) {
        const bytesArray = Buffer.from(hexStr, 'hex');
        return bytesArray.toString('base64');
    }

    static encryptByMD5(inputStr) {
        const hash = crypto.createHash('md5');
        hash.update(inputStr, 'utf-8');
        return hash.digest('hex');
    }

    static encryptKey(key) {
        const prefixedKey = `UnitreeGo2_${key}`;
        const encrypted = WebRTCDataChannelValidaton.encryptByMD5(prefixedKey);
        return WebRTCDataChannelValidaton.hexToBase64(encrypted);
    }
}
export default WebRTCDataChannelValidaton;