'use strict';

var assert = require('assert');
var mqtt = require('mqtt');

var userToken0 = 'foo';
var userToken1 = 'bar';

describe('clients', function() {

  var broker;
  var server;

  before(function(done) {

    broker = require('../lib/broker');
    broker = new broker.Client().client;
    broker.once('ready', function() {

      broker.del([ userToken0, userToken1 ], done);
    });
  });

  before(function(done) {

    server = require('..');
    done();
  });

  describe('connection', function() {

    var client0;
    var client1;

    describe('error', function() {

      it('shouldn\'t connect without username', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0
        });

        client0.on('connect', function() {

          done(new Error('shouldn\'t emit connect event'));
        }).on('error', function(err) {

          assert.ok(/Connection refused: Not authorized/.test(err));
          assert.ifError(client0.connected);
          assert.ifError(client0.reconnecting);
          done();
        });
      });
      it('shouldn\'t connect without valid username', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function() {

          done(new Error('shouldn\'t emit connect event'));
        }).on('error', function(err) {

          assert.ok(/Connection refused: Bad username or password/.test(err));
          assert.ifError(client0.connected);
          assert.ifError(client0.reconnecting);
          done();
        });
      });
    });

    describe('connect0', function() {

      before(function(done) {

        broker.set(userToken0, userToken0, function(err) {

          assert.ifError(err);
          done();
        });
      });

      it('should connect with valid username', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');
          client0.end(done);
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });
      });
    });

    describe('connect1', function() {

      before(function(done) {

        broker.set(userToken1, userToken1, function(err) {

          assert.ifError(err);
          done();
        });
      });

      it('should connect with valid username', function(done) {

        client1 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken1
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');
          client1.end(done);
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });
      });
    });
  });
});
