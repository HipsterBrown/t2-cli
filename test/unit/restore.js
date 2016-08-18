// Test dependencies are required and exposed in common/bootstrap.js
require('../common/bootstrap');

exports['Tessel.prototype.restore'] = {
  setUp(done) {
    this.sandbox = sinon.sandbox.create();
    this.spinnerStart = this.sandbox.stub(log.spinner, 'start');
    this.spinnerStop = this.sandbox.stub(log.spinner, 'stop');
    this.warn = this.sandbox.stub(log, 'warn');
    this.info = this.sandbox.stub(log, 'info');
    this.images = {
      uboot: new Buffer('uboot'),
      squashfs: new Buffer('squashfs'),
    };
    this.status = this.sandbox.stub(restore, 'status', () => Promise.resolve(0));
    this.fetchRestore = this.sandbox.stub(updates, 'fetchRestore', () => {
      return Promise.resolve(this.images);
    });
    this.restore = this.sandbox.spy(Tessel.prototype, 'restore');
    this.tessel = TesselSimulator();

    done();
  },

  tearDown(done) {
    this.tessel.mockClose();
    this.sandbox.restore();
    done();
  },

  restoreWithValidateDeviceId(test) {
    test.expect(2);

    this.validateDeviceId = this.sandbox.stub(restore, 'validateDeviceId', () => Promise.resolve());
    this.transaction = this.sandbox.stub(restore, 'transaction', () => Promise.resolve());

    this.tessel.restore({})
      .then(() => {
        test.equal(this.validateDeviceId.callCount, 1);
        test.equal(this.fetchRestore.callCount, 1);
        test.done();
      });
  },

  restoreWithoutValidateDeviceId(test) {
    test.expect(2);

    this.validateDeviceId = this.sandbox.stub(restore, 'validateDeviceId', () => Promise.resolve());
    this.transaction = this.sandbox.stub(restore, 'transaction', () => Promise.resolve());

    this.tessel.restore({
        force: true
      })
      .then(() => {
        test.equal(this.validateDeviceId.callCount, 0);
        test.equal(this.fetchRestore.callCount, 1);
        test.done();
      });
  },

  restoreFetchImages(test) {
    test.expect(3);

    this.flash = this.sandbox.stub(restore, 'flash', () => Promise.resolve());
    this.transaction = this.sandbox.stub(restore, 'transaction', (usb, bytesOrCommand) => {
      if (bytesOrCommand === 0x9F) {
        return Promise.resolve(new Buffer([0x01, 0x02, 0x19]));
      }

      return Promise.resolve();
    });

    this.tessel.restore({})
      .then(() => {
        test.equal(this.fetchRestore.callCount, 1);
        test.equal(this.flash.callCount, 1);
        test.equal(this.flash.lastCall.args[1], this.images);
        test.done();
      });
  },
};

exports['restore.*'] = {
  setUp(done) {
    this.sandbox = sinon.sandbox.create();
    this.spinnerStart = this.sandbox.stub(log.spinner, 'start');
    this.spinnerStop = this.sandbox.stub(log.spinner, 'stop');
    this.warn = this.sandbox.stub(log, 'warn');
    this.info = this.sandbox.stub(log, 'info');
    this.images = {
      uboot: new Buffer('uboot'),
      squashfs: new Buffer('squashfs'),
    };
    this.status = this.sandbox.stub(restore, 'status', () => Promise.resolve(0));
    this.fetchRestore = this.sandbox.stub(updates, 'fetchRestore', () => {
      return Promise.resolve(this.images);
    });
    this.restore = this.sandbox.spy(Tessel.prototype, 'restore');
    this.tessel = TesselSimulator();


    done();
  },

  tearDown(done) {
    this.tessel.mockClose();
    this.sandbox.restore();
    done();
  },

  validateDeviceIdSuccess(test) {
    test.expect(1);

    this.transaction = this.sandbox.stub(restore, 'transaction', () => Promise.resolve(new Buffer([0x01, 0x02, 0x19])));

    restore.validateDeviceId({})
      .then(() => {
        test.equal(this.transaction.callCount, 1);
        test.done();
      });
  },

  validateDeviceIdFailure(test) {
    test.expect(1);

    this.transaction = this.sandbox.stub(restore, 'transaction', () => Promise.resolve(new Buffer([0x00, 0x00, 0x00])));

    restore.validateDeviceId({})
      .catch((error) => {
        test.equal(error.message, 'Invalid Device ID (Flash Memory Communication Error)');
        test.done();
      });
  },

  partitionReturnsBuffer(test) {
    test.expect(1);
    // TODO: we need more specific tests for this
    test.equal(Buffer.isBuffer(restore.partition([1], [2])), true);
    test.done();
  },

  partitionLayout(test) {
    test.expect(18);

    var uid = [randUint8(), randUint8(), randUint8(), randUint8()];
    var mac1 = [0x02, 0xA3].concat(uid);
    var mac2 = [0x02, 0xA4].concat(uid);

    var partition = restore.partition(mac1, mac2);

    test.equal(partition.length, 46);

    // TODO: Find reference
    test.equal(partition[0], 0x20);
    test.equal(partition[1], 0x76);
    test.equal(partition[2], 0x03);
    test.equal(partition[3], 0x01);

    // mac1
    test.equal(partition[4], 0x02);
    test.equal(partition[5], 0xA3);
    test.equal(partition[6], uid[0]);
    test.equal(partition[7], uid[1]);
    test.equal(partition[8], uid[2]);
    test.equal(partition[9], uid[3]);

    // Next portion is 30 bytes, all 0xFF
    test.deepEqual(partition.slice(10, 40), Array(30).fill(0xFF));

    // mac2
    test.equal(partition[40], 0x02);
    test.equal(partition[41], 0xA4);
    test.equal(partition[42], uid[0]);
    test.equal(partition[43], uid[1]);
    test.equal(partition[44], uid[2]);
    test.equal(partition[45], uid[3]);

    test.done();
  },

};

exports['restore.transaction'] = {
  setUp(done) {
    this.sandbox = sinon.sandbox.create();
    this.spinnerStart = this.sandbox.stub(log.spinner, 'start');
    this.spinnerStop = this.sandbox.stub(log.spinner, 'stop');
    this.warn = this.sandbox.stub(log, 'warn');
    this.info = this.sandbox.stub(log, 'info');
    this.images = {
      uboot: new Buffer('uboot'),
      squashfs: new Buffer('squashfs'),
    };
    this.status = this.sandbox.stub(restore, 'status', () => Promise.resolve(0));
    this.fetchRestore = this.sandbox.stub(updates, 'fetchRestore', () => {
      return Promise.resolve(this.images);
    });
    this.restore = this.sandbox.spy(Tessel.prototype, 'restore');
    this.tessel = TesselSimulator();

    this.usb = new USB.Connection({});
    this.usb.epOut = new Emitter();
    this.usb.epOut.transfer = this.sandbox.spy((data, callback) => {
      callback(null);
    });

    this.usb.epIn = new Emitter();
    this.usb.epIn.transfer = this.sandbox.spy((data, callback) => {
      callback(null, this.usb.epIn._mockbuffer);
    });
    this.usb.epIn._mockdata = new Buffer('mockbuffer');

    this.expectedBuffer = new Buffer([0x00, 0x00, 0x00, 0x00, 0xFF]);

    done();
  },

  tearDown(done) {
    this.tessel.mockClose();
    this.sandbox.restore();
    done();
  },

  transactionAcceptsCommandNumber(test) {
    test.expect(2);

    restore.transaction(this.usb, 0xFF).then(() => {
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);
      test.equal(this.usb.epIn.transfer.callCount, 0);
      test.done();
    });
  },

  transactionAcceptsArray(test) {
    test.expect(2);

    restore.transaction(this.usb, [0xFF]).then(() => {
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);
      test.equal(this.usb.epIn.transfer.callCount, 0);
      test.done();
    });
  },

  transactionAcceptsBuffer(test) {
    test.expect(2);

    restore.transaction(this.usb, new Buffer([0xFF])).then(() => {
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);
      test.equal(this.usb.epIn.transfer.callCount, 0);
      test.done();
    });
  },

  transactionWithReadlength(test) {
    test.expect(4);

    this.expectedBuffer[0] = 32;

    restore.transaction(this.usb, 0xFF, 32).then(() => {
      test.equal(this.usb.epOut.transfer.callCount, 1);
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);

      test.equal(this.usb.epIn.transfer.callCount, 1);
      test.equal(this.usb.epIn.transfer.lastCall.args[0], 32);
      test.done();
    });
  },

  transactionWithReadlengthStatusPoll(test) {
    test.expect(4);

    this.expectedBuffer[0] = 32;
    this.expectedBuffer[3] = 0b00000001;

    restore.transaction(this.usb, 0xFF, 32, true).then(() => {
      test.equal(this.usb.epOut.transfer.callCount, 1);
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);

      test.equal(this.usb.epIn.transfer.callCount, 1);
      test.equal(this.usb.epIn.transfer.lastCall.args[0], 32);
      test.done();
    });
  },

  transactionWithReadlengthStatusPollWriteEnable(test) {
    test.expect(4);

    this.expectedBuffer[0] = 32;
    this.expectedBuffer[3] = 0b00000011;

    restore.transaction(this.usb, 0xFF, 32, true, true).then(() => {
      test.equal(this.usb.epOut.transfer.callCount, 1);
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);

      test.equal(this.usb.epIn.transfer.callCount, 1);
      test.equal(this.usb.epIn.transfer.lastCall.args[0], 32);
      test.done();
    });
  },

  transactionStatusPollWithoutReadlength(test) {
    test.expect(3);

    this.expectedBuffer[0] = 0;
    this.expectedBuffer[3] = 0b00000001;

    restore.transaction(this.usb, 0xFF, 0, true).then(() => {
      test.equal(this.usb.epOut.transfer.callCount, 1);
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);

      test.equal(this.usb.epIn.transfer.callCount, 0);
      test.done();
    });
  },

  transactionStatusPollWriteEnableWithoutReadlength(test) {
    test.expect(3);

    this.expectedBuffer[0] = 0;
    this.expectedBuffer[3] = 0b00000011;

    restore.transaction(this.usb, 0xFF, 0, true, true).then(() => {
      test.equal(this.usb.epOut.transfer.callCount, 1);
      test.equal(this.usb.epOut.transfer.lastCall.args[0].equals(this.expectedBuffer), true);

      test.equal(this.usb.epIn.transfer.callCount, 0);
      test.done();
    });
  },
};

function randUint8() {
  return Math.round(Math.random() * 255);
}


// TODO: Needs tests for restore.write, will add in follow up
