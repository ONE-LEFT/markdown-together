var EventEmitter = require('eventemitter3');
var EE = new EventEmitter();
var JsDiff = require('diff');

var ContentStore = {
    content: '',
    diffQueue: [],
    patchDiff: function () {
        var tmp;
        while (tmp = this.diffQueue.shift()) {
            console.log(tmp);
            var result = JsDiff.applyPatch(this.content, tmp);
            if (result)
                this.content = result;
        }
        //this.content = JsDiff.applyPatch('','Index: test\n===================================================================\n--- test\n+++ test\n@@ -1,0 +1,4 @@\n\\ No newline at end of file\n+Hello WOl\n+dsf\n+sdfakljlkajfd ds al\n+ WOrld\n');
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