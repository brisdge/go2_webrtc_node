import { WebRTCDataChannelPubSub } from './msgs/pub_sub.js';
import { WebRTCDataChannelHeartBeat } from './msgs/heartbeat.js';
import WebRTCDataChannelValidaton from './msgs/validation.js';
import { WebRTCDataChannelRTCInnerReq } from './msgs/rtc_inner_req.js';
import { printStatus } from './util.js';
import { handle_error } from './msgs/error_handler.js';
import { DATA_CHANNEL_TYPE } from './constants.js';

export class WebRTCDataChannel {
    constructor(conn, pc) {
        this.channel = pc.createDataChannel("data");
        this.data_channel_opened = false;
        this.conn = conn;

        this.pub_sub = new WebRTCDataChannelPubSub(this.channel);

        this.heartbeat = new WebRTCDataChannelHeartBeat(this.channel, this.pub_sub);
        this.validaton = new WebRTCDataChannelValidaton(this.channel, this.pub_sub);
        this.rtc_inner_req = new WebRTCDataChannelRTCInnerReq(this.conn, this.channel, this.pub_sub);

        this.validaton.set_on_validate_callback(() => {
            this.data_channel_opened = true;
            this.heartbeat.start_heartbeat();
            this.rtc_inner_req.network_status.start_network_status_fetch();
            printStatus("Data Channel Verification", "✅ OK");
        });

        this.rtc_inner_req.network_status.set_on_network_status_callback((mode) => {
            console.log(`Go2 connection mode: ${mode}`);
        });

        this.channel.on("open", () => {
            console.log("Data channel opened");
        });

        this.channel.on("close", () => {
            console.log("Data channel closed");
            this.data_channel_opened = false;
            this.heartbeat.stop_heartbeat();
            this.rtc_inner_req.network_status.stop_network_status_fetch();
        });

        this.channel.on("message", async (message) => {
            console.log(`Received message on data channel: ${message}`);
            try {
                if (!message) return;

                let parsed_data;
                if (typeof message === 'string') {
                    parsed_data = JSON.parse(message);
                } else if (Buffer.isBuffer(message)) {
                    parsed_data = WebRTCDataChannel.deal_array_buffer(message);
                }

                this.pub_sub.run_resolve(parsed_data);
                await this.handle_response(parsed_data);
            } catch (error) {
                console.error("Error processing WebRTC data", error);
            }
        });
    }

    async handle_response(msg) {
        const msg_type = msg["type"];

        if (msg_type === DATA_CHANNEL_TYPE["VALIDATION"]) {
            await this.validaton.handle_response(msg);
        } else if (msg_type === DATA_CHANNEL_TYPE["RTC_INNER_REQ"]) {
            this.rtc_inner_req.handle_response(msg);
        } else if (msg_type === DATA_CHANNEL_TYPE["HEARTBEAT"]) {
            this.heartbeat.handle_response(msg);
        } else if ([DATA_CHANNEL_TYPE["ERRORS"], DATA_CHANNEL_TYPE["ADD_ERROR"], DATA_CHANNEL_TYPE["RM_ERROR"]].includes(msg_type)) {
            handle_error(msg);
        } else if (msg_type === DATA_CHANNEL_TYPE["ERR"]) {
            await this.validaton.handle_err_response(msg);
        }
    }

    async wait_datachannel_open(timeout = 5) {
        try {
            await this._wait_for_open(timeout);
        } catch (error) {
            console.log("Data channel did not open in time");
            process.exit(1);
        }
    }

    async _wait_for_open() {
        while (!this.data_channel_opened) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    static deal_array_buffer(buffer) {
        const [header_1, header_2] = buffer.slice(0, 4);
        if (header_1 === 2 && header_2 === 0) {
            return WebRTCDataChannel.deal_array_buffer_for_lidar(buffer.slice(4));
        } else {
            return WebRTCDataChannel.deal_array_buffer_for_normal(buffer);
        }
    }

    async disableTrafficSaving(switchState) {
        const data = {
            req_type: "disable_traffic_saving",
            instruction: switchState ? "on" : "off"
        };
        const response = await this.pub_sub.publish(
            "",
            data,
            DATA_CHANNEL_TYPE["RTC_INNER_REQ"]
        );
        if (response.info.execution === "ok") {
            console.log(`DisableTrafficSavings: ${data.instruction}`);
            return true;
        }
        return false;
    }

    switchVideoChannel(switchState) {
        this.pub_sub.publish_without_callback(
            "",
            switchState ? "on" : "off",
            DATA_CHANNEL_TYPE["VID"]
        );
        console.log(`Video channel: ${switchState ? 'on' : 'off'}`);
    }

    switchAudioChannel(switchState) {
        this.pub_sub.publish_without_callback(
            "",
            switchState ? "on" : "off",
            DATA_CHANNEL_TYPE["AUD"]
        );
        console.log(`Audio channel: ${switchState ? 'on' : 'off'}`);
    }
}
