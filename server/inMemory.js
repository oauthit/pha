module.exports = new InMemoryData();

function InMemoryData() {
  var data = {};

  this.get = function (phoneNumber, callback) {
    var args = Array.prototype.slice.call(arguments);

    if (args.length === 2) {
      if (data.hasOwnProperty(phoneNumber)) {
        callback.apply(null, [null, data[phoneNumber]]);
      } else {
        callback.apply(null, [null]);
      }
    } else {
      if (data.hasOwnProperty(phoneNumber)) {
        return data[phoneNumber];
      } else {
        return null;
      }
    }
  };

  this.set = function (phoneNumber, regData, callback) {
    var args = Array.prototype.slice.call(arguments);

    if (args.length === 3) {
      if (phoneNumber) {
        data[phoneNumber] = regData;
        callback.apply(null, [null]);
      } else {
        callback.apply(null, [null]);
      }
    } else if (phoneNumber) {
      data[phoneNumber] = regData;
      return data[phoneNumber];
    } else {
      return null;
    }
  };

  this.del = function (phoneNumber, callback) {
    if (data[phoneNumber]) {
      delete data[phoneNumber];
      callback.apply(null, [null]);
    } else {
      callback.apply(null, [null])
    }
  }
}
