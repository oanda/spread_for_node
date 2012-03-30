var net = require("net");
var assert = require('assert'),
    log4js = require('log4js'),
    util = require('util'),
    Gently = require('gently'),
    EventEmitter = require('events').EventEmitter;

var spread = require('spread');

log4js.configure({appenders: [{type: "console", layout: {type: "basic"}}]});
log4js.setGlobalLogLevel("ALL");

var logger = log4js.getLogger(__filename);

exports["test missing options"] = function() {
    assert.throws(function() {new spread.SpreadToolkit();},
                  function(err) {return err == "SpreadToolkit: options is undefined";});
};
//exports["test socket provided"] = function() {
//    assert.doesNotThrow(function() {new spread.SpreadToolkit({socket: net.Socket(),
//      user: "User", groups: ["transactionStream"]})});
//};
exports["test missing port"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      host: "host", user: "User", groups: ["transactionStream"]})},
                  function(err) {return err == "SpreadToolkit: port is undefined";});
};
exports["test missing host"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      port: 1234, user: "User", groups: ["transactionStream"]})},
                  function(err) {return err == "SpreadToolkit: host is undefined";});
};
exports["test missing user"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      port: 1234, host: "host", groups: ["transactionStream"]})},
                  function(err) {return err == "SpreadToolkit: user is undefined";});
};
exports["test missing groups"] = function() {
    assert.throws(function() {new spread.SpreadToolkit({
      port: 1234, host: "host", user: "User"})},
                  function(err) {return err == "SpreadToolkit: groups is undefined";});
};
/*
exports["test multiple messages in one chunk"] = function() {
    var MySocket = function() {};
    util.inherits(MySocket, EventEmitter);
    MySocket.prototype.write = function(data) {
        logger.debug("MySocket.write()");
    };

    var mySocket = new MySocket;
    var count = 0;

    var toolkit = new spread.SpreadToolkit({
        socket: mySocket,
        user: "testuser",
        groups: ["testgroup"]
    });
    toolkit.on("data", function(groups, data) {
    console.log(data);
        switch(count++) {
        case 0:
            assert.equal(data.length, 32);
            break;
        case 1:
            assert.equal(data.length, 40);
            break;
        default:
            assert.fail();
        }
    }.bind(this));

    // This is the on connection data
    var header = new Buffer(15)
    var privateGroup = "abcd";
    for (var i = 0; i < 6; i++)
        header[i] = 0;
    header[ 6] = 1; // accepted
    header[ 7] = 4; // major version
    header[ 8] = 1; // minor
    header[ 9] = 0; // patch
    header[10] = 4;
    header[11] = 65;
    header[12] = 65;
    header[13] = 65;
    header[14] = 65;

    mySocket.emit('data', header);

    // build a double message (make sure the two messages have different lengths)
    var len = 48 + 32 + 48 + 40;
    var buffer = new Buffer(len);
    // first. zero it out
    for (var i = 0; i < len; i++)
        buffer[i] = 0;
    // service type
    i = 0;
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 4;
    // sender
    for (var j = 0; j < 32; j++)
        buffer[i++] = 'a';
    // number of Groups
    i += 4;
    // message Type
    i += 4;
    // data Length
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 32;

    // First body
    for (j = 0; j < 32; j++)
        buffer[i++] = 'b';

    // service type
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 4;
    // sender
    for (var j = 0; j < 32; j++)
        buffer[i++] = 'a';
    // number of Groups
    i += 4;
    // message Type
    i += 4;
    // data Length
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 0;
    buffer[i++] = 40;
    // Second body
    for (j = 0; j < 40; j++)
        buffer[i++] = 'b';

    mySocket.emit('data', buffer);
};
*/
