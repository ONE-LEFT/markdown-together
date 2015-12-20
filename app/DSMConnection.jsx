var EE = require('./EventEmitter.jsx');
var ContentStore = require('./ContentStore.jsx');

/****************************
 *    DSM Connection
 */
var DSMConnection = function (fileName) {

    var self = this;

    var localTreeConfig = {};
    localTreeConfig.dsmServerIP = "dsm.md.picfood.cn"; // Change IxP address to your p2p DSM Server address
    localTreeConfig.port = 45066;
    localTreeConfig.rootName = fileName;
    localTreeConfig.transportConfig = {
        config: "trap.transport.http.url = " + "http://" + localTreeConfig.dsmServerIP + ":" + localTreeConfig.port + "/",
        autoConfigure: true
    };
    localTreeConfig.transportConfig.protocol = "TCP/TRAP";

    this.diffStore = new DSM.ListReplica("diffStore");
    this.infoChannel = new DSM.HashReplica("infoChannel");
    this.content = '';
    this.position = 0;
    this.onPatching = false;
    this.emitChange = function () {
        if (!self.onPatching) {
            self.onPatching = true;
            EE.emit('change');
        } else {
            setTimeout(this.emitChange, 200);
        }
    };

    var localSyncTree = new DSM.LocalSyncTree(localTreeConfig, function () {

        var connectedNode = localSyncTree.ROOT.newChildNode("connected");

        connectedNode.attachChild([self.diffStore, self.infoChannel], function () {

            var addItemToContentStore = function (itemStr, pos) {
                //try {
                //    var diffItem = JSON.parse(itemStr);
                //    ContentStore.diffQueue.push({
                //        item: diffItem,
                //        pos: pos
                //    });
                //    ContentStore.diffHistory.push({
                //        item: diffItem,
                //        pos: pos
                //    });
                //} catch (err) {
                //    console.error('### addItemToContentStore ERROR ###\n', err);
                //    self.setDiffErr(op.pos);
                //}
            };


            console.debug('### attachChild ###\n', self.diffStore.toJSON());
            console.debug('### attachChild size ###\n', self.diffStore.size());

            if (self.diffStore.size() > 0) {
                //for (var i = 0; i < self.diffStore.size(); i += 1) {
                //    addItemToContentStore(self.diffStore.get(i), i);
                //}
                self.emitChange();
            }

            self.diffStore.remoteupdate = function (op) {
                console.debug('### remoteupdate ###\n', op);
                switch (op.type) {
                    case DSM.Operation.ADD:
                        //addItemToContentStore(op.item, op.pos);
                        self.emitChange();
                        break;
                    case DSM.Operation.SET:
                        break;
                    case DSM.Operation.DEL:
                        self.content = '';
                        self.position = 0;
                        break;
                    case DSM.Operation.CLEAR:
                        self.content = '';
                        self.position = 0;
                        break;
                }
            };

            self.infoChannel.remoteupdate = function (op) {
                //console.log('self.infoChannel.remoteupdate:', op);
            };
        });

    });

    /**
     * This function sends the message via DSM
     * @param {object} diff           diff data
     */
    this.sendDiff = function (diff) {
        var diffItem = JSON.stringify({
            diff: diff,
            err: false
        });
        console.debug('### sendDiff ###\n', diffItem);
        this.diffStore.append(diffItem);
        this.diffStore.commit();
    };

    //this.sendDiffWithoutCommit = function (diff) {
    //    var diffItem = JSON.stringify({
    //        diff: diff,
    //        err: false
    //    });
    //    console.debug('### sendDiffWithoutCommit ###\n', diffItem);
    //    this.diffStore.append(diffItem);
    //};

    this.setDiffErr = function (pos) {
        console.debug('### setDiffErr ###');
        var diffErr = JSON.stringify({
            diff: '',
            err: true
        });
        this.diffStore.set(pos, diffErr);
        this.diffStore.commit();
    };

    /**
     * This function sends the information text (e.g. "is typing") via DSM
     * @param {string} info            information text
     */
    this.sendInfo = function (info) {
        this.infoChannel.set(info);
        this.infoChannel.commit();
    };

    /**
     * This function is called on the user action upon the gui to clear
     * all the message in DSM
     * @param {string} info            information text
     */
    this.clearMessageStore = function () {
        if (this.diffStore.size() > 0) {
            this.diffStore.clear();
            this.diffStore.commit();
        }
    };

    //var diffErrCallback = function () {
    //    console.debug('### diffErrCallback ###');
    //    var tmp = ContentStore.diffErrPosQueue.shift();
    //    if (typeof(tmp) != 'undefined')
    //        self.setDiffErr(tmp);
    //};
    //EE.on('setDiffErr', diffErrCallback);

};

module.exports = DSMConnection;