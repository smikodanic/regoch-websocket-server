const Router = require('../server/lib/Router');
const router = new Router({debug: false});


// input from console, for example: $ node examples/005router.js '{"uri":"/shop/register/john/23/true","body":{}}'
let trx = process.argv[2];
try {
  trx = JSON.parse(trx); // convert string to object
} catch (err) {
  console.log(err.stack);
}



// route functions
const rFun1 = async (trx) => {
  console.log('fja1::', trx);
  trx.uri = 'aaa'; // will not be possible to change
  trx.body = 'bbb'; // will not be possible to change
  trx.a = 5;
  trx.a++;
};

const rFun2 = (trx) => {
  trx.b = 78;
  // throw new Error('Intentional error');
  console.log('fja2::', trx);
};


// set transitional object (which is used in )
router.trx = trx; // {uri, body, ...}



////////////////////// R O U T E S /////////////////////

/***** REGEX MATCH (NO PARAMS) (_routeRegexMatch) *****/
/* root route */
// node 005router.js '{"uri": "/"}'
router.def('/', trx => console.log('ROOT-A'), trx => console.log('ROOT-B')); // exact match

/* exact match */
// node 005router.js '{"uri": "/shop/list", "body": [{"id": 12}, {"id": 13}, {"id": 14}]}'
router.def('/shop/list', rFun1, rFun2); // exact match


/* examples with uri query string */
// node 005router.js '{"uri": "/shop/login?username=peter&password=pan"}'
router.def('/shop/login', trx => console.log(`LOGIN:: username:${trx.query.username} password:${trx.query.password}`));

// node 005router.js '{"uri": "/shop/prod?myJson={\"qty\": 22}"}'   -- parse JSON
router.def('/shop/prod', trx => console.log(`myJson:: ${JSON.stringify(trx.query.myJson)}`));


/* examples with regular expression */
// node 005router.js '{"uri": "/shop/getnames/12345"}'
router.def('/shop/get.+/[0-9]+', trx => console.log('REGEXP MATCH'));




/***** PARAM MATCH (_routeWithParamsMatch) *****/
// node 005router.js '{"uri": "/shop/users/matej/44"}'
router.def('/shop/users/:name/:age', trx => console.log(`name: ${typeof trx.params.name} ${trx.params.name} , age: ${typeof trx.params.age} ${trx.params.age}`));


/* examples with uri query string */
// node 005router.js '{"uri": "/shop/register/john/23/true?x=123&y=abc&z=false", "body": {"nick": "johnny"}}'
router.def('/shop/register/:name/:year/:employed', trx => console.log(`employed: ${trx.params.employed}`));


/* examples with regular expression */
// node 005router.js '{"uri": "/shop/shops/www/CloudShop/1971"}'
// node 005router.js '{"uri": "/shop/shop/www/CloudShop/1972"}'
router.def('/shop/shop(s)?/w{3}/:name/:year', trx => console.log(`name: ${trx.params.name} year: ${trx.params.year}`));

//// \\d+ replaces one or more digits (integer numbers)
// node 005router.js '{"uri": "/shop/shop/5/BetaShop/1978/red"}'
// node 005router.js '{"uri": "/shop/shop/567/Betashop/1979/green"}'
router.def('/SHOP/shop/\\d+/:name/:year/:color', trx => console.log(`name: ${trx.params.name} year: ${trx.params.year} color: ${trx.params.color}`));


// node 005router.js '{"uri": "/shop/shop567/{\"a\": 22}"}'
router.def('/SHOP/shop\\d+/:myJSON', trx => console.log(`myJSON: ${JSON.stringify(trx.params.myJSON)}`));


/***** REDIRECTS *****/
// node 005router.js '{"uri": "/someurl"}'
router.redirect('/someurl', '/');

// node 005router.js '{"uri": "/shop/badurl"}'
router.def('/shop/notfound', () => console.log('--SHOP ROUTE Not Found !--')).redirect('/shop/.+', '/shop/notfound'); // redirect any route to the '/notfound' route. SHOULD BE DEFINED LAST



/***** NO MATCH (bad uri - Error 404) *****/
// node 005router.js '{"uri": ""}'
// node 005router.js '{"uri": "/badurl"}'
router.notfound(trx => {console.log('Route not found.'); });




/***** DO -  always will be executed on each URI *****/
const f1 = (trx) => { console.log('always f1'); };
const f2 = (trx) => { console.log('always f2'); };
router.do(f1, f2);




/***** EXECUTE ROUTER *****/
router.exe()
  .then(trx => console.log('then(trx):: ', trx))
  .catch(err => console.log('ERRrouter:: ', err));
