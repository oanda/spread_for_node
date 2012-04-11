var log4js = require('log4js'),
    assert = require('assert');

var util = require('util'),
    events = require('events');

log4js.setGlobalLogLevel("OFF");

module.exports = function() {

    var socket;
    var MySocket = function() {
        socket = this;
    };
    util.inherits(MySocket, events.EventEmitter);
    MySocket.prototype.setTimeout = function(timeout, callback) { };
    MySocket.prototype.connect = function(port, host) {
        this.emit('connect');
    };
    MySocket.prototype.write = function(bytes) {
        console.log('write', bytes);
        var output;

        if (bytes.length === 9) {        // Username
            output = new Buffer(6);
            this.emit('data', output);
        } else if (bytes.length === 90) {        // Authourization
            output = new Buffer(5);
            this.emit('data', [1, 4, 1, 0, 0]);
        } else {
            console.log('length', bytes.length);
        }
    };


    var SpreadToolkit = require('../../lib/spread/').SpreadToolkit;
    var payloads = [];
    var toolkit;

    this.World = require('../support/world.js').World;

    this.Before(function(callback) {
        payloads = [];

        callback();
    });

    this.Given(/^a valid connection to a spread daemon$/, function(callback) {
        toolkit = new SpreadToolkit({
            host: "localhost",
            port: 0,
            groups: ["group"],
            user: "user",
            Socket: MySocket
        });
        toolkit.on('data', function(groups, data) {
            payloads.push({groups: groups, payload: data});
        });

        toolkit.start(function(flag) {
            console.log('start', flag);

            if (!flag)
                callback.fail();

            callback();
        });
    });

    this.When(/^a chunk arrives containing one complete payload$/, function(callback) {
        socket.emit('data', this.createPayload(16));

        callback();
    });

    this.Then(/^a single payload event is fired$/, function(callback) {
        assert.equal(payloads.length, 1);

        callback();
    });

    this.When(/^a chunk arrives containing multiple complete payloads$/, function(callback) {
        socket.emit('data', this.createMultiplePayloads([16, 24, 8]));

        callback();
    });

    this.Then(/^multiple payload events are fired$/, function(callback) {
        assert.equal(payloads.length, 3);

        callback();
    });
};
