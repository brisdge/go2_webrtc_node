const logging = console;

class WebRTCVideoChannel {
    constructor(pc, datachannel) {
        this.pc = pc;
        this.pc.addTransceiver('video', { direction: 'recvonly' });
        this.datachannel = datachannel;
        this.trackCallbacks = [];
    }

    switchVideoChannel(switchFlag) {
        this.datachannel.switchVideoChannel(switchFlag);
    }

    addTrackCallback(callback) {
        if (typeof callback === 'function') {
            this.trackCallbacks.push(callback);
        } else {
            logging.warn(`Callback ${callback} is not callable.`);
        }
    }

    async trackHandler(track) {
        logging.info('Receiving video frame');
        for (const callback of this.trackCallbacks) {
            try {
                await callback(track);
            } catch (e) {
                logging.error(`Error in callback ${callback}: ${e}`);
            }
        }
    }
}

export { WebRTCVideoChannel };
