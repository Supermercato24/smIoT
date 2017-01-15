'use strict';

var redis = require('redis');

function Client() {

  /**
   * <pre>
   * `host`: IP address of the Redis server
   * `port`: Port of the Redis server
   * `path`: The UNIX socket string of the Redis server
   * `url`: The URL of the Redis server
   * `enable_offline_queue`: commands are added to a queue and are executed once the connection has been established
   * </pre>
   */
  this.cfg = {
    enable_offline_queue: false
  };

  this.client;

  this.__init__.apply(this, arguments);
}

Client.prototype.__init__ = function(options) {

  Object.assign(this.cfg, options);

  this.client = redis.createClient(this.cfg);

};

module.exports.Client = Client;
