var EventEmitter = require('eventemitter3');
var EE = new EventEmitter();
var JsDiff = require('diff');

var ContentStore = {
    fileName: '',
    content: '',
    diffQueue: [],
    diffHistory: [],
    patchDiff: function () {
        var tmp;
        while (tmp = this.diffQueue.shift()) {
            //console.log(tmp);
            var result = JsDiff.applyPatch(this.content, tmp);
            if (result) {
                this.content = result;
            } else {
                console.error(
                    '### patchDiff ERROR ###',
                    '\n### source ###\n',
                    this.content,
                    '\n### patch ###\n' +
                    tmp
                );
            }
        }
        console.debug('### patchDiff result ###\n', this.content);
    },
    updateContent: function (newContent) {
        var diff = JsDiff.createPatch(this.fileName, this.content, newContent);
        if (diff) this.content = newContent;
        return diff;
    }
    //setContent: function (content) {
    //    this.content = content;
    //    console.log('setContent:', content);
    //    EventEmitter.emit('change');
    //},
    //updateContent: function (diff) {
    //    var result = JsDiff.applyPatch(this.content, diff);
    //    console.log('updateContent:', result);
    //    if (result) {
    //        content = result;
    //        EE.emit('change');
    //    }
    //}
};


module.exports = ContentStore;