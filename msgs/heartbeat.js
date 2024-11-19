import { setTimeout, clearTimeout } from 'timers';
import { DATA_CHANNEL_TYPE } from '../constants.js';

export class WebRTCDataChannelHeartBeat {
  constructor(channel, pub_sub) {
    this.channel = channel;
    this.heartbeatTimer = null;
    this.heartbeatResponse = null;
    this.publish = pub_sub.publishWithoutCallback;
  }

  _formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  startHeartbeat() {
    this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), 2000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  sendHeartbeat() {
    if (this.channel.readyState === 'open') {
      const currentTime = Date.now() / 1000;
      const formattedTime = this._formatDate(currentTime);
      const data = {
        timeInStr: formattedTime,
        timeInNum: Math.floor(currentTime),
      };
      this.publish(
        '',
        data,
        DATA_CHANNEL_TYPE.HEARTBEAT,
      );
    }
    this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), 2000);
  }

  handleResponse(message) {
    this.heartbeatResponse = Date.now() / 1000;
    console.info('Heartbeat response received.');
  }
}

export default WebRTCDataChannelHeartBeat;
