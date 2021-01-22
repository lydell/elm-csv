'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _crossSpawn = require('cross-spawn');

var _crossSpawn2 = _interopRequireDefault(_crossSpawn);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var closeArgsToError = function closeArgsToError(code, signal) {
  if (signal !== null) {
    var err = new Error(`Exited with signal ${signal}`);
    err.exitSignal = signal;
    return err;
  }
  if (code !== 0) {
    var _err = new Error(`Exited with status ${code}`);
    _err.exitStatus = code;
    return _err;
  }
  return null;
};

var concatBuffer = function concatBuffer(buffer) {
  if (buffer == null || buffer.length === 0) {
    return null;
  } else if (typeof buffer[0] === 'string') {
    return buffer.join('');
  } else if (Buffer.isBuffer(buffer[0])) {
    return Buffer.concat(buffer);
  } else {
    throw new Error('Unexpected buffer type');
  }
};

var setEncoding = function setEncoding(stream, encoding) {
  if (stream != null && encoding != null && typeof stream.setEncoding === 'function') {
    stream.setEncoding(encoding);
  }
};

var prepareStream = function prepareStream(stream, encoding) {
  if (stream == null) {
    return null;
  }
  setEncoding(stream, encoding);
  var buffers = [];
  stream.on('data', function (data) {
    buffers.push(data);
  });
  return buffers;
};

exports.default = function (cmd, args) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var childProcess = void 0;
  var promise = new Promise(function (resolve, reject) {
    var encoding = void 0;
    if (options.encoding != null) {
      encoding = options.encoding;
      options = Object.assign({}, options);
      delete options.encoding;
    }

    childProcess = (0, _crossSpawn2.default)(cmd, args, options);

    setEncoding(childProcess.stdin, encoding);
    var stdout = prepareStream(childProcess.stdout, encoding);
    var stderr = prepareStream(childProcess.stderr, encoding);

    childProcess.once('exit', function (code, signal) {
      var error = closeArgsToError(code, signal);
      if (error != null) {
        error.stdout = concatBuffer(stdout);
        error.stderr = concatBuffer(stderr);
        error.message = [
          error.message,
          error.stdout,
          error.stderr,
        ].join("\n\n");
        reject(error);
      } else {
        resolve(concatBuffer(stdout));
      }
    });

    childProcess.once('error', reject);
  });
  promise.childProcess = childProcess;
  return promise;
};
