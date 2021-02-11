class SocketStorageMemory {

  /**
   * Init and prepare the storage:
   *   - define global variable
   *   - define file path
   *   - connect with redis server
   *   - connect with mongodb server
   * @param {object} storageOpts - storage options, for example database credentials
   * @returns {void}
   */
  init(storageOpts) {
    this.storageOpts = storageOpts;
    global.rws = {
      sockets: [], // {..., extension}
      rooms: [] // {name, socketIds: []}
    };
  }



  /************** SOCKETS *****************/
  /****************************************/

  /**
   * Get total number of saved sockets
   * @returns {number}
   */
  async count() {
    const socketsCount = global.rws.sockets.length;
    return socketsCount;
  }


  /**
   * Get all sockets.
   * @returns {Socket[]} - array of sockets
   */
  async getAll() {
    const sockets = global.rws.sockets;
    return sockets;
  }


  /**
   * Add socket to sockets array which is used when we want to send message (broadcast) to all TCP sockets (TCP clients).
   * @param {Socket} socket - net socket https://nodejs.org/api/net.html#net_class_net_socket properties + "extension" propery added by SocketExtension.js
   * @returns {void}
   */
  async add(socket) {
    await global.rws.sockets.push(socket);
    socket.emit('storage-add'); // emits javascript event used in SocketExtension.js
  }


  /**
   * 1. Kill the web socket. Ensures that no more I/O activity happens on this socket
   * 2. Remove socket from sockets array.
   * 3. Remove socket from the rooms.
   * @param {Socket} socket - net socket https://nodejs.org/api/net.html#net_class_net_socket properties + "extension" propery added by SocketExtension.js
   * @returns {void}
   */
  remove(socket) {
    socket.destroy();
    global.rws.sockets = global.rws.sockets.filter(sock => sock.extension.id !== socket.extension.id);
    this.roomExit(socket);
  }


  /**
   * Get array of all socket IDs. Because socket object is very big and hard to debug.
   * @param {string} sort - asc | desc -- sort IDs ascending or descending
   * @returns {string[]} - array of numbers
   */
  async listIDs(sort) {
    const socketIds = global.rws.sockets.map(socket => socket.extension.id); // extract socket ids

    if (sort === 'asc') {
      socketIds.sort();
    } else if (sort === 'desc') {
      socketIds.sort((a, b) => b - a);
    }

    return socketIds;
  }


  /**
   * Find an array of sockets by querying the socket.extension object (see SocketExtension.js).
   * @param query {Object} - search query object {id, ip, port, time, ... }
   * @returns {Socket[]} - extended websocket object
   ******************************************************
   * Query examples:
   * {id: 201117092132387170}
   * {id: {$in: [201117092132387170,  201117092132387171,  201117092132387172]}}
   * {ip: {$ne: '::1'}}
   * {userAgent: {$regex: /moz/i}}
   */
  async find(query) {
    if (!query) { query = {}; }
    const sockets = global.rws.sockets.filter(socket => this._searchLogic(socket, query));
    return sockets;
  }


  /**
   * Find a socket by querying the socket.extension object.
   * @param query {Object} - search query object {id, ip, port, time, ... }. For example: {id: 201117092132387170} or {ip: '::1'}
   * @returns {Socket} - extended websocket object
   */
  async findOne(query) {
    if (!query) { query = {}; }
    const socket = global.rws.sockets.find(socket => this._searchLogic(socket, query));
    return socket;
  }


  /**
   * Find out if the socket exists.
   * @param {Socket} socket - net socket https://nodejs.org/api/net.html#net_class_net_socket properties + "extension" propery added by SocketExtension.js
   * @returns {boolean}
   */
  async exists(socket) {
    const socketIds = this.listIDs(); // list of all active socket IDs
    const tf = (socketIds.indexOf(socket.extension.id) !== -1); // true | false
    return tf;
  }


  /**
   * Set an unique nick name to the socket (client).
   * @param {Socket} socket - net socket https://nodejs.org/api/net.html#net_class_net_socket properties + "extension" propery added by SocketExtension.js
   * @param {string} nickname - nick name, for example 'Peter Pan'
   * @returns {void}
   */
  async setNick(socket, nickname) {
    // if nickname already exist add the extension of 5 digits extracted from socketID
    const socketFound = await global.rws.sockets.find(socket => this._searchLogic(socket, {nickname}));
    if (!!socketFound) {
      const ext = socket.extension.id.toString().slice(13, 18);
      nickname += ext;
    }
    socket.extension.nickname = nickname;
  }




  /************** ROOMS *****************/
  /**************************************/
  /*
   * global.rws.rooms: {name:string, socketIds: number[]}
   * example: [{"name":"room-A","socketIds":[21020608374083564, 21020608374083565]},{"name":"room-B","socketIds":[21020608374083564]}]
   */

  /**
   * Add socket in the existing room. If the room doesn't exist create a new room with the socket.
   * @param {Socket} socket
   * @param {string} roomName
   * @returns {void}
   */
  roomEnter(socket, roomName) {
    const socket_id = socket.extension.id;
    if (!socket_id) { console.log('"socket.extension.id" is not defined.'); }

    let i = 0, roomExists = false;
    for (const room of global.rws.rooms) {
      if (room.name === roomName) {
        if (room.socketIds.indexOf(socket_id) === -1) { global.rws.rooms[i].socketIds.push(socket_id); } // add socket - no duplication
        roomExists = true;
        break;
      }
      i++;
    }

    if (!roomExists) {
      const newRoom = {
        name: roomName,
        socketIds: [socket_id]
      };
      global.rws.rooms.push(newRoom);
    }

  }


  /**
   * Remove socket from the room. If the room doesn't have any sockets remove the room.
   * @param {Socket} socket
   * @param {string} roomName
   * @returns {void}
   */
  roomExit(socket, roomName) {
    const socket_id = socket.extension.id;
    let i = 0;
    for (const room of global.rws.rooms) {
      if (room.name === roomName) {
        room.socketIds = room.socketIds.filter(sock_id => sock_id !== socket_id); // romove the socket from the room
        break;
      }
      i++;
    }
    this._roomCorrector();
  }


  /**
   * Remove socket from all rooms. For example in case that socket is closed.
   * @param {Socket} socket
   * @returns {void}
   */
  roomExitAll(socket) {
    const socket_id = socket.extension.id;
    let i = 0;
    for (const room of global.rws.rooms) {
      console.log('room::', room.name);
      room.socketIds = room.socketIds.filter(sock_id => sock_id !== socket_id);
      i++;
    }
    this._roomCorrector();
    console.log(global.rws.rooms);
  }


  /**
   * List all the rooms.
   * @returns {[{name:string, socketIds:number[]}]}
   */
  async roomList() {
    const rooms = global.rws.rooms;
    return rooms;
  }


  /**
   * List all the rooms where is the specific client.
   * @param {number} socketId
   * @returns {[{name:string, socketIds:number[]}]}
   */
  async roomListOf(socketId) {
    const roomsOfSocket = global.rws.rooms.filter(room => room.socketIds.indexOf(socketId) !== -1);
    return roomsOfSocket;
  }



  /**
   * Find a room by room name.
   * @param {string} roomName
   * @returns {{name:string, socketIds:number[]}[]}
   */
  async roomFindOne(roomName) {
    const room = global.rws.rooms.find(room => room.name === roomName);
    return room;
  }



  /*** PRIVATE METHODS ***/

  /**
   * Is searched value found.
   * @param {Socket} socket - net socket https://nodejs.org/api/net.html#net_class_net_socket properties + "extension" propery added by SocketExtension.js
   * @param {object} query - query for the socket.extension object, for example: {userAgent: {$regex: /moz/i}}
   * @returns {boolean}
   */
  _searchLogic(socket, query) {
    const props = Object.keys(query);
    let tf = true;
    for (const prop of props) {
      const $ne = query[prop].$ne;
      const $regex = query[prop].$regex;
      const $in = query[prop].$in;
      if (!!$ne) {
        tf = tf && socket.extension[prop] !== query[prop].$ne;
      } else if (!!$regex){
        tf = tf && $regex.test(socket.extension[prop]);
      } else if (!!$in){
        tf = tf && query[prop].$in.indexOf(socket.extension[prop]) !== -1;
      } else {
        tf = tf && socket.extension[prop] === query[prop];
      }
    }
    return tf;
  }


  /**
   * Correct global.rws.rooms
   * - all rooms with no clients should be removed i.e. socketIds is an empty array
   */
  _roomCorrector() {
    global.rws.rooms = global.rws.rooms.filter(room => !!room.socketIds.length);
  }





}


module.exports = new SocketStorageMemory();
