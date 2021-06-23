const { EventEmitter } = require('events');
const DataParser13 = require('./websocket13/DataParser');
const subprotocol = require('./subprotocol');
const helper = require('./helper');
const storage = require('./storage');



/**
 * Data transfer according to RFC6455 ( https://tools.ietf.org/html/rfc6455#section-5 )
 */
class DataTransfer {

  /**
   * @param {object} wsOpts - RWS options
   * @param {EventEmitter} eventEmitter - NodeJS EventEmitter instance ( https://nodejs.org/api/events.html#events_class_event )
   */
  constructor(wsOpts) {
    this.wsOpts = wsOpts;
    this.socketStorage = storage(wsOpts);
    this.subprotocolLib = subprotocol(wsOpts);
    if (wsOpts.version = 13) { this.dataParser = new DataParser13(wsOpts.debug); }
    this.eventEmitter = new EventEmitter(); // event emitter (events: 'connection', 'message', 'route' )
  }



  /******** DATA INPUT  ********/
  /*****************************/
  /**
   * Carry in the client message in the server.
   * Message is converted from buffer to string. After that the message is pushed in the "message" event.
   * @param {Socket} socket - client which sends message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  carryIn(socket) {
    socket.on('data', async msgBUF => {
      try {
        // console.log('msgBUF::', msgBUF.length, msgBUF.toString('hex').match(/../g).join(' '));
        const msgSTR = this.dataParser.incoming(msgBUF); // convert incoming buffer message to string

        let msg;
        if (!/OPCODE 0x/.test(msgSTR)) {
          msg = this.subprotocolLib.incoming(msgSTR); // convert the string message to format defined by the subprotocol
          this.subprotocolLib.process(msg, socket, this, this.socketStorage, this.eventEmitter); // process message internally
        } else {
          this.opcodes(msgSTR, socket);
        }

        this.eventEmitter.emit('message', msg, msgSTR, msgBUF, socket); // stream the message

      } catch(err) {
        const socketID = !!socket && !!socket.extension ? socket.extension.id : '';
        console.log(`DataTransfer.carryIn:: socketID: ${socketID}, WARNING: ${err.message}`.cliBoja('yellow'));
        // this.sendError(err, socket); // return error message back to the client
        // await new Promise(resolve => setTimeout(resolve, 800));
        // socket.destroy(); // disconnect client which sent bad message
      }
    });
  }


  /**
   * Parse websocket operation codes according to https://tools.ietf.org/html/rfc6455#section-5.1
   * @param {string} msgSTR - received message
   * @param {Socket} socket
   */
  opcodes(msgSTR, socket) {
    if (msgSTR === 'OPCODE 0x8 CLOSE') {
      console.log('Opcode 0x8: Client closed the websocket connection'.cliBoja('yellow'));
      socket.extension.removeSocket();
    } else if (msgSTR === 'OPCODE 0x9 PING') {
      if (this.wsOpts.debug) { console.log('Opcode 0x9: PING received'.cliBoja('yellow')); }
      const pongBUF = this.dataParser.ctrlPong();
      socket.write(pongBUF);
    } else if (msgSTR === 'OPCODE 0xA PONG') {
      if (this.wsOpts.debug) { console.log('Opcode 0xA: PONG received'.cliBoja('yellow')); }
    }
  }




  /******** DATA OUTPUT  ********/
  /******************************/
  /**
   * Carry out socket message from the server to the client.
   * The message is converted from string into the buffer and then sent to the client.
   * @param {any} msg - message which will be sent to the client
   * @param {Socket} socket - client which is receiving message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  carryOut(msg, socket) {
    try {
      const msgSTR = this.subprotocolLib.outgoing(msg); // convert outgoing message to string
      const msgBUF = this.dataParser.outgoing(msgSTR, 0); // convert string to buffer
      if (!!socket && socket.readable) { socket.write(msgBUF); } // send buffer message to the client
      else { throw new Error(`Socket is not defined or not writable ! msg: ${msgSTR}`); }

    } catch(err) {
      const socketID = !!socket && !!socket.extension ? socket.extension.id : 'BAD SOCKET';
      console.log(`DataTransfer.carryOut:: socketID: ${socketID}, WARNING: ${err.message}`.cliBoja('yellow'));
      // socket.destroy();
    }
  }


  /**
   * Send message to one client (socket).
   * @param {any} msg - message which will be sent to the client
   * @param {Socket} socket
   * @returns {void}
   */
  async sendOne(msg, socket) {
    this.carryOut(msg, socket);
  }


  /**
   * Send message to one or more clients (sockets).
   * @param {any} msg - message which will be sent to the client(s)
   * @param {Socket[]} sockets
   * @returns {void}
   */
  async send(msg, sockets) {
    for (const socket of sockets) {
      await this.carryOut(msg, socket);
    }
  }


  /**
   * Send message to all clients excluding the client who sent the message.
   * @param {any} msg - message which will be sent to the clients
   * @param {Socket} socketSender - socket which sends message
   * @returns {void}
   */
  async broadcast(msg, socketSender) {
    const iD = +socketSender.extension.id;
    const sockets = await this.socketStorage.find({id: {$ne: iD}});
    for (const socket of sockets) {
      await this.carryOut(msg, socket);
    }
  }


  /**
   * Send message to all clients including the client who sent the message.
   * @param {any} msg - message which will be sent to the clients
   * @returns {void}
   */
  async sendAll(msg) {
    const sockets = await this.socketStorage.getAll();
    for (const socket of sockets) {
      await this.carryOut(msg, socket);
    }
  }


  /**
   * Send message to all clients in the specific room excluding the client who sent the message.
   * @param {any} msg - message which will be sent to the room clients
   * @param {Socket} socketSender - client which is sending message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @param {string} roomName - a room name (group of clients)
   * @returns {void}
   */
  async sendRoom(msg, socketSender, roomName) {
    const socketSenderID = +socketSender.extension.id; // sender socket id
    const room = await this.socketStorage.roomFindOne(roomName); // {name:string, socketIds:number[]}
    if (!!room) {
      const sockets = await this.socketStorage.find({id: {$in: room.socketIds}});
      for (const socket of sockets) {
        if (!!socket && socket.extension.id !== socketSenderID) { await this.carryOut(msg, socket); }
      }
    }
  }



  /**
   * Send error message to one client (socket).
   * @param {Error} err - error which will be sent to the client
   * @param {Socket} socket - client which is receiving message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  sendError(err, socket) {
    const to = !!socket.extension ? socket.extension.id : 0;
    const msgObj = {
      id: helper.generateID(),
      from: 0,
      to,
      cmd: 'error',
      payload: err.message
    };
    this.carryOut(msgObj, socket);
  }


  /**
   * Send socket ID back to the client.
   * @param {Error} err - error which will be sent to the client
   * @param {Socket} socket - client which is receiving message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  sendID(socket) {
    const msgObj = {
      id: helper.generateID(),
      from: 0,
      to: socket.extension.id,
      cmd: 'info/socket/id',
      payload: socket.extension.id
    };
    this.carryOut(msgObj, socket);
  }





}


module.exports = DataTransfer;
