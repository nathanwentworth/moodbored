var teeny = require('teeny-conf');

var config = new teeny('config.json');
config.loadOrCreateSync();

module.exports = config;