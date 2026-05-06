const lambda = require('./lambda');
const arguments_list = require('./arguments_list');

module.exports = {
  ...lambda,
  ...arguments_list,
}