var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CounterSchema = new Schema({
  count: Number
});

module.exports = mongoose.model('counter', CounterSchema);