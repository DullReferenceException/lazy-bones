# lazy-bones

Declare how to get all your data in one place, then lazily get just the parts you need.


## Do I need this?

Your application needs data. Simple, right? Just make a request:

```es6
getSomeData({ some: 'param' }).then(someData => {
  useTheData(someData);
});
```

...except sometimes to get that data we need another piece of data. Still simple, we can use Promises or async:

```es6
getDataA().then(a => {
  return getDataB({ blah: a.foo });
}).then(b => {
  return useTheData(b);
});
```

...except sometimes there's quite a few sources involved with complex inter-dependencies. `async.auto`, right?

```es6
async.auto({
  a: next => getA(next),
  b: ['a', (results, next) => {
    getB(results.a, next);
  }],
  c: ['a', 'b', (results, next) => {
    getC(results.a, results.b, next);
  }],
  d: ['a', 'c', (results, next) => {
   getD(results.a, results.c, next);
 }],
}, (err, results) => {
  // ...
});
```

...except sometimes pieces of these complex work-flows need to be shared. Just extract into a reusable function, right?

```es6

// File 1

const getB = require('./get-b');

async.auto({
  a: next => {
    getA(next);
  },
  b: ['a', (results, next) => {
    getB(results.a, next);
  }],
  c: ['a', 'b', (results, next) => {
    getC(results.a, results.b, next);
  }],
  d: ['a', 'c', (results, next) => {
   getD(results.a, results.c, next);
 }],
}, (err, results) => {
  // ...
});

// File 2

const getB = require('./get-b');

async.auto({
  a: next => {
    doSomething(next);
  },
  b: ['a', (results, next) => {
    getB(results.a, next);
  }]
}, (err, results) => {
  // ...
});

```

...except my workflow is scattered throughout multiple helpers/middlewares/etc, and I don't want to duplicate similar
requests for the same pieces of data. Hm, now things are getting tricky! We would now need to implement some sort of
caching within a particular scope, passing that around as some sort of continuation that weaves its way through multiple
files.

This is where `lazy-bones` comes in. This library allows you to declare your entire application's data retrieval logic
and inter-dependencies all in one place, then lazily retrieve just the pieces you want, with built in caching of 
intermediate values.


## What does this look like?

First you need to define your data source. The format of the definition is `async.auto`-inspired, except
it plays nicely with Promises and synchronous results:

```es6
// state.js

const LazyBones = require('lazy-bones');

const DataSource = LazyBones({
  customer: ['customerId', ({ customerId }, cb) => {
    getCustomer(customerId, cb);
  }],
  preferences: ['customer', ({ customer }) => {
    return getPreferences(customer.preferencesKey); // This returns a Promise
  }],
  likesPuzzles: ['preferences', ({ preferences }) => {
    return prefs.likesPuzzles;
  }]
});

module.exports = DataSource;
```

If you have a very complex app, having everything in one huge object literal would make things hard to read. 
Additionally, sometimes there may be two different pathways to the same pieces of data, some which is known and some 
which is retrieved. To support more advanced scenarios, you can use this pattern:

```es6
// state.js

const LazyBones = require('lazy-bones');

const accountId = require('./account-id');
const account = require('./account');
const profile = require('./profile');
const preferences = require('./preferences');
const authToken = require('./auth-token');

const DataSource = LazyBones({
  accountId,
  account,
  profile,
  authToken
});

module.exports = DataSource;


// account.js

const myAPI = require('../api');

// Can get an account given an accountId

module.exports = ['accountId', ({ accountId }) => {
  return myAPI.getAccount(accountId);
}];


// profile.js

const myAPI = require('../api');

// Can get a profile given a profileId

module.exports = ['profileId', ({ profileId }) => {
  return myAPI.getProfile(profileId);
}];


// account-id.js

// ...or if you already have a profile or an account, can get an account ID from either

module.exports = [
  ['account', ({ account }) => account.id],
  ['profile', ({ profile }) => profile.accountId]
];


// auth-token.js

module.exports = [
  ['account', ({ account }) => account.authToken]
];

```


## How do I use the data source I've created?

The data source is a function that can be used to construct an instance of a data set. You can optionally pass this
function parameters that are specific to the data set instance. Each data set contains its own cache and provides 
methods for retrieving pieces of data. It will follow your dependency tree and determine the most 
efficient path to your data if there are intermediate steps. To benefit from caching, you may want to preserve a data
set instance within a given lifetime, for example an express request/response. Here's an example usage:


```es6
// state-middleware.js

const State = require('./state');

module.exports = (req, res, next) => {
  res.locals.state = State({ profileId: req.query.profileId }); // profileId is a given for the request
  next();
};


// output-token-middleware.js

module.exports = (req, res, next) => {

  /* If we just have `profileId`, the only available path to authToken is:
   *
   * profileId -> profile -> accountId -> account -> authToken
   *
   */

  res.locals.state.authToken().then(token => {
    res.headers['x-auth-token'] = token;
    next();
  });
};


// ensure-active-account.js

module.exports = (req, res, next) => {
  // Since we have already retrieved `account`, `res.locals.state.account()` will resolve immediately.
  
  res.locals.state.account().then(acct => {
    if (acct.status !== 'active') {
      return res.status(403).send('Your account is no-longer active.');
    }
    
    next();
  });
};

```

Hopefully you can see how a data set instance lets you avoid worrying about duplicated or unnecessary data fetches,
and you can centralize all your data retrieval logic, even when called from multiple places.


## What if there are no paths to my data?

If not enough information is present to get the data you request, your request will fail:
 
```es6
const State = require('./state');

const state = new State();

state.authToken().catch(err => {
  console.error(err);   
  // Could not resolve dependency 'account'. You must provide one of the following:
  // account, accountId, profile, or profileId
});
```


## What if there are multiple paths to my data?

The `lazy-bones` engine uses a least-cost path to your data. Essentially it's a general path traversal within a graph,
where the cost of each arc is calculated by maintaining an average of how long it takes to complete each request. This
means that you can provide duplicate ways to get to the same piece of data and automatically use the fastest path.


## How can I retrieve two pieces of state at a time?

`Promise.all` will work:

```es6
Promise.all([
  state.a(),
  state.b()
]).then(([ a, b ]) => {
  // Use the data
});
```

There's also a `get` method:

```es6
state.get('a', 'b').then(({ a, b }) => {
  // Use the data
});
```

...which will sequence things in either series or parallel depending on the dependency graph. One thing to mention: 
`lazy-bones` will wait for already-in-flight requests to complete, so you don't have to worry about duplicate requests
whether already-completed or in-progress.


## How can I track performance in order to optimize my data flows?

Since `lazy-bones` is already keeping track of timings, it also provides those timings via its `EventEmitter` interface:

```es6
const LazyBones = require('lazy-bones');

const DataSource = LazyBones({
  // ...
});

DataSource.on('timing', ({ name, dependencies, waitStartTime, requestStartTime, requestEndTime, duration, totalDuration }) => {
  logTimings(name, duration);
});
```


## What if I don't like Promises?

You don't have to use them. If you pass a Node-style callback to any of the functions, the callback pattern is assumed
instead. Note that callback APIs are tricky to use since a callback may have been invoked with more than one value. 
Unlike `async.auto`, which may convert unexpected multiple values into an Array, if you pass more than one non-error
value to a callback in `lazy-bones`, only the first is used. Explicitly pass an Array or Object for complex return 
values.

Note that you are free to use async functions as well.
