(function() {

  var MSB = 0x80
      , REST = 0x7F
      , MSBALL = ~REST
      , INT = Math.pow(2, 31);

  var _ = require("underscore");
  var f = require("./functional");

  // TODO: Deal with numbers larger than INT

  exports.encodeUByte = doEncodeUByte;
  exports.encodeVInt = doEncodeVInt;
  exports.encodeVLong = doEncodeVLong;

  exports.mEncodeUByte = f.lift(doEncodeUByte, _.identity);
  exports.mEncodeVInt = f.lift(doEncodeVInt, _.identity);
  exports.mEncodeVLong = f.lift(doEncodeVLong, _.identity);
  exports.mEncodeObject = f.lift(doEncodeObject, _.identity);

  function doEncodeUByte(bytebuf, num) {
    return _.compose(updateEncOffset(bytebuf), checkedWriteUByte(bytebuf))(num);
  }

  function doEncodeVInt(bytebuf, num) {
    return _.compose(updateEncOffset(bytebuf), checkedWriteVInt(bytebuf))(num);
  }

  function doEncodeVLong(bytebuf, num) {
    return _.compose(updateEncOffset(bytebuf), checkedWriteVLong(bytebuf))(num);
  }

  function doEncodeObject(bytebuf, num) {
    return _.compose(updateEncOffset(bytebuf), checkedWriteObject(bytebuf))(num);
  }

  var nullCheck = f.validator("must not be null", f.existy);
  var number = f.validator("must be a number", _.isNumber);
  var positiveOrZero = f.validator("must be >= 0", f.greaterThan(-1));
  var intTooBig = f.validator("must be less than 2^31", f.lessThan(Math.pow(2, 31)));
  var longTooBig = f.validator("must be less than 2^53 (javascript safe integer limitation)",
                               f.lessThan(Math.pow(2, 53)));

  function checkedWriteUByte(bytebuf) {
    return f.partial1(f.condition1(number, positiveOrZero), uncheckedWriteUByte(bytebuf));
  }

  function checkedWriteVInt(bytebuf) {
    return f.partial1(f.condition1(number, positiveOrZero, intTooBig), uncheckedWriteVNum(bytebuf));
  }

  function checkedWriteVLong(bytebuf) {
    return f.partial1(f.condition1(number, positiveOrZero, longTooBig), uncheckedWriteVNum(bytebuf));
  }

  function checkedWriteObject(bytebuf) {
    return f.partial1(f.condition1(nullCheck), uncheckedWriteObject(bytebuf));
  }

  function updateEncOffset(bytebuf) {
    return function(offset) {
      bytebuf.offset = offset;
      return offset;
    }
  }

  function uncheckedWriteUByte(bytebuf) {
    return function(byte) {
      return bytebuf.buf.writeUInt8(byte, bytebuf.offset);
    }
  }

  function uncheckedWriteVNum(bytebuf) {
    return function(num) {
      var localOffset = bytebuf.offset;

      while(num >= INT) {
        bytebuf.buf.writeUInt8((num & 0xFF) | MSB, localOffset++);
        num /= 128
      }
      while(num & MSBALL) {
        bytebuf.buf.writeUInt8((num & 0xFF) | MSB, localOffset++);
        num >>>= 7
      }
      bytebuf.buf.writeUInt8(num | 0, localOffset);

      return localOffset + 1;
    }
  }

  function uncheckedWriteObject(bytebuf) {
    return function(obj) {
      if (_.isString(obj)) {
        var stringNumBytes = Buffer.byteLength(obj);
        var offsetAfterBytes = uncheckedWriteVNum(bytebuf)(stringNumBytes);
        return bytebuf.buf.write(obj, offsetAfterBytes) + offsetAfterBytes;
      } else {
        throw new Error("Can't handle yet");
      }
    }
  }

  exports.decodeUByte = doDecodeUByte;
  exports.decodeVInt = doDecodeVInt;
  exports.decodeVLong = doDecodeVLong;
  exports.decodeObject = doDecodeObject;

  exports.mDecodeUByte = f.lift(doDecodeUByte, _.identity);
  exports.mDecodeVInt = f.lift(doDecodeVInt, _.identity);
  exports.mDecodeVLong = f.lift(doDecodeVLong, _.identity);
  exports.mDecodeObject = f.lift(doDecodeObject, _.identity);

  function doDecodeUByte(bytebuf) {
    return uncheckedReadUByte(bytebuf)();
  }

  function doDecodeVInt(bytebuf) {
    return uncheckedReadVNum(bytebuf)();
  }

  function doDecodeVLong(bytebuf) {
    return uncheckedReadVNum(bytebuf)();
  }

  function doDecodeObject(bytebuf) {
    return uncheckedReadObject(bytebuf)();
  }

  function uncheckedReadUByte(bytebuf) {
    return function() {
      return bytebuf.buf.readUInt8(bytebuf.offset++);
    }
  }

  function uncheckedReadVNum(bytebuf) {
    return function() {
      var res = 0, shift  = 0, b;

      do {
        b = bytebuf.buf.readUInt8(bytebuf.offset++);
        res += shift < 28
            ? (b & REST) << shift
            : (b & REST) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB);

      return res
    }
  }

  function uncheckedReadObject(bytebuf) {
    return function() {
      var numBytes = uncheckedReadVNum(bytebuf)();
      var obj = bytebuf.buf.toString(undefined, bytebuf.offset, bytebuf.offset + numBytes);
      bytebuf.offset = bytebuf.offset + numBytes;
      return obj;
    }
  }

}.call(this));