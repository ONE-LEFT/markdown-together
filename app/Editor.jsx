var React = require('react');
var ReactDOM = require('react-dom');
var T = React.PropTypes;
var marked = require('marked');
var cNames = require('classnames');
var ContentStore = require('./ContentStore.jsx');
var EE = require('./EventEmitter.jsx');
var DSMConnection = require('./DSMConnection.jsx');
var JsDiff = require('diff');

require('./editor.less');
require('./markdown.less');


var sendInterval = 600;

var GetQueryString = function (name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null)return unescape(r[2]);
    return null;
};

//var fileName = 'Markdown' + 'test21';
var fileName = GetQueryString('fileName') ? 'Markdown' + GetQueryString('fileName') : 'MarkdownDefault';
var author = GetQueryString('author') ? GetQueryString('author') : 'author';

var MdEditor = React.createClass({
    dsmConnection: null,
    propTypes: {
        content: T.string,
        children: T.node
    },
    getInitialState: function () {
        return {
            panelClass: 'md-panel',
            mode: 'split',
            isFullScreen: false,
            result: ''
            //result: marked(ContentStore.content || ''),
            //content: ContentStore.content || '',
            //fileName: fileName || 'Markdown'
        }
    },
    doPatch: function () {
        while (this.dsmConnection.position < this.dsmConnection.diffStore.size()) {
            // TODO check whether diff exist err
            console.debug('### doPatch PATCH pos ###:', this.dsmConnection.position);
            try {
                var item = JSON.parse(this.dsmConnection.diffStore.get(this.dsmConnection.position));
                // TODO check fuzzFactor
                var result = JsDiff.applyPatch(this.dsmConnection.content, item.diff, {fuzzFactor: 3});
                console.debug('### doPatch applyPatch diff ###\n### diff file ###\n', item.diff);
                if (result) {
                    this.dsmConnection.content = result;
                } else {
                    // TODO set diff err
                    console.error(
                        '### doPatch PATCH ERROR ###',
                        '\n### src file ###\n',
                        this.dsmConnection.content,
                        '\n### diff file ###\n',
                        item.diff);
                }
            } catch (err) {
                console.error('### doPatch ERROR ###\n', err);
            }
            this.dsmConnection.position += 1;
        }
        this.dsmConnection.onPatching = false;
    },
    setSelection: function (originText, selectionStart, selectionEnd) {
        // Init Selection
        //selectionStart = this.textControl.selectionStart;
        //selectionEnd = this.textControl.selectionEnd;

        var stringStart = originText.substr(0, selectionStart);
        var stringEnd = originText.substr(selectionEnd, originText.length);
        var patchedContent = this.dsmConnection.content;
        var indexStart = patchedContent.indexOf(stringStart);
        var indexEnd = patchedContent.indexOf(stringEnd);
        var offset = NaN;
        if (indexStart != -1) {
            offset = selectionStart - (indexStart + stringStart.length);
        } else if (indexEnd != -1) {
            offset = indexEnd - selectionEnd;
        }
        console.debug('### selectionStart ###\n', selectionStart, '\n### selectionEnd ###\n', selectionEnd);
        console.debug('### stringStart ###\n', stringStart, '\n### indexStart ###\n', indexStart);
        console.debug('### stringEnd ###\n', stringEnd, '\n### indexEnd ###\n', indexEnd);
        console.debug('### result (offset,selectionStart,selectionEnd) ###\n', offset, selectionStart + offset, selectionEnd + offset);
        if (!isNaN(offset)) {
            console.debug('### result stringStart ###\n', patchedContent.substr(0, selectionStart + offset), '\n### result stringEnd ###\n', patchedContent.substr(selectionEnd + offset, patchedContent.length));
            this.textControl.setSelectionRange(selectionStart + offset, selectionEnd + offset);
        }
    },
    contentRemoteChange: function () {
        console.debug('### contentRemoteChange ###');

        // Clear _remoteChangeTimer
        //if (this._remoteChangeTimer) clearTimeout(this._remoteChangeTimer);
        // Set _remoteChangeTimer
        //if (this._changeTimer) {
        //this._remoteChangeTimer = setTimeout(this.contentRemoteChange, sendInterval / 2);
        //return;
        //}
        var originText = this.textControl.value;
        var selectionStart = this.textControl.selectionStart;
        var selectionEnd = this.textControl.selectionEnd;
        var diff;
        // PRE DIFF LOCAL CHANGE
        if (this.textControl.value != this.dsmConnection.content) {
            diff = JsDiff.createPatch(fileName, this.dsmConnection.content, this.textControl.value);
            console.debug('### contentRemoteChange createLocalPatch diff ###\n### diff file ###\n', diff);
            if (!diff) {
                this.textControl.value = this.dsmConnection.content;
            }
        }

        this.doPatch();

        // RESTORE LOCAL CHANGE
        var textControlResult;
        if (diff) {
            // TODO check fuzzFactor
            textControlResult = JsDiff.applyPatch(this.dsmConnection.content, diff, {fuzzFactor: 3});
            if (textControlResult)
                console.debug('### contentRemoteChange applyLocalPatch ###\n### result ###\n', textControlResult);
            else
                console.error('### contentRemoteChange applyLocalPatch error ###\n### result ###\n', textControlResult);
        }
        if (textControlResult) {
            this.textControl.value = textControlResult;
            this._onChange();
        } else {
            this.textControl.value = this.dsmConnection.content;
        }
        console.debug('### contentRemoteChange result ###\n', this.textControl.value);
        this.setSelection(originText, selectionStart, selectionEnd);
        this.setState({result: marked(this.textControl.value)});

        // Set _remoteChangeTimer null
        //this._remoteChangeTimer = null;
    },
    componentDidMount: function () {
        console.debug('### componentDidMount ###');
        this.textControl = ReactDOM.findDOMNode(this.refs.editor);
        this.previewControl = ReactDOM.findDOMNode(this.refs.preview);

        EE.on('change', this.contentRemoteChange);
        this.dsmConnection = new DSMConnection(fileName);
    },
    componentWillUnmount: function () {
        this.textControl = null;
        this.previewControl = null;
    },
    render: function () {
        var panelClass = cNames(['md-panel', {'fullscreen': this.state.isFullScreen}]);
        var editorClass = cNames(['md-editor', {'expand': this.state.mode === 'edit'}]);
        var previewClass = cNames(['md-preview', 'markdown', {
            'expand': this.state.mode === 'preview',
            'shrink': this.state.mode === 'edit'
        }]);
        return (
            <div className={panelClass}>
                <div className="md-menubar">
                    {this._getModeBar()}
                    {this._getToolBar()}
                </div>
                <div className={editorClass}>
                    <textarea ref="editor" name="content"
                              onChange={this._onChange}/>{/* style={{height: this.state.editorHeight + 'px'}} */}
                </div>
                <div className={previewClass} ref="preview">
                    <div className="md-preview-html"
                         dangerouslySetInnerHTML={{__html:marked(this.state.result)}}></div>
                </div>
                <div className="md-spliter"></div>
            </div>
        )
    },
    // public methods
    isDirty: function () {
        return this._isDirty || false
    },
    getValue: function () {
        return this.state.content
    },
    // widgets constructors
    _getToolBar: function () {
        return (
            <ul className="md-toolbar clearfix">
                <li className="tb-btn"><a title="加粗" onClick={this._boldText}><i className="fa fa-bold"/></a></li>
                {/* bold */}
                <li className="tb-btn"><a title="斜体" onClick={this._italicText}><i className="fa fa-italic"/></a></li>
                {/* italic */}
                <li className="tb-btn spliter"/>
                <li className="tb-btn"><a title="链接" onClick={this._linkText}><i className="fa fa-link"/></a></li>
                {/* link */}
                <li className="tb-btn"><a title="引用" onClick={this._blockquoteText}><i className="fa fa-outdent"/></a>
                </li>
                {/* blockquote */}
                <li className="tb-btn"><a title="代码段" onClick={this._codeText}><i className="fa fa-code"/></a></li>
                {/* code */}
                <li className="tb-btn"><a title="图片" onClick={this._pictureText}><i className="fa fa-picture-o"/></a>
                </li>
                {/* picture-o */}
                <li className="tb-btn spliter"/>
                <li className="tb-btn"><a title="有序列表" onClick={this._listOlText}><i className="fa fa-list-ol"/></a>
                </li>
                {/* list-ol */}
                <li className="tb-btn"><a title="无序列表" onClick={this._listUlText}><i className="fa fa-list-ul"/></a>
                </li>
                {/* list-ul */}
                <li className="tb-btn"><a title="标题" onClick={this._headerText}><i className="fa fa-header"/></a></li>
                {/* header */}
                {this._getExternalBtn()}
            </ul>
        )
    },
    _getExternalBtn: function () {
        return React.Children.map(this.props.children, function (option) {
            if (option.type === 'option') {
                return <li className="tb-btn"><a {...option.props}>{option.props.children}</a></li>
            }
        })
    },
    _getModeBar: function () {
        var previewActive = cNames({active: this.state.mode === 'preview'});
        var splitActive = cNames({active: this.state.mode === 'split'});
        var editActive = cNames({active: this.state.mode === 'edit'});

        return (
            <ul className="md-modebar">
                <li className="tb-btn pull-right">
                    <a className={previewActive} onClick={this._changeMode('preview')} title="预览模式">
                        <i className="fa fa-eye"/>
                    </a>
                </li>
                { /* preview mode */ }
                <li className="tb-btn pull-right">
                    <a className={splitActive} onClick={this._changeMode('split')} title="分屏模式">
                        <i className="fa fa-columns"/>
                    </a>
                </li>
                { /* split mode */ }
                <li className="tb-btn pull-right">
                    <a className={editActive} onClick={this._changeMode('edit')} title="编辑模式">
                        <i className="fa fa-pencil"/>
                    </a>
                </li>
                { /* edit mode */ }
                <li className="tb-btn spliter pull-right"/>
                <li className="tb-btn pull-right"><a title="全屏模式" onClick={this._toggleFullScreen}><i
                    className="fa fa-arrows-alt"/></a></li>
                {/* full-screen */}
            </ul>
        )
    },
    // event handlers
    _onChange: function (e) {
        console.debug('### _onChange ###\n');
        if (this._changeTimer) clearTimeout(this._changeTimer);
        var doChange = function () {
            var originText = this.textControl.value;
            var selectionStart = this.textControl.selectionStart;
            var selectionEnd = this.textControl.selectionEnd;
            var diff = JsDiff.createPatch(fileName, this.dsmConnection.content, this.textControl.value);
            console.debug('### _onChange createPatch diff ###\n', diff);
            this.dsmConnection.sendDiff(diff, author);
            this.doPatch();
            this.textControl.value = this.dsmConnection.content;
            this.setSelection(originText, selectionStart, selectionEnd);
            this.setState({result: marked(this.textControl.value)});
            this._changeTimer = null;
        }.bind(this);
        if (!this.dsmConnection.onPatching) this.dsmConnection.onPatching = true;
        this._changeTimer = setTimeout(doChange, sendInterval);
        this.setState({result: marked(this.textControl.value)});
    },
    _changeMode: function (mode) {
        return function (e) {
            this.setState({mode: mode});
        }.bind(this);
    },
    _toggleFullScreen: function (e) {
        this.setState({isFullScreen: !this.state.isFullScreen})
    },
    // default text processors
    _preInputText: function (text, preStart, preEnd) {
        var start = this.textControl.selectionStart;
        var end = this.textControl.selectionEnd;
        var origin = this.textControl.value;
        if (start !== end) {
            var exist = origin.slice(start, end);
            text = text.slice(0, preStart) + exist + text.slice(preEnd);
            preEnd = preStart + exist.length;
        }
        this.textControl.value = origin.slice(0, start) + text + origin.slice(end);
        // pre-select
        this.textControl.setSelectionRange(start + preStart, start + preEnd);
        //this.setState({result: marked(this.textControl.value)}); // change state
        this._onChange();
    },
    _boldText: function () {
        this._preInputText("**加粗文字**", 2, 6);
    },
    _italicText: function () {
        this._preInputText("_斜体文字_", 1, 5);
    },
    _linkText: function () {
        this._preInputText("[链接文本](www.yourlink.com)", 1, 5);
    },
    _blockquoteText: function () {
        this._preInputText("> 引用", 2, 4);
    },
    _codeText: function () {
        this._preInputText("```\ncode block\n```", 4, 14);
    },
    _pictureText: function () {
        this._preInputText("![alt](www.yourlink.com)", 2, 5);
    },
    _listUlText: function () {
        this._preInputText("- 无序列表项0\n- 无序列表项1", 2, 8);
    },
    _listOlText: function () {
        this._preInputText("1. 有序列表项0\n2. 有序列表项1", 3, 9);
    },
    _headerText: function () {
        this._preInputText("## 标题", 3, 5);
    }
});

module.exports = MdEditor;