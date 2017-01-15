'use strict';

var assert = require('assert');
var mqtt = require('mqtt');

var userToken0 = 'foo';
var userToken1 = 'bar';

describe('error', function() {

  var broker;
  var server;

  before(function(done) {

    broker = require('../lib/broker');
    broker = new broker.Client({
      host: 'sm.supermercato24.dev',
    }).client;
    broker.once('ready', function() {

      broker.del([ userToken0, userToken1 ], done);
    }).on('error', function(err) {

      done(new Error('shouldn\'t emit error event'));
    });
  });

  before(function(done) {

    broker.set(userToken0, userToken0, function(err) {

      assert.ifError(err);
      done();
    });
  });

  before(function(done) {

    broker.set(userToken1, userToken1, function(err) {

      assert.ifError(err);
      done();
    });
  });

  describe('timeout', function() {

    var client0;
    var client1;

    before(function(done) {

      server = require('..')({
        timeout: 50
      });
      server.once('listening', done).on('error', function(err) {

        done(new Error('shouldn\'t emit error event'));
      });
    });

    it('should connect0 and raise timeout', function(done) {

      client0 = mqtt.connect('mqtt://127.0.0.1', {
        reconnectPeriod: 0,
        username: userToken0
      });

      client0.on('connect', function(packet) {

        assert.ok(client0.connected);
        assert.ifError(client0.reconnecting);
        assert.equal(packet.cmd, 'connack');

        setTimeout(function() {

          assert.equal(client0.connected, false);
          assert.ifError(client0.reconnecting);
          done();
        }, 100);
      }).on('error', function(err) {

        done(new Error('shouldn\'t emit error event'));
      });
    });

    it('should connect1 and raise timeout', function(done) {

      client1 = mqtt.connect('mqtt://127.0.0.1', {
        reconnectPeriod: 0,
        username: userToken1
      });

      client1.on('connect', function(packet) {

        assert.ok(client1.connected);
        assert.ifError(client1.reconnecting);
        assert.equal(packet.cmd, 'connack');

        setTimeout(function() {

          assert.equal(client1.connected, false);
          assert.ifError(client1.reconnecting);
          done();
        }, 100);
      }).on('error', function(err) {

        done(new Error('shouldn\'t emit error event'));
      });
    });

    after(function(done) {

      server.close();
      done();
    });

  });

  after(function(done) {

    broker.quit();
    done();
  });

});
