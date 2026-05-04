const definition = require('./definition');
const arguments_list = require('./arguments_list');
const lambda = require('./lambda');

module.exports = {
  ...definition,
  ...arguments_list,
  ...lambda,
}