var React = require('react');
var Editor = require('./Editor.jsx');

var AppComponent = React.createClass({
    render: function () {
        return (
            <div className="container">
                <Editor/>
            </div>
        );
    },
    //<option title="自定义按钮" onClick={this._handleClick}><i className="fa fa-bomb"></i></option>
    _handleClick: function () {
        /* eslint-disable no-alert */
        alert('这个是自定义按钮');
        /* eslint-enable no-alert */
    }
});

module.exports = AppComponent;