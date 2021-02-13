/**
 * Subprotocol name: jsonRWS
 * HTTP header: "Sec-WebSocket-Protocol": "jsonRWS"
 *
 * Subprotocol description:
 *  This subprotocol is created for communication between websocket server and client.
 *
 * Subprotocol definitons:
 *  a) Client have to send message in valid JSON format. Allowed fields: id, from, to, cmd, payload.
 *  b) Server have to send message in valid JSON format. Allowed fields: id, from, to, cmd, payload.
 *  c) The message is converted from string to object.
 */


class JsonRWS {

  /*********** INCOMING MESSAGES ***********/
  /**
   * Execute the jsonRWS subprotocol for incoming messages. Filter and map incoming messages.
   * 1. Test if the message has valid "jsonRWS" format {id:number, from:number, to:number|number[]|string, cmd:string, payload?:any}.
   * 2. Convert the message from string to object.
   * @param {string} msgSTR -incoming message
   * @returns {{id:number, from:number, to:number|number[]|string, cmd:string, payload?:any}}
   */
  incoming(msgSTR) {
    let tf = false;
    let msg;
    try {
      msg = JSON.parse(msgSTR);
      const msgObjProperties = Object.keys(msg);
      tf = this._testFields(msgObjProperties);
    } catch (err) {
      tf = false;
    }

    if (tf) { return msg; }
    else { throw new Error(`Incoming message "${msgSTR}" doesn\'t have valid "jsonRWS" subprotocol format.`); }
  }



  /*********** OUTGOING MESSAGES ***********/
  /**
   * Execute the jsonRWS subprotocol for outgoing messages. Filter and map outgoing messages.
   * 1. Test if the message has valid "jsonRWS" format {id:number, from:number, to:number|number[]|string, cmd:string, payload:any}.
   * 2. Convert the message from object to string.
   * @param {{id:number, from:number, to:number|number[]|string, cmd:string, payload?:any}} msg - outgoing message
   * @returns {string}
   */
  outgoing(msg) {
    const msgObjProperties = Object.keys(msg);
    const tf = this._testFields(msgObjProperties);

    if (tf) {
      const msgSTR = JSON.stringify(msg);
      return msgSTR;
    } else {
      throw new Error(`Outgoing message ${JSON.stringify(msg)} doesn\'t have valid "jsonRWS" subprotocol format.`);
    }
  }


  /**
   * Helper to test msg properties.
   * @param {string[]} msgObjProperties - propewrties of the "msg" object
   */
  _testFields(msgObjProperties) {
    const allowedFields = ['id', 'from', 'to', 'cmd', 'payload'];
    const requiredFields = ['id', 'from', 'to', 'cmd'];
    let tf = true;

    // check if every of the msg properties are in allowed fields
    for (const prop of msgObjProperties) {
      if (allowedFields.indexOf(prop) === -1) { tf = false; break; }
    }

    // check if every of required fields is present
    for (const requiredField of requiredFields) {
      if(msgObjProperties.indexOf(requiredField) === -1) { tf = false; break; }
    }

    return tf;
  }



  /*********** PROCESS MESSAGES ***********/
  /**
   * Process client messages internally.
   * @param {object} msg - instruction message - {id, from, to, cmd, payload}
   * @param {Socket} socket - client which received the message
   * @param {DataTransfer} dataTransfer - instance of the DataTransfer
   * @param {SocketStorage} socketStorage - instance of the SockketStorage
   * @param {EventEmitter} eventEmitter - event emitter initiated in the RWS.js
   */
  async process(msg, socket, dataTransfer, socketStorage, eventEmitter) {
    const id = msg.id;
    const from = msg.from;
    const to = msg.to;
    const cmd = msg.cmd;
    const payload = msg.payload;


    /*** socket commands ***/
    if (cmd === 'socket/sendone') {
      // {id: 210129163129492000, from: 210129163129492111, to: 210201164339351900, cmd: 'socket/sendone', payload: 'Some message to another client'}
      const id = +msg.to;
      const toSocket = await socketStorage.findOne({id});
      dataTransfer.sendOne(msg, toSocket); }

    else if (cmd === 'socket/send') {
      // {id: 210129163129492000, from: 210129163129492111, to: [210201164339351900, 210201164339351901], cmd: 'socket/send', payload: 'Some message to another client(s)'}
      const socketIDs = to.map(socketID => +socketID); // convert to numbers
      const sockets = await socketStorage.find({id: {$in: socketIDs}});
      dataTransfer.send(msg, sockets); }

    else if (cmd === 'socket/broadcast') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'socket/broadcast', payload: 'Some message to all clients except the sender'}
      dataTransfer.broadcast(msg, socket); }

    else if (cmd === 'socket/sendall') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'socket/sendall', payload: 'Some message to all clients and the sender'}
      dataTransfer.sendAll(msg); }

    else if (cmd === 'socket/nick') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'socket/nick', payload: 'Peter Pan'}
      const nickname = msg.payload;
      await socketStorage.setNick(socket, nickname);
      msg.payload = socket.extension.nickname;
      socket.extension.sendSelf(msg); }


    /*** room commands ***/
    else if (cmd === 'room/enter') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'room/enter', payload: 'My Chat Room'}
      const roomName = payload;
      socketStorage.roomEnter(socket, roomName);
      msg.payload = `Entered in the room '${roomName}'`;
      socket.extension.sendSelf(msg); }

    else if (cmd === 'room/exit') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'room/exit', payload: 'My Chat Room'}
      const roomName = payload;
      socketStorage.roomExit(socket, payload);
      msg.payload = `Exited from the room '${roomName}'`;
      socket.extension.sendSelf(msg); }

    else if (cmd === 'room/exitall') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'room/exitall'}
      socketStorage.roomExitAll(socket);
      msg.payload = 'Exited from all rooms';
      socket.extension.sendSelf(msg); }

    else if (cmd === 'room/send') {
      // {id: 210129163129492000, from: 210129163129492111, to: 'My Chat Room', cmd: 'room/send', payload: 'Some message to room clients.'}
      const roomName = to;
      dataTransfer.sendRoom(msg, socket, roomName); }


    /*** route command ***/
    else if (cmd === 'route') {
      // {id: 210129163129492000, from: 210129163129492111, to: 0, cmd: 'route', payload: {uri: 'shop/login', body: {username:'mark', password:'thG5$#w'}}}
      eventEmitter.emit('route', msg, socket); }


    /*** info commands ***/
    else if (cmd === 'info/socket/id') {
      // {id: 210129163129492000, from: 210129163129492111, to: 210129163129492111, cmd: 'info/socket/id'}
      msg.payload = socket.extension.id;
      socket.extension.sendSelf(msg); }

    else if (cmd === 'info/socket/list') {
      // {id: 210129163129492000, from: 210129163129492111, to: 210129163129492111, cmd: 'info/socket/list'}
      const sockets = await socketStorage.find();
      const socket_ids_nicks = sockets.map(socket => { return {id: socket.extension.id, nickname: socket.extension.nickname}; });
      msg.payload = socket_ids_nicks; // {id:number, nickname:string}
      socket.extension.sendSelf(msg); }

    else if (cmd === 'info/room/list') {
      // {id: 210129163129492000, from: 210129163129492111, to: 210129163129492111, cmd: 'info/room/list'}
      const rooms = await socketStorage.roomList();
      msg.payload = rooms;
      socket.extension.sendSelf(msg); }

    else if (cmd === 'info/room/listmy') {
      // {id: 210129163129492000, from: 210129163129492111, to: 210129163129492111, cmd: 'info/room/listmy'}
      const rooms = await socketStorage.roomListOf(msg.from);
      msg.payload = rooms;
      socket.extension.sendSelf(msg); }


  }





}


module.exports = new JsonRWS();
