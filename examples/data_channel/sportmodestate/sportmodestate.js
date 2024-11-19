import { Go2WebRTCConnection, WebRTCConnectionMethod } from '../../../webrtc_driver.js';    
import { RTC_TOPIC } from '../../../constants.js';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

(async () => {
    const conn = new Go2WebRTCConnection(WebRTCConnectionMethod.LocalAP)
    await conn.connect()

    function display_data(data){
        console.log(data)
    }
    conn.datachannel.pub_sub.subscribe(RTC_TOPIC.LF_SPORT_MOD_STATE, display_data)

    await delay(3600 * 1000)
})()