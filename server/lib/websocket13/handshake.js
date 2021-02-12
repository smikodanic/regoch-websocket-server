const crypto = require('crypto');
const packageJson = require('../../../package.json');



/**
   * Websocket handshaking on the server side according to RFC6455 ( https://tools.ietf.org/html/rfc6455#section-4 )
   * @param {Socket} socket - web socket object
   * @param {string} wsKey - value of the "Sec-Websocket-Key: aKaKNe70S+oNRHWRdM2iVQ==" HTTP header
   * @param {number} wsVersion - "Sec-Websocket-Version: 13"
   * @param {string[]} wsProtocols - "Sec-Websocket-Protocol" subprotocols sent by the client: 'jsonRWS', 'json', 'raw' ( https://www.iana.org/assignments/websocket/websocket.xml )
   * @param {string} subprotocol - subprotocol used by the server
   */
module.exports = (socket, wsKey, wsVersion, wsProtocols, subprotocol) => {
  // create hash
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // Globally Unique Identifier (GUID)
  const hash = crypto
    .createHash('sha1')
    .update(wsKey + GUID)
    .digest('base64');

  // required headers
  let headers =
    'HTTP/1.1 101 Switching Protocol - Websocket @regoch\r\n' +
    'Connection: Upgrade\r\n' +
    'Upgrade: Websocket\r\n' +
    `Sec-WebSocket-Accept: ${hash}\r\n` +
    `Sec-WebSocket-Version: ${wsVersion}\r\n`;

  // if the client does not send "Sec-Websocket-Protocol" then server shouldn't send it in the response
  if (!!wsProtocols && !!wsProtocols.length) {
    headers += `Sec-WebSocket-Protocol: ${subprotocol}\r\n`;
  }

  // server specific headers
  headers += `Sec-WebSocket-Server-Version: ${packageJson.version}\r\n` +
    `Sec-WebSocket-SocketID: ${socket.extension.id}\r\n` +
    `Sec-WebSocket-Timeout: ${socket.timeout}\r\n`;

  // end
  headers += '\r\n';

  // console.log('\n\nheaders::\n', JSON.stringify(headers));
  socket.write(headers, 'utf8');

};


