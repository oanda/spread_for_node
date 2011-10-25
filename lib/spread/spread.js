var util = require('util'),
    net = require('net'),
    EventEmitter = require('events').EventEmitter;

var logger = require('log4js')().getLogger('SpreadToolkit');
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
function clearEndian(i) {
    return (i & ~0x80000080);
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

    logger.debug("sendUsername(" + client + ", " + username + ")");

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
    }
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
        for (var j = 0; j < groups.length; j++) {
            bytes.write(groups[j], index, 'ascii');
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
    Constructor: SpreadToolkit
*/
var SpreadToolkit = function(options) {
    if (!(this instanceof SpreadToolkit)) {
        return new SpreadToolkit(options);
    }

    if (options === undefined) {
        throw "SpreadToolkit: options is undefined";
    } 
//    else if (options.socket !== undefined) {
//        this.socket = options.socket;
//    }
    else {
        if (options.port === undefined) {
            throw "SpreadToolkit: port is undefined";
        }
        if (options.host === undefined) {
            throw "SpreadToolkit: host is undefined";
        }

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
}
util.inherits(SpreadToolkit, EventEmitter);

SpreadToolkit.prototype._setup = function() {
    this.socket = new net.Socket();

    this.headerLength = 6;
    this.headerBytes = new Buffer(this.headerLength);
    this.headerOffset = 0;

    this.authLength = 5;
    this.authBytes = new Buffer(this.authLength);
    this.authOffset = 0;

    this.privateGroupLength = 0;
    this.privateGroupBytes = {};
    this.privateGroupOffset = 0;

    this.spreadHeaderLength = 48;
    this.spreadHeaderBytes = new Buffer(this.spreadHeaderLength);
    this.spreadHeaderOffset = 0;

    this.spreadGroupsLength = 0;
    this.spreadGroupsOffset = 0;
    this.spreadGroupsBytes = {};
    this.spreadGroups = [];

    this.spreadDataLength = 0;
    this.spreadDataOffset = 0;
    this.spreadDataBytes = {};

    this.serviceType;

    this.socket.on('connect', function() {
        logger.info("Connected: " + this.socket);

        sendUsername(this.socket, this.user);
    }.bind(this));

    this.socket.on('error', function(exception) {
        logger.error(exception)
    });

    this.socket.on('data', function(data) {
        logger.trace("------------- got data: " + data.length + " bytes");
//        logger.trace(util.inspect(data));
        for (var i = 0; i < data.length; i++) {
            if (this.headerOffset < this.headerLength) {
                this.headerBytes[this.headerOffset++] = data[i];

                if (this.headerOffset === this.headerLength) {
                    // Ignore incoming data
                    // Send our Authentication choice
                    sendAuthentication(this.socket);
                }
            }
            else if (this.authOffset < this.authLength) {
                this.authBytes[this.authOffset++] = data[i];

                if (this.authOffset === this.authLength) {
                    var accepted = this.authBytes[0];
                    if (accepted !== 1) {
                        throw "Connection Not Accepted";
                    }
                    logger.debug("accepted");
                    var majorVersion = this.authBytes[1];
                    var minorVersion = this.authBytes[2];
                    var patchVersion = this.authBytes[3];
                    logger.debug("v" + majorVersion + "." + minorVersion + "." + patchVersion);

                    this.privateGroupOffset = 0;
                    this.privateGroupLength = this.authBytes[4];
                    this.privateGroupBytes = new Buffer(this.privateGroupLength);

                    this.emit('accepted');
                }
            }
            else if (this.privateGroupOffset < this.privateGroupLength) {
                this.privateGroupBytes[this.privateGroupOffset++] = data[i];

                if (this.privateGroupOffset === this.privateGroupLength) {
                    privateGroup = this.privateGroupBytes.toString('ascii');
                    logger.debug(privateGroup);

                    // Join group(s)
                    // Joining multiple groups at once does NOT work
                    // So, join each group one at a time
                    for (var x in this.groups) {
                        joinGroup(this.socket, this.groups[x]);
                    }
                }
            }
            else if (this.spreadHeaderOffset < this.spreadHeaderLength) {
                this.spreadHeaderBytes[this.spreadHeaderOffset++] = data[i];

                if (this.spreadHeaderOffset === this.spreadHeaderLength) {
                    var index = 0;

                    // Service Type
                    this.serviceType = toInt(this.spreadHeaderBytes, index);
                    index += 4;

                    var sender = this.spreadHeaderBytes.toString('ascii', index, index + 32);
                    index += 32;

                    var numberOfGroups = toInt(this.spreadHeaderBytes, index);
                    index += 4;

                    var messageType = toInt(this.spreadHeaderBytes, index);
                    index += 4;

                    var dataLength = toInt(this.spreadHeaderBytes, index);
                    index += 4;

                    logger.debug("sameEndian: " + sameEndian(this.serviceType));
                    if (!sameEndian(this.serviceType)) {
                        this.serviceType = clearEndian(flip(this.serviceType));
                        numberOfGroups = flip(numberOfGroups);
                        dataLength = flip(dataLength);
                    }

                    logger.trace('service type: ' + this.serviceType);
                    logger.trace('sender: ' + sender);
                    logger.trace('number of groups: ' + numberOfGroups);
                    logger.trace('message type: ' + messageType);
                    logger.trace('data length: ' + dataLength);

                    logger.debug("groups: " + numberOfGroups + ", length: " + dataLength);

                    if (this.serviceType != 4) {
                        // Discard this entire chunk
                        logger.error("unsupported service type: " + this.serviceType);
                    }

                    this.spreadGroupsOffset = 0;
                    this.spreadGroupsLength = 32 * numberOfGroups;
                    this.spreadGroupsBytes = new Buffer(this.spreadGroupsLength);

                    this.spreadDataOffset = 0;
                    this.spreadDataLength = dataLength;
                    this.spreadDataBytes = new Buffer(this.spreadDataLength);
                }
            }
            else if (this.spreadGroupsOffset < this.spreadGroupsLength) {
                this.spreadGroupsBytes[this.spreadGroupsOffset++] = data[i];

                if (this.spreadGroupsOffset === this.spreadGroupsLength) {
                    this.spreadGroups = [];
                    for (var index = 0; index < this.spreadGroupsLength; index += 32) {
                        var group = this.spreadGroupsBytes.toString('ascii', index, index + 32);
                        logger.trace("read group: " + group);
                        this.spreadGroups[this.spreadGroups.length] = group;
                    }
                }
            }
            else if (this.spreadDataOffset < this.spreadDataLength) {
                this.spreadDataBytes[this.spreadDataOffset++] = data[i];

                if (this.spreadDataOffset === this.spreadDataLength) {

                    if (this.serviceType == 4) {
                        logger.debug("emitting...");
                        this.emit('data', this.spreadGroups, this.spreadDataBytes);
                    } else {
                        logger.debug("skipping unsupported service type");
                    }

                    this.spreadHeaderOffset = 0;
                    this.spreadHeaderBytes = new Buffer(this.spreadHeaderLength);
                }
            }
        }
    }.bind(this));
}

/*
    Function: start
*/
SpreadToolkit.prototype.start = function(fn) {

    this._setup();

    this.accepted = false;
    this.removeAllListeners('accepted');

    this.once('accepted', function() {
        this.accepted = true;
        fn(true);
    }.bind(this));
    this.socket.once('close', function(had_error) {
        if (!this.accepted) {
            // only call the callback if we close before our login is accepted
            fn(false);
        } else {
            logger.debug('close(' + had_error + ')');
            this.emit('close', had_error);
        }
    }.bind(this));

    this.socket.connect(this.port, this.host);
};

/*
    Function: stop
*/
SpreadToolkit.prototype.stop = function() {
    this.socket.end();
};

module.exports = SpreadToolkit;
