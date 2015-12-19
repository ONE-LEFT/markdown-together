var React = require('react');
var ReactDOM = require('react-dom');
var T = React.PropTypes;
var marked = require('marked');
var cNames = require('classnames');
var JsDiff = require('diff');
var ContentStore = require('./ContentStore.jsx');
var EventEmitter = require('eventemitter3');
var EE = new EventEmitter();

require('./editor.less');
require('./markdown.less');



var fileName = 'test';

var MdEditor = React.createClass({
    dsmConnection: new DSMConnection(fileName || ''),
    propTypes: {
        content: T.string,
        children: T.node
    },
    getInitialState(){
        return {
            panelClass: 'md-panel',
            mode: 'split',
            isFullScreen: false,
            result: marked(ContentStore.content || ''),
            //content: ContentStore.content || '',
            fileName: fileName || ''
        }
    },
    contentChange(){
        ContentStore.patchDiff();
        this.textControl.value = ContentStore.content;
        this.state.result = marked(ContentStore.content);
        this.forceUpdate();
    },
    componentDidMount(){
        this.textControl = ReactDOM.findDOMNode(this.refs.editor);
        this.previewControl = ReactDOM.findDOMNode(this.refs.preview);
        EE.on('change', this.contentChange);
    },
    componentWillUnmount(){
        this.textControl = null;
        this.previewControl = null;
    },
    render(){
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
    isDirty () {
        return this._isDirty || false
    },
    getValue () {
        return this.state.content
    },
    // widgets constructors
    _getToolBar () {
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
    _getExternalBtn () {
        return React.Children.map(this.props.children, function (option) {
            if (option.type === 'option') {
                return <li className="tb-btn"><a {...option.props}>{option.props.children}</a></li>
            }
        })
    },
    _getModeBar () {
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
    _onChange (e) {
        this._isDirty = true; // set dirty
        if (this._ltr) clearTimeout(this._ltr);
        this._ltr = setTimeout(function () {
            //JsDiff.createPatch(fileName, oldStr, newStr, oldHeader, newHeader);
            this.dsmConnection.sendDiff(JsDiff.createPatch('Markdown' + this.state.fileName, ContentStore.content, this.textControl.value));
            //console.log(JsDiff.createPatch(this.state.fileName, ContentStore.content, this.textControl.value));
            //ContentStore.content = this.textControl.value;
            this.setState({
                result: marked(this.textControl.value)
            }); // change state
        }.bind(this), 500);
    },
    _changeMode (mode) {
        return function (e) {
            this.setState({mode});
        }.bind(this);
    },
    _toggleFullScreen (e) {
        this.setState({isFullScreen: !this.state.isFullScreen})
    },
    // default text processors
    _preInputText (text, preStart, preEnd) {
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
        this.setState({result: marked(this.textControl.value)}); // change state
    },
    _boldText () {
        this._preInputText("**加粗文字**", 2, 6);
    },
    _italicText () {
        this._preInputText("_斜体文字_", 1, 5);
    },
    _linkText () {
        this._preInputText("[链接文本](www.yourlink.com)", 1, 5);
    },
    _blockquoteText () {
        this._preInputText("> 引用", 2, 4);
    },
    _codeText () {
        this._preInputText("```\ncode block\n```", 4, 14);
    },
    _pictureText () {
        this._preInputText("![alt](www.yourlink.com)", 2, 5);
    },
    _listUlText () {
        this._preInputText("- 无序列表项0\n- 无序列表项1", 2, 8);
    },
    _listOlText () {
        this._preInputText("1. 有序列表项0\n2. 有序列表项1", 3, 9);
    },
    _headerText () {
        this._preInputText("## 标题", 3, 5);
    }
});

module.exports = MdEditor;