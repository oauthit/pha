module.exports = InMemoryData;

function InMemoryData() {
  this.data = {};
}

InMemoryData.prototype.get = function (phoneNumber, callback) {
  var args = Array.prototype.slice.call(arguments);

  if (args.length === 2) {
    if (this.data.hasOwnProperty(phoneNumber)) {
      callback.apply(null, [null, this.data[phoneNumber]]);
    } else {
      callback.apply(null, [null]);
    }
  } else {
    if (this.data.hasOwnProperty(phoneNumber)) {
      return this.data[phoneNumber];
    } else {
      return null;
    }
  }
};

InMemoryData.prototype.set = function (phoneNumber, regData, callback) {
  var args = Array.prototype.slice.call(arguments);

  if (args.length === 3) {
    if (phoneNumber) {
      this.data[phoneNumber] = regData;
      callback.apply(null, [null]);
    } else {
      callback.apply(null, [null]);
    }
  } else if (phoneNumber) {
    this.data[phoneNumber] = regData;
    return this.data[phoneNumber];
  } else {
    return null;
  }
};

InMemoryData.prototype.del = function (phoneNumber, callback) {
  if (this.data[phoneNumber]) {
    delete this.data[phoneNumber];
    callback.apply(null, [null]);
  } else {
    callback.apply(null, [null])
  }
};
