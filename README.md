# regoch-websocket-server
> Ultra fast Websocket Server with builtin JS framework for creating real-time, complex apps.

The library is made for **NodeJS** according to [RFC6455 Standard](https://tools.ietf.org/html/rfc6455) for websocket version 13.

Very clean code with straightforward logic and no dependencies.



## Websocket Server Features
- RFC6455, websocket v.13
- NodeJS v10+
- **no dependencies**
- internal HTTP server
- socket (client) authentication
- limit total number of the connected clients
- limit the number of connected clients per IP
- rooms (grouped websocket clients)
- built-in router
- possible RxJS integration



## Installation
```
npm install --save regoch-websocket-server
```


## Website
[www.regoch.org](http://www.regoch.org/websocket-server)




**Server Development**
```bash
## start the test server
$ nodemon examples/001internal.js
```




### Licence
“Freely you received, freely you give”, Matthew 10:5-8

Copyright (c) 2020 Saša Mikodanić licensed under [AGPL-3.0](./LICENSE) .
