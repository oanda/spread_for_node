var net = require("net");
var assert = require('assert'),
    Gently = require('gently');

var spread = require('spread');

exports["test missing options"] = function() {
    assert.throws(function() {new spread.SpreadToolkit();},
                  function(err) {return err == "SpreadToolkit: options is undefined";});
}
exports["test socket provided"] = function() {
    assert.doesNotThrow(function() {new spread.SpreadToolkit({socket: net.Socket(),
      user: "User", groups: ["transactionStream"]})});
}
exports["test missing port"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      host: "host", user: "User", groups: ["transactionStream"]})},
                  function(err) {return err == "SpreadToolkit: port is undefined";});
}
exports["test missing host"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      port: 1234, user: "User", groups: ["transactionStream"]})},
                  function(err) {return err == "SpreadToolkit: host is undefined";});
}
exports["test missing user"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      port: 1234, host: "host", groups: ["transactionStream"]})},
                  function(err) {return err == "SpreadToolkit: user is undefined";});
}
exports["test missing groups"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      port: 1234, host: "host", user: "User"})},
                  function(err) {return err == "SpreadToolkit: groups is undefined";});
}
