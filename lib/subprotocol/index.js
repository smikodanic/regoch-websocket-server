const raw = require('./raw');
const jsonRWS = require('./jsonRWS');
// const json = require('./json'); // TODO
// const xml = require('./xml'); // TODO


/**
 * * Select and init the websocket subprotocol.
 * @param {object} wsOpts - RWS options
 * @returns {object}
 */
module.exports = (wsOpts) => {
  let subprotocolLib;

  switch (wsOpts.subprotocol) {
  case 'raw': subprotocolLib = raw; break;
  case 'jsonRWS': subprotocolLib = jsonRWS; break;
  default: break;
  }

  return subprotocolLib;
};
