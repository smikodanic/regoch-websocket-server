# regoch-websocket-server
> Ultra fast Websocket Server with builtin JS framework for creating real-time, complex apps.

The library is made for **NodeJS** according to [RFC6455 Standard](https://www.iana.org/assignments/websocket/websocket.xml) for websocket version 13.


## Websocket Server Features
- RFC6455, websocket v.13
- NodeJS v10+
- internal HTTP server
- socket (client) authentication
- limit total number of the connected clients
- limit the number of connected clients per IP
- rooms (grouped websocket clients)
- built-in router
- possible RxJS integration


## Website
[www.regoch.org](http://www.regoch.org/websocket-server)


### Router Features
- use regular expression in the route definition
- parse route parameters (/shop/register/:name/:age)
- parse URI querystring / value types automatically fixed to string, number or boolean (/shop/register/john/23?id=1212)
- define not found functions which will be executed when no route is matched against the URI
- redirections - redirect one route to another (regex can be used to redirect a group of routes to another route)
- leading and ending slashes are ignored in the route definition ("/shop/register/" is same as "shop/register")
- ignore letter case in the route definition ("/sHOP/reGIster/" is same as "/shop/register")
- transitional "trx" object can be used route function parameter (similar as ExpressJS) -> router.def('/home', (trx) => {});
- route function can be defined as an AsynFunction, for example: ```const rf1 = async (req) => { ... };```


**Router API**

*Properties*

```routerOpts - {debug:boolean}``` - router options

```trx - {uri:string, body:any, uriParsed:{path:string, segments:number, queryString:string, queryObject:object}, routeParsed:{full:string, segments:number, base:string}, params:object, query:object}``` - transitional object ("uri" is the required property)

*Methods*

```router.def('/', trx => console.log('ROOT'))``` - define route

```router.def('/shop/get.+/[0-9]+', rFun1, rFun2)``` - define route with regexp

```router.notfound(rFun1, rFun2)``` - define route functions when route is not found

```router.redirect(fromRoute, toRoute)``` - redirect from one rout to another route

```router.redirect('.+', '/')``` - redirect any route to root route

```router.do(rFun1, rFun2)``` - execute functions on every request

```router.exe().then().catch()``` - execute router functions



**Server Development**
```bash
## start the test server
$ nodemon examples/001internal.js
```




### Licence
“Freely you received, freely you give”, Matthew 10:5-8

Copyright (c) 2020 Saša Mikodanić licensed under [AGPL-3.0](./LICENSE) .
