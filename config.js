module.exports = {
   TWITTER_CONSUMER_KEY: process.env.HE_TWITTER_CONSUMER_KEY,
   TWITTER_CONSUMER_SECRET: process.env.HE_TWITTER_CONSUMER_SECRET,
   TWITTER_API_TOKEN: process.env.HE_TWITTER_API_TOKEN,
   TWITTER_API_SECRET: process.env.HE_TWITTER_API_SECRET,
   TWITTER_CALLBACK_URL: process.env.HE_TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback',
   IRON_PROJECT: process.env.HE_IRON_PROJECT_ID,
   IRON_TOKEN: process.env.HE_IRON_TOKEN
};