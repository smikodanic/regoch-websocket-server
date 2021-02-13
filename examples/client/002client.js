/**
 * The script proves that the 'arraybuffer' is masked same as a 'string'.
 */

const wsURL = 'ws://localhost:3211/something?authkey=TRTmrt';
const subprotocols = ['WSUrouter', 'xml', 'json'];
const ws = new WebSocket(wsURL, subprotocols);



/*** EVENTS ***/
// open ws connection
ws.onopen = (conn) => {
  console.log('conn:: ', conn);
  console.log('ws:: ', ws);
  console.log('WS Connection opened');
};

// receive a message
ws.onmessage =  (event) => {
  console.log('Received :', event.data);
};

// close websocket
ws.onclose = () => {
  console.log('WS Connection closed');
};

// error
ws.onerror = (err) => {
  console.error(err);
};


const arr = [0x81, 0x81, 0xb3, 0x99, 0x44, 0x8c, 0xf2];
const a = Uint8Array.from(arr);

// send message by clicking the button
const sendMsg = () => {
  ws.binaryType = 'arraybuffer';
  ws.send(a);
  console.log('sent arraybuffer::', a);
};


/*
////////// server debug /////////////

 --------------------- _parseMessage ------------------------
byte_1::: 10000010 ---> fin:1 rsv1:0 rsv2:0 rsv3:0 opcode:0x2
byte_2::: 10000111 ---> mask:1 plen:0b111 -- 0x7 -- 7
plen:0b111 -- 0x7 -- 7
mask:1 , mask_keys: 0x79 0x52 0x72 0x13

buff: 13bytes <Buffer 82 87 79 52 72 13 f8 d3 c1 8a 3d de 80>
payload_buff: 7 <Buffer f8 d3 c1 8a 3d de 80>
payload_buff2: 7 <Buffer 81 81 b3 99 44 8c f2>
payload_decoded: string ����D��

*/
