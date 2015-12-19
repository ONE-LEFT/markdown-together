var EE = require('./EventEmitter.jsx');
var ContentStore = require('./ContentStore.jsx');

/****************************
 *    DSM Connection
 */
var DSMConnection = function (fileName) {

    var localTreeConfig = {};
    localTreeConfig.dsmServerIP = "dsm.md.picfood.cn"; // Change IxP address to your p2p DSM Server address
    localTreeConfig.port = 45066;
    localTreeConfig.rootName = fileName;
    localTreeConfig.transportConfig = {
        config: "trap.transport.http.url = " + "http://" + localTreeConfig.dsmServerIP + ":" + localTreeConfig.port + "/",
        autoConfigure: true
    };
    localTreeConfig.transportConfig.protocol = "TCP/TRAP";

    var diffStore = new DSM.ListReplica("diffStore");
    var infoChannel = new DSM.HashReplica("infoChannel");
    var localSyncTree = new DSM.LocalSyncTree(localTreeConfig, function () {

        var connectedNode = localSyncTree.ROOT.newChildNode("connected");

        connectedNode.attachChild([diffStore, infoChannel], function () {

            console.debug('### attachChild ###\n', diffStore);
            console.debug('### attachChild size ###\n', diffStore.size());

            if (diffStore.size() > 0) {
                for (var i = 0; i < diffStore.size(); i += 1) {
                    ContentStore.diffQueue.push(diffStore.get(i));
                    ContentStore.diffHistory.push(diffStore.get(i));
                }
                EE.emit('change');
            }

            diffStore.remoteupdate = function (op) {
                console.debug('### remoteupdate ###\n', op);
                switch (op.type) {
                    case DSM.Operation.ADD:
                        ContentStore.diffQueue.push(op.item);
                        ContentStore.diffHistory.push(op.item);
                        EE.emit('change');
                        break;
                    case DSM.Operation.SET:
                        break;
                    case DSM.Operation.DEL:
                        break;
                    case DSM.Operation.CLEAR:
                        break;
                }
            };

            infoChannel.remoteupdate = function (op) {
                //console.log('infoChannel.remoteupdate:', op);
            };
        });

    });

    /**
     * This function sends the message via DSM
     * @param {object} diff           diff data
     */
    this.sendDiff = function (diff) {
        console.debug('### sendDiff ###\n', diff);
        diffStore.append(diff);
        diffStore.commit();
    };

    /**
     * This function sends the information text (e.g. "is typing") via DSM
     * @param {string} info            information text
     */
    this.sendInfo = function (info) {
        infoChannel.set(info);
        infoChannel.commit();
    };

    /**
     * This function is called on the user action upon the gui to clear
     * all the message in DSM
     * @param {string} info            information text
     */
    this.clearMessageStore = function () {
        if (diffStore.size() > 0) {
            diffStore.clear();
            diffStore.commit();
        }
    };
};

module.exports = DSMConnection;