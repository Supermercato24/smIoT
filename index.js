'use strict';

var EventEmitter = require('events');
var net = require('net');
var mqttConnection = require('mqtt-connection');

var broker = require('./lib/broker');

var serverInterface = new net.Server();
var brokerClient = new broker.Client().client;
var consumerInterface = brokerClient.duplicate();
var dispatcher = new EventEmitter();

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

serverInterface.on('connection', function(stream) {

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

  client.on('connect', function(packet) {

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

    var response = {
      returnCode: returnCode.CONNECTION_REFUSED_SERVER_UNAVAILABLE
    };

    var userToken = packet.username;
    if (!userToken) {
      response.returnCode = returnCode.CONNECTION_REFUSED_NOT_AUTHORIZED;
      return client.connack(response);
    }

    brokerClient.get(userToken, function(err, userId) {

      if (err) {
        // pass
      } else if (userId) { // client init
        response.returnCode = returnCode.CONNECTION_ACCEPTED;
        client.authorized = true;
        client.topics = {};
        client.userId = userId;
        client.userToken = userToken;
        client.topicPrefix = userId + '/';
        dispatcher.on(userId, publisher);
      } else {
        response.returnCode = returnCode.CONNECTION_REFUSED_BAD_CREDENTIALS;
      }
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
      return client.suback(response);
    }

    // https://github.com/NodeRedis/node_redis/issues/1188
    consumerInterface.subscribe(channels, function(err, latestChannel) {

      if (err) {
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
      return client.unsuback(response);
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
    } else {
      client.destroy();
    }
  });

  client.on('close', function() {

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
          // pass
        } else {
          client.topics = {};
        }
      });
    }
  });

  client.on('disconnect', function() {

    client.destroy();
  });

  client.on('error', function(err) {

    console.error('mqtt err', err);
    client.destroy();
  });

  client.on('timeout', function() {

    console.log('timeout');
    client.destroy();
  });
}).listen(1883);
