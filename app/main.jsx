var React = require('react');
var ReactDOM = require('react-dom');
var AppComponent = require('./AppComponent.jsx');
console.log('Loaded the app component! Hello World');

ReactDOM.render(<AppComponent/>, document.getElementById('main'));
// React.render(<AppComponent/>, document.getElementById('main'));
