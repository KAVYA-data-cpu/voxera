const { webcrypto } = require('crypto');
if (webcrypto) {
  globalThis.crypto = webcrypto;
}
