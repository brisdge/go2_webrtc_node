import { generateUUID } from '../util.js';
import { DATA_CHANNEL_TYPE, WebRTCConnectionMethod } from '../constants.js';

class WebRTCChannelProbeResponse {
  constructor(channel, pubSub) {
    this.channel = channel;
    this.publish = pubSub.publishWithoutCallback;
  }

  handleResponse(info) {
    this.publish(
      "",
      info,
      DATA_CHANNEL_TYPE["RTC_INNER_REQ"]
    );
  }
}

class WebRTCDataChannelNetworkStatus {
  constructor(conn, channel, pubSub) {
    this.conn = conn;
    this.channel = channel;
    this.publish = pubSub.publish;
    this.networkTimer = null;
    this.networkStatus = "";
    this.onNetworkStatusCallbacks = [];
  }

  setOnNetworkStatusCallback(callback) {
    if (callback && typeof callback === 'function') {
      this.onNetworkStatusCallbacks.push(callback);
    }
  }

  startNetworkStatusFetch() {
    this.networkTimer = setTimeout(() => this.scheduleNetworkStatusRequest(), 1000);
  }

  stopNetworkStatusFetch() {
    if (this.networkTimer) {
      clearTimeout(this.networkTimer);
      this.networkTimer = null;
    }
  }

  scheduleNetworkStatusRequest() {
    this.sendNetworkStatusRequest();
  }

  async sendNetworkStatusRequest() {
    const data = {
      req_type: "public_network_status",
      uuid: generateUUID()
    };
    try {
      const response = await this.publish(
        "",
        data,
        DATA_CHANNEL_TYPE["RTC_INNER_REQ"]
      );
      this.handleResponse(response.info);
    } catch (e) {
      console.error("Failed to publish:", e);
    }
  }

  handleResponse(info) {
    console.info("Network status message received.");
    const status = info.status;
    if (status === "Undefined" || status === "NetworkStatus.DISCONNECTED") {
      this.networkTimer = setTimeout(() => this.scheduleNetworkStatusRequest(), 500);
    } else if (status === "NetworkStatus.ON_4G_CONNECTED") {
      this.networkStatus = "4G";
      this.stopNetworkStatusFetch();
    } else if (status === "NetworkStatus.ON_WIFI_CONNECTED") {
      this.networkStatus = this.conn.connectionMethod === WebRTCConnectionMethod.Remote ? "STA-T" : "STA-L";
    }
    if (status === "NetworkStatus.ON_4G_CONNECTED" || status === "NetworkStatus.ON_WIFI_CONNECTED") {
      this.onNetworkStatusCallbacks.forEach(callback => callback(this.networkStatus));
      this.stopNetworkStatusFetch();
    }
  }
}

class WebRTCDataChannelFileUploader {
  constructor(channel, pubSub) {
    this.channel = channel;
    this.publish = pubSub.publish;
    this.cancelUpload = false;
  }

  sliceBase64IntoChunks(data, chunkSize) {
    return [...Array(Math.ceil(data.length / chunkSize))].map((_, i) => data.slice(i * chunkSize, (i + 1) * chunkSize));
  }

  async uploadFile(data, filePath, chunkSize = 60 * 1024, progressCallback = null) {
    const encodedData = Buffer.from(data).toString('base64');
    console.log("Total size after Base64 encoding:", encodedData.length);
    const chunks = this.sliceBase64IntoChunks(encodedData, chunkSize);
    const totalChunks = chunks.length;
    this.cancelUpload = false;

    for (let i = 0; i < totalChunks; i++) {
      if (this.cancelUpload) {
        console.log("Upload canceled.");
        return "cancel";
      }

      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const uuid = generateUUID();
      const reqUUID = `upload_req_${uuid}`;
      const message = {
        req_type: "push_static_file",
        req_uuid: reqUUID,
        related_bussiness: "uslam_final_pcd",
        file_md5: "null",
        file_path: filePath,
        file_size_after_b64: encodedData.length,
        file: {
          chunk_index: i + 1,
          total_chunk_num: totalChunks,
          chunk_data: chunks[i],
          chunk_data_size: chunks[i].length
        }
      };

      this.publish("", message, DATA_CHANNEL_TYPE["RTC_INNER_REQ"]);

      if (progressCallback) {
        progressCallback(Math.floor(((i + 1) / totalChunks) * 100));
      }
    }

    return "ok";
  }

  cancel() {
    this.cancelUpload = true;
  }
}

class WebRTCDataChannelFileDownloader {
  constructor(channel, pubSub) {
    this.channel = channel;
    this.publish = pubSub.publish;
    this.cancelDownload = false;
    this.chunkDataStorage = {};
  }

  async downloadFile(filePath, chunkSize = 60 * 1024, progressCallback = null) {
    this.cancelDownload = false;

    try {
      const uuid = generateUUID();
      const requestMessage = {
        req_type: "request_static_file",
        req_uuid: `req_${uuid}`,
        related_bussiness: "uslam_final_pcd",
        file_md5: "null",
        file_path: filePath
      };

      const response = await this.publish("", requestMessage, DATA_CHANNEL_TYPE["RTC_INNER_REQ"]);

      if (this.cancelDownload) {
        console.log("Download canceled.");
        return "cancel";
      }

      const completeData = response.info?.file?.data;

      if (!completeData) {
        console.error("Failed to get the file data.");
        return "error";
      }

      const decodedData = Buffer.from(completeData, 'base64');

      if (progressCallback) {
        progressCallback(100);
      }

      return decodedData;
    } catch (e) {
      console.error("Failed to download file:", e);
      return "error";
    }
  }

  cancel() {
    this.cancelDownload = true;
  }
}

class WebRTCDataChannelRTCInnerReq {
  constructor(conn, channel, pubSub) {
    this.conn = conn;
    this.channel = channel;
    this.networkStatus = new WebRTCDataChannelNetworkStatus(this.conn, this.channel, pubSub);
    this.probeRes = new WebRTCChannelProbeResponse(this.channel, pubSub);
  }

  handleResponse(msg) {
    const info = msg.info;
    const reqType = info.req_type;
    if (reqType === 'rtt_probe_send_from_mechine') {
      this.probeRes.handleResponse(info);
    }
  }
}

export { WebRTCDataChannelNetworkStatus, WebRTCDataChannelFileUploader, WebRTCDataChannelFileDownloader, WebRTCDataChannelRTCInnerReq };
