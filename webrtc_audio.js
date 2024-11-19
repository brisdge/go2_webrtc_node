export class WebRTCAudioChannel {
    constructor(pc, datachannel) {
        this.pc = pc;
        this.pc.addTransceiver('audio', { direction: 'sendrecv' });
        this.datachannel = datachannel;
        this.trackCallbacks = [];
    }

    async frameHandler(frame) {
        console.log("Receiving audio frame");

        for (const callback of this.trackCallbacks) {
            try {
                await callback(frame);
            } catch (e) {
                console.error(`Error in callback ${callback}: ${e}`);
            }
        }
    }

    addTrackCallback(callback) {
        if (typeof callback === 'function') {
            this.trackCallbacks.push(callback);
        } else {
            console.warn(`Callback ${callback} is not callable.`);
        }
    }

    switchAudioChannel(switchFlag) {
        this.datachannel.switchAudioChannel(switchFlag);
    }
}
export default WebRTCAudioChannel;
