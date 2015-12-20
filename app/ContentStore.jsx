var EE = require('./EventEmitter.jsx');
var JsDiff = require('diff');

var ContentStore = {
    fileName: '',
    content: '',
    pos: 0,
    diffQueue: [],
    diffHistory: [],
    diffErrPosQueue: [],
    patchDiff: function () {
        var tmp;
        while (tmp = this.diffQueue.shift()) {
            if (tmp && tmp.item && tmp.item.diff && !tmp.item.err) {
                console.debug('patchDiff pos:', tmp.pos);
                var result = JsDiff.applyPatch(this.content, tmp.item.diff);
                if (result) {
                    this.content = result;
                } else {
                    console.error(
                        '### patchDiff ERROR ###',
                        '\n### source ###\n',
                        this.content,
                        '\n### patch ###\n' +
                        tmp.item.diff
                    );
                    // SET DIFF ERR
                    //this.diffErrPosQueue.push(tmp.pos);
                    //EE.emit('setDiffErr');
                }
            }
        }
        console.debug('### patchDiff result ###\n', this.content);
    },
    generateDiff: function (newContent) {
        var diff = JsDiff.createPatch(this.fileName, this.content, newContent);
        if (diff) {
            // try diff
            var result = JsDiff.applyPatch(this.content, diff);
            if (result) {
                console.debug(
                    '### updateContent Success ###',
                    '\n### newContent ###\n',
                    newContent,
                    '\n### this.content ###\n',
                    this.content
                );
            } else {
                console.error(
                    '### updateContent TRY DIFF ERROR ###',
                    '\n### newContent ###\n',
                    newContent
                );
                diff = null;
            }
        } else {
            console.error(
                '### updateContent ERROR ###',
                '\n### newContent ###\n',
                newContent
            );
        }
        return diff;
    },
    updateContent: function (diff) {
        var result = JsDiff.applyPatch(this.content, diff);
        if (result) {
            this.content = result;
        }
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