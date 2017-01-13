'use strict';

var assert = require('assert');
var mqtt = require('mqtt');

var message = 'helloWorld!';
var userToken0 = 'foo';
var userToken1 = 'bar';
var topic0 = userToken0;
var topic1 = userToken1;
var channel0 = topic0 + '/' + topic0;
var channel1 = topic1 + '/' + topic1;

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

  describe('subscription', function() {

    var client0;
    var topic0 = userToken0;
    var topic1 = userToken1;

    describe('without publishing', function() {

      it('should subscribe to single topic', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            client0.end(done);
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });
      });
      it('should subscribe to multiple topics', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic0, topic1 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              if (i == 0) {
                assert.equal(topics[i].topic, topic0);
              } else {
                assert.equal(topics[i].topic, topic1);
              }
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 2);

            client0.end(done);
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });
      });
    });
  });

  describe('message', function() {

    var client0;

    it('should subscribe to wrong topic', function(done) {

      client0 = mqtt.connect('mqtt://127.0.0.1', {
        reconnectPeriod: 0,
        username: userToken0
      });

      client0.on('connect', function(packet) {

        assert.ok(client0.connected);
        assert.ifError(client0.reconnecting);
        assert.equal(packet.cmd, 'connack');

        client0.subscribe([ topic0 ], function(err, topics) {

          assert.ifError(err);
          for (var i = 0, ii = topics.length; i < ii; ++i) {
            assert.equal(topics[i].topic, topic0);
            assert.equal(topics[i].qos, 0);
          }
          assert.equal(ii, 1);

          broker.publish(channel1, message, function(err, count) {

            assert.ifError(err);
            assert.equal(count, 0);

            client0.end(done);
          });
        });
      }).on('error', function(err) {

        done(new Error('shouldn\'t emit error event'));
      }).on('message', function(topic, message, packet) {

        done(new Error('shouldn\'t emit message event'));
      });
    });

    describe('single topic', function() {

      it('should receive (1/1) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            broker.publish(channel0, message, function(err, count) {

              assert.ifError(err);
              assert.equal(count, 1);
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          client0.end(done);
        });
      });
      it('should receive (2/2) messages', function(done) {

        var counter = 0;

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            broker.publish(channel0, message, function(err, count) {

              assert.ifError(err);
              assert.equal(count, 1);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1);
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          ++counter;

          assert.ok(counter < 3);
          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          if (counter == 2) {
            client0.end(done);
          }
        });
      });
    });

    describe('multiple topics', function() {

      it('should receive (1/1) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic1, topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              if (i == 0) {
                assert.equal(topics[i].topic, topic1);
              } else {
                assert.equal(topics[i].topic, topic0);
              }
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 2);

            broker.publish(channel0, message, function(err, count) {

              assert.ifError(err);
              assert.equal(count, 1);
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          client0.end(done);
        });
      });
      it('should receive (2/2) messages', function(done) {

        var counter = 0;

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic1, topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              if (i == 0) {
                assert.equal(topics[i].topic, topic1);
              } else {
                assert.equal(topics[i].topic, topic0);
              }
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 2);

            broker.publish(channel0, message, function(err, count) {

              assert.ifError(err);
              assert.equal(count, 1);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1);
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          ++counter;

          assert.ok(counter < 3);
          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          if (counter == 2) {
            client0.end(done);
          }
        });
      });
    });
  });

  describe('unsubscription', function() {

    var client0;

    describe('single topic', function() {

      it('should receive (0/1) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            client0.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, 'server is still subscribed to 0');

                client0.end(function(err) {

                  assert.ifError(err);
                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 0);
                    done();
                  });
                });
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          done(new Error('shouldn\'t emit message event'));
        });
      });
      it('should receive (0/2) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            client0.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, 'server is still subscribed to 0');

                broker.publish(channel0, message, function(err, count) {

                  assert.ifError(err);
                  assert.equal(count, 1, 'server is still subscribed to 0');

                  client0.end(function(err) {

                    assert.ifError(err);
                    broker.publish(channel0, message, function(err, count) {

                      assert.ifError(err);
                      assert.equal(count, 0);
                      done();
                    });
                  });
                });
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          done(new Error('shouldn\'t emit message event'));
        });
      });
    });
    describe('multiple topics', function() {

      it('should receive (0/1) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on('connect', function(packet) {

          assert.ok(client0.connected);
          assert.ifError(client0.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client0.subscribe([ topic1, topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              if (i == 0) {
                assert.equal(topics[i].topic, topic1);
              } else {
                assert.equal(topics[i].topic, topic0);
              }
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 2);

            client0.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, 'server is still subscribed to 0');

                client0.end(function(err) {

                  assert.ifError(err);
                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 1, 'server is still subscribed to 1');
                    done();
                  });
                });
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          done(new Error('shouldn\'t emit message event'));
        });
      });
      it('should receive (0/2) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });

        client0.on(
          'connect',
          function(packet) {

            assert.ok(client0.connected);
            assert.ifError(client0.reconnecting);
            assert.equal(packet.cmd, 'connack');

            client0.subscribe([ topic1, topic0 ], function(err, topics) {

              assert.ifError(err);
              for (var i = 0, ii = topics.length; i < ii; ++i) {
                if (i == 0) {
                  assert.equal(topics[i].topic, topic1);
                } else {
                  assert.equal(topics[i].topic, topic0);
                }
                assert.equal(topics[i].qos, 0);
              }
              assert.equal(ii, 2);

              client0.unsubscribe([ topic0 ], function(err, topics) {

                assert.ifError(err);

                broker.publish(channel0, message, function(err, count) {

                  assert.ifError(err);
                  assert.equal(count, 1, 'server is still subscribed to 0');

                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 1, 'server is still subscribed to 0');

                    client0.end(function(err) {

                      assert.ifError(err);
                      broker.publish(channel0, message, function(err, count) {

                        assert.ifError(err);
                        assert.equal(count, 1,
                          'server is still subscribed to 1');
                        done();
                      });
                    });
                  });
                });
              });
            });
          }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          done(new Error('shouldn\'t emit message event'));
        });
      });
    });
  });

});
