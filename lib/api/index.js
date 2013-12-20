/**
 * Dependencies
 */
var express = require('express');

/**
 * Local Vars
 */
var app = module.exports = express();

app.use('/app', require('./api.app.js'));
app.use('/api', require('./api.service.js'));
app.use('/service', require('./api.service.js'));
app.use('/upstream', require('./api.upstream.js'));
app.use('/event', require('./api.change.js'));
