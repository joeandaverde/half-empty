var ironio = require('node-ironio')('nfFVh41-R6ZkFU0SzGOgzJM9JCk')
  , project = ironio.projects('51bbd144ed3d766cf3000ab6')
  , twitterCache = project.caches('twitter')
  , scoreCache = project.caches('score')
  , request = require('request')
  , twitter = require('./lib/twitter')
  , alchemy = require('./lib/alchemy');

console.log('Scoring Worker');

require('./lib/payload_parser').parse_payload(process.argv, function (payload) {
   if(!payload.handle) {
      console.error('No twitter handle defined.');
      process.exit(1);
   }
   twitter.getTweets(payload.handle, function(err, tweets) {
      if(err) {
         if (err.statusCode == 404) {
            twitterCache.put(payload.handle, 'null', function(err, msg) {
               if(err) {
                  console.error('Failed to put to cache. ', err);
                  process.exit(1);
               }
               console.log('Twitter user \'' + payload.handle + '\' doesn\'t exist, but we were successful anyway.' + JSON.stringify(msg));
               process.exit(0);
            })
         }
         else {
            console.error('Failed to retrieve tweets for user: ' + payload.handle, err);
            process.exit(1);
         }
         return;
      }
      alchemy.analyzeTweets(tweets, function(err, analyzedTweets) {
         if(err) {
            console.error('Failed to analyze tweets for user: ' + payload.handle, err);
            process.exit(1);
         }
         for (var i = analyzedTweets.length - 1; i >= 0; i--) {
            console.log(JSON.stringify({ 
               tweet: {
                  text: analyzedTweets[i].text,
                  sentiment: analyzedTweets[i].sentiment
               }
            }, null, 2));
         };
         var score = require('./lib/calculate').score(analyzedTweets);
         scoreCache.put(payload.handle, JSON.stringify(score), function(err, msg) {
            if(err) {
               console.error('Failed to put to cache. ', err);
               process.exit(1);
            }
            console.log('Successfully stored ' + payload.handle + '\'s score (' + score.overallScore.toFixed(3) + ') ' + JSON.stringify(msg));
         });
         twitterCache.put(payload.handle, JSON.stringify(tweets), function(err, msg) {
            if(err) {
               console.error('Failed to put to cache. ', err);
               process.exit(1);
            }
            console.log('Successfully stored ' + payload.handle + '\'s tweets! ' + JSON.stringify(msg));
         });
      });
   });
});