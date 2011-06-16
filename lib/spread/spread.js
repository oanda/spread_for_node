var util = require('util'),
    net = require('net'),
    EventEmitter = require('events').EventEmitter;

/*
    Class: SpreadToolkit
*/
/*
    Function: toInt

    Creates an integer out of the next 4 bytes.
    data[index] << 24) + (data[index + 1] << 16) + (data[index + 2] << 8) + (data[index + 3])

    Parameters:

        data  - The BUFFER containing the bytes to read.
        index - Offset into the buffer to start reading bytes from.

    Returns:

        The newly created integer.

    See Also:

        <fromInt>
*/
function toInt(data, index) {
    return ((data[index    ] << 24) | (data[index + 1] << 16) |
            (data[index + 2] << 8 ) | (data[index + 3]));
}

/*
    Function: fromInt

    Stores the byte representation of an integer into a BUFFER.

    Parameters:

        data  -
        index -
        int   -
*/
function fromInt(data, index, int) {
    data[index    ] = int >> 24;
    data[index + 1] = int >> 16;
    data[index + 2] = int >>  8;
    data[index + 3] = int;
}

/*
    Function: sameEndian
    Check if the int is the same Endian type as the local machine
*/
function sameEndian(i) {
    return (i & 0x80000080) === 0;
}

/*
    Function: flip
    Endian-flip the int
*/
function flip(i) {
    return (((i >> 24) & 0x000000ff) | ((i >>  8) & 0x0000ff00) |
            ((i <<  8) & 0x00ff0000) | ((i << 24) & 0xff000000));
}

/*
    Function: sendUsername
*/
function sendUsername(client, username) {

console.log("sendUsername(" + client + ", " + username + ")");

    var bytes = new Buffer(5 + username.length);
    var length = username.length;
    if (length > 32) length = 32;

    // Version
    bytes[0] = 4; // Major
    bytes[1] = 0; // Minor
    bytes[2] = 0; // Patch

    // Flags (Group and Priority)
    bytes[3] = 0;

    // Length of username
    bytes[4] = length;

    // Username
    bytes.write(username, 5, encoding='ascii');

    client.write(bytes);
}

/*
    Function: sendAuthentication
    Send our authentication choice
*/
function sendAuthentication(client) {
    var bytes = new Buffer(30 * 3);
    bytes.write("NULL", 0, encoding='ascii');
    for (var i = 4; i < (30 * 3); i++) {
        bytes[i] = 0;
    }
    client.write(bytes);
}

/*
    Function: joinGroup
*/
function joinGroup(client, groups) {

    var numberOfGroups = Array.isArray(groups) ? groups.length : 1;
    var bufferSize = 4 + 32 + 12 + (numberOfGroups * 32);
    var bytes = new Buffer(bufferSize);
    for (var i = 0; i < bufferSize; i++) {
        bytes[i] = 0;
    };
    var index = 0;

    // Service Type
    bytes[0] = 0;
    bytes[1] = 1;
    bytes[2] = 0;
    bytes[3] = 0;
    index += 4;

    // Private Group Name
    bytes.write(privateGroup, index, 'ascii');
    index += 32;

    // Number of groups
    fromInt(bytes, index, numberOfGroups);
    index += 4;

    // Message type
    fromInt(bytes, index, 0);
    index += 4;

    // Data length
    fromInt(bytes, index, 0);
    index += 4;

    // Group name
    if (Array.isArray(groups)) {
        for (var i = 0; i < groups.length; i++) {
            bytes.write(groups[i], index, 'ascii');
            index += 32;
        }
    }
    else {
        bytes.write(groups, index, 'ascii');
        index += 32;
    }

    client.write(bytes);
}

/*
    Function: _internalReceive
*/
function _internalReceive(client, data) {
    var index = 0;

    // Service Type
    var serviceType = toInt(data, index);
    index += 4;

    var sender = data.toString('ascii', index, index + 32);
    index += 32;

    var numberOfGroups = toInt(data, index);
    index += 4;

    var messageType = toInt(data, index);
    index += 4;

    var dataLength = toInt(data, index);
    index += 4;

    console.log("sameEndian: " + sameEndian(serviceType));
    if (!sameEndian(serviceType)) {
        serviceType = flip(serviceType);
        numberOfGroups = flip(numberOfGroups);
        dataLength = flip(dataLength);
    }

    var groups = new Array();
    console.log("groups: " + numberOfGroups);
    for (var i = 0; i < numberOfGroups; i++) {
        var group = data.toString('ascii', index, index + 32);
        index += 32;
        groups[groups.length] = group;
    }

    console.log("length: " + dataLength);
    if (dataLength > 0) {
        var payload = new Buffer(dataLength);
        data.copy(payload, 0, index);
        console.log(payload);

        console.log("emitting...: "+ client);
        client.emit('data', groups, payload);
    }
}

/*
    Constructor: SpreadToolkit
*/
var SpreadToolkit = function(options) {
    if (!(this instanceof SpreadToolkit)) {
        return new SpreadToolkit(options);
    }

    if (options === undefined) {
        throw "SpreadToolkit: options is undefined";
    } 
    else if (options.socket !== undefined) {
        this.socket = options.socket;
    }
    else {
        if (options.port === undefined) {
            throw "SpreadToolkit: port is undefined";
        }
        if (options.host === undefined) {
            throw "SpreadToolkit: host is undefined";
        }

        this.socket = new net.Socket();
        this.port = options.port;
        this.host = options.host;
    }
    if (options.user === undefined) {
        throw "SpreadToolkit: user is undefined";
    }
    if (options.groups === undefined) {
        throw "SpreadToolkit: groups is undefined";
    }

    this.groups = options.groups;
    this.user = options.user;
    this.connectionState = 0;

    this.socket.on('connect', function() {
        console.log("Connected: " + this.socket);

        sendUsername(this.socket, this.user);
    }.bind(this));

    this.socket.on('data', function(data) {
        switch(this.connectionState) {
        case 0:
            // Ignore incoming data
            // Send our Authentication choice
            sendAuthentication(this.socket);
            this.connectionState = 1;
            break;
        case 1:
            var accepted = data[0];
            if (accepted !== 1) {
                throw "Connection Not Accepted";
            }
            console.log("accepted");
            var majorVersion = data[1];
            var minorVersion = data[2];
            var patchVersion = data[3];
            console.log("v" + majorVersion + "." + minorVersion + "." + patchVersion);

            var len = data[4];
            privateGroup = data.toString('ascii', 5);
            console.log(privateGroup);

            // Join group(s)
            joinGroup(this.socket, this.groups);

            this.connectionState = 2;
            break;
        case 2:
            console.log("spread data");
            _internalReceive(this, data);
            break;
        default:
        }
    }.bind(this));
}

util.inherits(SpreadToolkit, EventEmitter);

/*
    Function: start
*/
SpreadToolkit.prototype.start = function(fn) {
    this.socket.connect(this.port, this.host, fn);
}

/*
    Function: stop
*/
SpreadToolkit.prototype.stop = function() {
    this.socket.end();
}

module.exports = SpreadToolkit;
