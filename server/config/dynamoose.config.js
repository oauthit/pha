var dynamoose = require('dynamoose');

dynamoose.defaults.waitForActiveTimeout = 100;
dynamoose.AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "eu-west-1"
});

module.exports = dynamoose;
