// This method does not exist in 0.4
if (!Buffer.prototype.writeUInt32BE) {
    Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
        this[offset] = (value >>> 24) & 0xff;
        this[offset + 1] = (value >>> 16) & 0xff;
        this[offset + 2] = (value >>> 8) & 0xff;
        this[offset + 3] = value & 0xff;
    };
}
if (!Buffer.prototype.fill) {
    Buffer.prototype.fill = function fill(value, start, end) {
        for (var i = start; i < end; i++)
            this[i] = value;
    };
}

var World = function World(callback) {

    this.createPayload = function(length) {
        // build a double message (make sure the two messages have different lengths)
        var len = 48 + length;
        var buffer = new Buffer(len);

        var i = 0;

        // service type
        buffer.writeUInt32BE(4, i);
        i += 4;

        // sender
        buffer.fill(9, i, i + 32);
        i += 32;

        // number of Groups
        buffer.writeUInt32BE(0, i);
        i += 4;

        // message Type
        buffer.writeUInt32BE(0, i);
        i += 4;

        // data Length
        buffer.writeUInt32BE(length, i);
        i += 4;

        // Body
        buffer.fill(23, i, i + length);
        i += length;

        return buffer;
    };

    this.createMultiplePayloads = function(lengths) {

        var len = 0;
        for (var i = 0; i < lengths.length; i++) {
            len += 48 + lengths[i];
        }

        // build a double message (make sure the two messages have different lengths)
        var buffer = new Buffer(len);
        var offset = 0;

        for (var j = 0; j < lengths.length; j++) {
            // service type
            buffer.writeUInt32BE(4, offset);
            offset += 4;

            // sender
            buffer.fill(9, offset, offset + 32);
            offset += 32;

            // number of Groups
            buffer.writeUInt32BE(0, offset);
            offset += 4;

            // message Type
            buffer.writeUInt32BE(0, offset);
            offset += 4;

            // data Length
            buffer.writeUInt32BE(lengths[j], offset);
            offset += 4;

            // Body
            buffer.fill(23, offset, offset + lengths[j]);
            offset += lengths[j];
        }

        return buffer;
    };

    callback();
};

exports.World = World;
