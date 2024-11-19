import pkg from 'wrtc';
const { RTCIceServer, RTCConfiguration, RTCPeerConnection, RTCSessionDescription } = pkg;

import { fetchPublicKey, fetchToken, fetchTurnServerInfo, printStatus } from './util.js';
import pkg2 from './multicast_scanner.cjs';
const { discoverIpSn } = pkg2;
import { WebRTCDataChannel } from './webrtc_datachannel.js';
import { WebRTCAudioChannel } from './webrtc_audio.js';
import { WebRTCVideoChannel } from './webrtc_video.js';
import { WebRTCConnectionMethod } from './constants.js';
import { sendSdpToLocalPeer, sendSdpToRemotePeer } from './unitree_auth.js';

class Go2WebRTCConnection {
    constructor(connectionMethod, serialNumber = null, ip = null, username = null, password = null) {
        this.pc = null;
        this.sn = serialNumber;
        this.ip = ip;
        this.connectionMethod = connectionMethod;
        this.isConnected = false;
        this.token = username && password ? fetchToken(username, password) : "";
    }

    async connect() {
        printStatus("WebRTC connection", "🟡 started");
        if (this.connectionMethod === WebRTCConnectionMethod.Remote) {
            this.publicKey = fetchPublicKey();
            const turnServerInfo = fetchTurnServerInfo(this.sn, this.token, this.publicKey);
            await this.initWebRTC(turnServerInfo);
        } else if (this.connectionMethod === WebRTCConnectionMethod.LocalSTA) {
            if (!this.ip && this.sn) {
                const discoveredIpSnAddresses = await discoverIpSn();

                if (discoveredIpSnAddresses) {
                    if (this.sn in discoveredIpSnAddresses) {
                        this.ip = discoveredIpSnAddresses[this.sn];
                    } else {
                        throw new Error("The provided serial number wasn't found on the network. Provide an IP address instead.");
                    }
                } else {
                    throw new Error("No devices found on the network. Provide an IP address instead.");
                }
            }
            await this.initWebRTC(this.ip);
        } else if (this.connectionMethod === WebRTCConnectionMethod.LocalAP) {
            this.ip = "192.168.12.1";
            await this.initWebRTC(this.ip);
        }
    }

    async disconnect() {
        if (this.pc) {
            await this.pc.close();
            this.pc = null;
        }
        this.isConnected = false;
        printStatus("WebRTC connection", "🔴 disconnected");
    }

    async reconnect() {
        await this.disconnect();
        await this.connect();
        printStatus("WebRTC connection", "🟢 reconnected");
    }

    createWebRTCConfiguration(turnServerInfo, stunEnable = true, turnEnable = true) {
        const iceServers = [];

        if (turnServerInfo) {
            const { user: username, passwd: credential, realm: turnUrl } = turnServerInfo;

            if (username && credential && turnUrl) {
                if (turnEnable) {
                    iceServers.push(new RTCIceServer({
                        urls: [turnUrl],
                        username: username,
                        credential: credential
                    }));
                }
                if (stunEnable) {
                    const stunUrl = "stun:stun.l.google.com:19302";
                    iceServers.push(new RTCIceServer({ urls: [stunUrl] }));
                }
            } else {
                throw new Error("Invalid TURN server information");
            }
        }

        return new RTCConfiguration({ iceServers });
    }

    async initWebRTC(turnServerInfo = null, ip = null) {
        const configuration = this.createWebRTCConfiguration(turnServerInfo);
        this.pc = new RTCPeerConnection(configuration);

        this.datachannel = new WebRTCDataChannel(this, this.pc);
        this.audio = new WebRTCAudioChannel(this.pc, this.datachannel);
        this.video = new WebRTCVideoChannel(this.pc, this.datachannel);

        this.pc.onicegatheringstatechange = async () => {
            const state = this.pc.iceGatheringState;
            if (state === "new") printStatus("ICE Gathering State", "🔵 new");
            else if (state === "gathering") printStatus("ICE Gathering State", "🟡 gathering");
            else if (state === "complete") printStatus("ICE Gathering State", "🟢 complete");
        };

        this.pc.oniceconnectionstatechange = async () => {
            const state = this.pc.iceConnectionState;
            if (state === "checking") printStatus("ICE Connection State", "🔵 checking");
            else if (state === "completed") printStatus("ICE Connection State", "🟢 completed");
            else if (state === "failed") printStatus("ICE Connection State", "🔴 failed");
            else if (state === "closed") printStatus("ICE Connection State", "⚫ closed");
        };

        this.pc.onconnectionstatechange = async () => {
            const state = this.pc.connectionState;
            if (state === "connecting") printStatus("Peer Connection State", "🔵 connecting");
            else if (state === "connected") {
                this.isConnected = true;
                printStatus("Peer Connection State", "🟢 connected");
            } else if (state === "closed") {
                this.isConnected = false;
                printStatus("Peer Connection State", "⚫ closed");
            } else if (state === "failed") printStatus("Peer Connection State", "🔴 failed");
        };

        this.pc.onsignalingstatechange = async () => {
            const state = this.pc.signalingState;
            if (state === "stable") printStatus("Signaling State", "🟢 stable");
            else if (state === "have-local-offer") printStatus("Signaling State", "🟡 have-local-offer");
            else if (state === "have-remote-offer") printStatus("Signaling State", "🟡 have-remote-offer");
            else if (state === "closed") printStatus("Signaling State", "⚫ closed");
        };

        this.pc.ontrack = async (track) => {
            if (track.kind === "video") {
                const frame = await track.recv();
                await this.video.trackHandler(track);
            }
            if (track.kind === "audio") {
                let frame = await track.recv();
                while (true) {
                    frame = await track.recv();
                    await this.audio.frameHandler(frame);
                }
            }
        };

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        let peerAnswerJson;
        if (this.connectionMethod === WebRTCConnectionMethod.Remote) {
            peerAnswerJson = await this.getAnswerFromRemotePeer(this.pc, turnServerInfo);
        } else if (this.connectionMethod === WebRTCConnectionMethod.LocalSTA || this.connectionMethod === WebRTCConnectionMethod.LocalAP) {
            peerAnswerJson = await this.getAnswerFromLocalPeer(this.pc, this.ip);
        }

        if (peerAnswerJson) {
            const peerAnswer = JSON.parse(peerAnswerJson);
            if (peerAnswer.sdp === "reject") {
                console.log("Go2 is connected by another WebRTC client. Close your mobile APP and try again.");
                process.exit(1);
            }

            const remoteSdp = new RTCSessionDescription({ sdp: peerAnswer.sdp, type: peerAnswer.type });
            await this.pc.setRemoteDescription(remoteSdp);
        } else {
            console.log("Could not get SDP from the peer. Check if the Go2 is switched on");
            process.exit(1);
        }

        await this.datachannel.waitDataChannelOpen();
    }

    async getAnswerFromRemotePeer(pc, turnServerInfo) {
        const sdpOffer = pc.localDescription;
        const sdpOfferJson = {
            id: "",
            turnserver: turnServerInfo,
            sdp: sdpOffer.sdp,
            type: sdpOffer.type,
            token: this.token
        };

        console.debug("Local SDP created: %s", sdpOfferJson);

        const peerAnswerJson = await sendSdpToRemotePeer(this.sn, JSON.stringify(sdpOfferJson), this.token, this.publicKey);
        return peerAnswerJson;
    }

    async getAnswerFromLocalPeer(pc, ip) {
        const sdpOffer = pc.localDescription;
        const sdpOfferJson = {
            id: this.connectionMethod === WebRTCConnectionMethod.LocalSTA ? "STA_localNetwork" : "",
            sdp: sdpOffer.sdp,
            type: sdpOffer.type,
            token: this.token
        };

        const peerAnswerJson = await sendSdpToLocalPeer(ip, JSON.stringify(sdpOfferJson));
        return peerAnswerJson;
    }
}

export { Go2WebRTCConnection, WebRTCConnectionMethod };
