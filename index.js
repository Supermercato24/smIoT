'use strict';
/**
 * @file smIoT main
 * @subpackage smIoT
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2017
 * @license GPLv3
 */

var EventEmitter = require('events');
var net = require('net');
var logger = require('logger-request');
var mqttConnection = require('mqtt-connection');
var protect = require('protect');

var broker = require('./lib/broker');

var returnCode = {
  CONNECTION_ACCEPTED: 0x00,
  CONNECTION_REFUSED_UNACCEPTABLE_PROTOCOL: 0x01, // unacceptable protocol version
  CONNECTION_REFUSED_IDENTIFIER_REJECTED: 0x02, // identifier rejected
  CONNECTION_REFUSED_SERVER_UNAVAILABLE: 0x03, // service is unavailable
  CONNECTION_REFUSED_BAD_CREDENTIALS: 0x04, // user name or password is malformed
  CONNECTION_REFUSED_NOT_AUTHORIZED: 0x05, // client is not authorized to connect
  SUBSCRIPTION_QOS_0: 0x00, // maximum QoS 0
  SUBSCRIPTION_QOS_1: 0x01, // maximum QoS 1
  SUBSCRIPTION_QOS_2: 0x02, // maximum QoS 2
  SUBSCRIPTION_FAILURE: 0x80, // failure
};

/**
 * function wrapper
 * 
 * @function wrapper
 * @param {Object} options - parsed options
 * @returns {net.Server}
 */
function wrapper(options) {

  var dispatcher = new EventEmitter();
  var serverInterface = new net.Server();
  var brokerInterface = new broker.Client(options.broker).client;
  var consumerInterface = brokerInterface.duplicate();
  var log = logger(options.logger);

  dispatcher.setMaxListeners(options.maxListeners);

  /**
   * move consumer outside from server. Otherwise duplicated messages are sent from every client, using dispatcher
   */
  consumerInterface.on('message_buffer', function(channel, message) {

    var channelString = channel.toString();
    var funnels = channelString.split('/');
    var userId = funnels[0];

    if (dispatcher.emit(userId, funnels.slice(1).join('/'), message)) { // had user
      // pass
    } else { // remove subscriber
      consumerInterface.unsubscribe(channelString);
    }
  });

  /**
   * transform net stream into mqtt client
   */
  serverInterface.on('connection', function(stream) {

    stream.setKeepAlive(options.keepAlive);
    stream.setNoDelay(options.noDelay);
    stream.setTimeout(options.timeout);
    var client = mqttConnection(stream);

    /**
     * connection between broker interface and server interface
     * 
     * @function publisher
     * @param {Buffer} channel - client topic
     * @param {Buffer} message - client message
     * @param {Boolean} [pingreq] - check if this eventListener is alive
     */
    var publisher = function(channel, message, pingreq) {

      if (pingreq) {
        return;
      }

      if (client.authorized && client.topics[client.topicPrefix + channel]) {
        client.publish({
          qos: returnCode.SUBSCRIPTION_QOS_0,
          topic: channel,
          payload: message
        });
      }
    };

    client.once('connect', function(packet) {

      /**
       * <pre>
       * `version`: the protocol version string
       * `versionNum`: the protocol version number
       * `keepalive`: the client's keepalive period
       * `clientId`: the client's ID
       * `will`: an object with the following keys:
       *   `topic`: the client's will topic
       *   `payload`: the will message
       *   `retain`: will retain flag
       *   `qos`: will qos level
       * `clean`: clean start flag
       * `username`: v3.1 username
       * `password`: v3.1 password
       * </pre>
       */

      stream.pause(); // pauses the reading of data

      var response = {
        returnCode: returnCode.CONNECTION_REFUSED_SERVER_UNAVAILABLE
      };

      var userToken = packet.username;
      if (!userToken) {
        response.returnCode = returnCode.CONNECTION_REFUSED_NOT_AUTHORIZED;
        stream.resume();
        client.connack(response);
        return;
      }

      brokerInterface.get(userToken, function(err, userId) {

        if (err) {
          log('connect', {
            pid: process.pid,
            error: err.message,
            stack: err.stack
          });
        } else if (userId) { // client init

          dispatcher.on(userId, publisher);

          client.authorized = true;
          client.topics = {};
          client.clientId = packet.clientId;
          client.userId = userId;
          client.userToken = userToken;
          client.topicPrefix = userId + '/';

          response.returnCode = returnCode.CONNECTION_ACCEPTED;

          log('connect', {
            pid: process.pid,
            userId: userId,
            clientId: packet.clientId
          });
        } else {
          response.returnCode = returnCode.CONNECTION_REFUSED_BAD_CREDENTIALS;
        }

        stream.resume();
        client.connack(response);
      });
    });

    client.on('subscribe', function(packet) {

      var response = {
        messageId: packet.messageId,
        granted: []
      };

      var channels = [];
      var notGranted = [];
      var subscriptions = {};
      for (var i = 0, ii = packet.subscriptions.length; i < ii; ++i) {
        var topic = packet.subscriptions[i].topic;
        notGranted[i] = returnCode.SUBSCRIPTION_FAILURE;

        if (client.authorized) {
          response.granted[i] = returnCode.SUBSCRIPTION_QOS_0;
          topic = client.topicPrefix + topic;

          if (subscriptions[topic] === undefined) { // unique
            subscriptions[topic] = true;
            channels[i] = topic;
          }
        }
      }

      if (client.authorized === false) {
        response.granted = notGranted;
        client.suback(response);
        return;
      }

      // https://github.com/NodeRedis/node_redis/issues/1188
      consumerInterface.subscribe(channels, function(err, latestChannel) {

        if (err) {
          log('subscribe', {
            pid: process.pid,
            error: err.message,
            stack: err.stack
          });

          response.granted = notGranted;
        } else if (latestChannel) {
          Object.assign(client.topics, subscriptions);
        } else {
          response.granted = notGranted;
        }
        client.suback(response);
      });
    });

    client.on('unsubscribe', function(packet) {

      var response = {
        messageId: packet.messageId
      };

      if (!client.authorized) {
        client.unsuback(response);
        return;
      }

      var unsubscriptions = [];
      for (var i = 0, ii = packet.unsubscriptions.length; i < ii; ++i) {
        var topic = client.topicPrefix + packet.unsubscriptions[i];

        if (client.topics[topic]) {
          unsubscriptions.push(topic);
          delete (client.topics[topic]);
        }
      }

      client.unsuback(response);
    });

    client.on('pingreq', function() {

      if (client.authorized) {
        client.pingresp();
      } else if (client.stream.destroyed === false) {
        client.destroy();
      }
    });

    client.once('close', function() {

      log('close', {
        pid: process.pid,
        userId: client.userId,
        clientId: client.clientId
      });

      if (client.stream.destroyed === false) {
        client.destroy();
      }

      if (!client.authorized) {
        return;
      }

      client.authorized = false;
      dispatcher.removeListener(client.userId, publisher);

      var unsubscriptions = Object.keys(client.topics);
      if (!unsubscriptions) {
        return;
      }

      if (!dispatcher.emit(client.userId, [], true)) {
        consumerInterface.unsubscribe(unsubscriptions, function(err) {

          if (err) {
            log('close', {
              pid: process.pid,
              error: err.message,
              stack: err.stack
            });

          } else {
            client.topics = {};
          }
        });
      }
    });

    client.once('disconnect', function() {

      if (client.stream.destroyed === false) {
        client.destroy();
      }
    });

    client.once('error', function(err) {

      log('mqtt', {
        pid: process.pid,
        error: err.message,
        stack: err.stack
      });

      if (client.stream.destroyed === false) {
        client.destroy();
      }
    });

    stream.once('timeout', function() {

      if (client.stream.destroyed === false) {
        client.destroy();
      }
    });
  });

  serverInterface.on('error', function(err) {

    log('server', {
      pid: process.pid,
      error: err.message,
      stack: err.stack
    });
  });

  brokerInterface.on('error', function(err) {

    log('broker', {
      pid: process.pid,
      error: err.message,
      stack: err.stack
    });
  });

  brokerInterface.once('ready', function() {

    serverInterface.listen(options.net);
  });

  return serverInterface;
}

/**
 * option setting
 * 
 * @exports smIoT
 * @function smIoT
 * @param {Object} options - various options. Check README.md
 * @returns {net.Server}
 */
function smIoT(options) {

  var ops = options || {};

  var netDefaultOptions = {
    port: 1883,
    host: '0.0.0.0',
    exclusive: false,
  };
  var brokerDefaultOptions = {
    enable_offline_queue: false
  };
  var loggerDefaultOptions = {
    filename: 'IoT',
    standalone: true,
    daily: true,
    winston: {
      level: 'debug',
      json: false
    }
  };

  return wrapper(protect({
    net: Object.assign(netDefaultOptions, ops.net),
    broker: Object.assign(brokerDefaultOptions, ops.broker),
    logger: Object.assign(loggerDefaultOptions, ops.logger),
    maxListeners: Number(ops.maxListeners) || 10, // 0 means unlimited
    keepAlive: Boolean(ops.keepAlive),
    noDelay: ops.noDelay == false ? false : true,
    timeout: Number(ops.timeout) || 0, // 0 means disabled
  }));
}

module.exports = smIoT;
