import { app_error_messages } from '../constants.js';
import { format } from 'date-fns';

export function integerToHexString(errorCode) {
    if (typeof errorCode !== 'number') {
        throw new Error("Input must be an integer.");
    }

    return errorCode.toString(16).toUpperCase();
}

export function getErrorCodeText(errorSource, errorCode) {
    const key = `app_error_code_${errorSource}_${errorCode}`;

    if (key in app_error_messages) {
        return app_error_messages[key];
    } else {
        return `${errorSource}-${errorCode}`;
    }
}

export function getErrorSourceText(errorSource) {
    const key = `app_error_source_${errorSource}`;

    if (key in app_error_messages) {
        return app_error_messages[key];
    } else {
        return `${errorSource}`;
    }
}

export function handle_error(message) {
    const data = message.data;

    data.forEach((error) => {
        const [timestamp, errorSource, errorCodeInt] = error;

        const readableTime = format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm:ss');

        const errorSourceText = getErrorSourceText(errorSource);
        const errorCodeHex = integerToHexString(errorCodeInt);
        const errorCodeText = getErrorCodeText(errorSource, errorCodeHex);

        console.log(`
🚨 Error Received from Go2:
🕒 Time:          ${readableTime}
🔢 Error Source:  ${errorSourceText}
❗ Error Code:    ${errorCodeText}
`);
    });
}

export default {handle_error};