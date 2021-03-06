var _ = require('underscore'),
   calc = require('../lib/calculate'),
   peerindex = require('../lib/peerindex'),
   klout = require('../lib/klout'),
   async = require('async'),
   moment = require('moment'),
   config = require('../config'),
   ironio = require('node-ironio')(config.IRON_TOKEN),
   project = ironio.projects(config.IRON_PROJECT),
   cache = project.caches('twitter');

var cleanTopicText = function (topics) {
   topics.forEach(function (t) {
      t.text = t.text.replace(/ programming$/i, '');
   });

   return _.sortBy(topics, function (t) { return t.text; });
};

var submitWorker = function (twitter_handle, analyzer, user, callback) {
   user = user || { name: 'Half Empty Anonymous User' };

   var payload = { 
      id: new Date().getTime(),
      handle: twitter_handle,
      analyzer: analyzer,
      requested_by: user.name,
      iron_project: config.IRON_PROJECT,
      iron_token: config.IRON_TOKEN, 
      twitter_consumer_key: config.TWITTER_CONSUMER_KEY,
      twitter_consumer_secret: config.TWITTER_CONSUMER_SECRET,
      twitter_user_api_secret: user.twitter_api_secret,
      twitter_user_api_token: user.twitter_api_token,
      twitter_api_secret: config.TWITTER_API_SECRET,
      twitter_api_token: config.TWITTER_API_TOKEN
   };

   console.log("Sending Payload: ", payload);

   project.tasks.queue({ code_name: 'scorer', payload: JSON.stringify(payload) }, function (err, res) {
      res = res || { tasks: [] };
      callback(err, res.tasks[0].id);
   });
};

module.exports = function (app) {  
   app.get('/clear/:handle', function (req, res) {
      cache.del(req.params.handle.toLowerCase(), function (err, data) {
         res.redirect('/');
         res.end();
      });
   });

   app.get('/analyze/:handle', function (req, res, next) {
      res.setHeader('Content-Type', 'application/json');
               
      var twitter_handle = req.params.handle;
      var analyzer = req.query.analyzer || 'alchemy';

      if (!twitter_handle) {
         res.writeHead(400);
         return res.end('A twitter handle is required.');
      }

      twitter_handle = twitter_handle.toLowerCase().trim();

      cache.get(twitter_handle, function (err, data) {
         if (err) {
            return next(new Error(err));
         }

         if (data) {
            var parsed = JSON.parse(data);
            
            if (parsed && parsed.tweets) {
               var user = parsed.user;
               var tweets = parsed.tweets;

               async.parallel([
                  function (cb) { peerindex.getTopics(twitter_handle, cb); },
                  function (cb) { klout.getTopics(twitter_handle, cb); },
                  function (cb) { klout.getInfluencers(twitter_handle, cb); },
                  function (cb) { calc.history(90, twitter_handle, cb); },
                  function (cb) { calc.score(twitter_handle, cb); },
                  function (cb) { calc.getBubbleData(twitter_handle, cb); },
                  
               ], function (err, results) {
                  var piTopics = results[0] || [];
                  var kTopics = results[1] || [];
                  var influencers = results[2] || [];
                  var history = results[3] || {};
                  var scored = results[4] || {};
                  var bubbleData = results[5] || [];

                  var tweets = [];

                  var result =  {
                     user: user,
                     scored: scored,
                     tweets: tweets,
                     history: history,
                     topics: cleanTopicText(piTopics.concat(kTopics)),
                     influencers: influencers,
                     bubble: bubbleData
                  };

                  res.end(JSON.stringify(result));
               });
            }
            else {
               res.writeHead(404);
               res.end(JSON.stringify(parsed));
            }
         }
         else {
            submitWorker(twitter_handle, analyzer, req.user, function (err, id) {
               res.end(JSON.stringify({ processing: true, id: id, err: err }));
            });
         }
      });
   });

   app.get('/check/:task_id', function (req, res) {
      project.tasks.info(req.params.task_id, function (err, data) {
         res.setHeader('Content-Type', 'application/json');
         res.end(JSON.stringify(data));
      });
   });
}
