const { createSocket } = require('dgram');
const { setTimeout } = require('timers/promises');

const RECV_PORT = 10134;
const MULTICAST_GROUP = '231.1.1.1';
const MULTICAST_PORT = 10131;

const discoverIpSn = async (timeout = 2) => {
    console.log("Discovering devices on the network...");

    const serialToIp = {};

    const sock = createSocket('udp4');

    sock.bind(RECV_PORT, () => {
        sock.setBroadcast(true);
        sock.addMembership(MULTICAST_GROUP);
    });

    const queryMessage = JSON.stringify({ name: "unitree_dapengche" });

    try {
        sock.send(queryMessage, 0, queryMessage.length, MULTICAST_PORT, MULTICAST_GROUP, (err) => {
            if (err) {
                console.error(`Error sending multicast query: ${err}`);
                sock.close();
            }
        });
    } catch (e) {
        console.error(`Error sending multicast query: ${e}`);
        sock.close();
        return serialToIp;
    }

    sock.setTimeout(timeout * 1000);

    sock.on('message', (data, addr) => {
        try {
            const message = data.toString();
            const messageDict = JSON.parse(message);
            if (messageDict.sn) {
                const serialNumber = messageDict.sn;
                const ipAddress = messageDict.ip || addr.address;
                serialToIp[serialNumber] = ipAddress;
                console.log(`Discovered device: ${serialNumber} at ${ipAddress}`);
            }
        } catch (e) {
            console.error(`Error decoding JSON message: ${e}`);
        }
    });

    await setTimeout(timeout * 1000);

    sock.close();

    return serialToIp;
};

if (require.main === module) {
    console.log("Discovering devices on the network...");
    (async () => {
        const serialToIp = await discoverIpSn(3);
        console.log("\nDiscovered devices:");
        for (const [serialNumber, ipAddress] of Object.entries(serialToIp)) {
            console.log(`Serial Number: ${serialNumber}, IP Address: ${ipAddress}`);
        }
    })();
}

module.exports = { discoverIpSn };