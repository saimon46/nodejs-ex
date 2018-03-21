var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CounterSchema = new Schema({
  count: Number,
  time: Date
});

module.exports = mongoose.model('counter', CounterSchema);
