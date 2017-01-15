'use strict';

var assert = require('assert');
var mqtt = require('mqtt');

var message = 'helloWorld!';
var userToken0 = 'foo';
var topic0 = userToken0;
var topic1 = 'bar';
var channel0 = topic0 + '/' + topic0;
var channel1 = topic1 + '/' + topic1;

describe('same user', function() {

  var broker;
  var server;
  var doneCounter = 0;
  var publishCounter = 0;

  before(function(done) {

    broker = require('../lib/broker');
    broker = new broker.Client().client;
    broker.once('ready', function() {

      broker.set(userToken0, userToken0, function(err) {

        assert.ifError(err);
        done();
      });
    });
  });

  before(function(done) {

    server = require('..');
    done();
  });

  beforeEach(function(done) {

    doneCounter = publishCounter = 0;
    done();
  });

  describe('subscription', function() {

    var client0;
    var client1;

    describe('without publishing', function() {

      it('should subscribe to single topic', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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

            client0.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            client1.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
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
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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

            client0.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic0, topic1 ], function(err, topics) {

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

            client1.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        });
      });
    });
  });

  describe('message', function() {

    var client0;
    var client1;

    describe('single topic', function() {

      it('should receive (1/1) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.equal(publishCounter, 2);
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

          client0.end(function(err) {

            assert.ifError(err);
            if (++doneCounter == 2) {
              assert.equal(doneCounter, 2);
              done();
            }
          });
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.equal(publishCounter, 2);
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

          client1.end(function(err) {

            assert.ifError(err);
            if (++doneCounter == 2) {
              assert.equal(doneCounter, 2);
              done();
            }
          });
        });
      });
      it('should receive (2/2) messages', function(done) {

        var counter0 = 0;
        var counter1 = 0;

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.equal(publishCounter, 2);
              assert.ifError(err);
              assert.equal(count, 1);

              broker.publish(channel0, message, function(err, count) {

                assert.equal(publishCounter, 2);
                assert.ifError(err);
                assert.equal(count, 1);
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          ++counter0;

          assert.ok(counter0 < 3);
          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          if (counter0 == 2) {
            client0.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
          }
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.equal(publishCounter, 2);
              assert.ifError(err);
              assert.equal(count, 1);

              broker.publish(channel0, message, function(err, count) {

                assert.equal(publishCounter, 2);
                assert.ifError(err);
                assert.equal(count, 1);
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          ++counter1;

          assert.ok(counter1 < 3);
          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          if (counter1 == 2) {
            client1.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
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
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.ifError(err);
              assert.equal(count, 1);
              assert.equal(publishCounter, 2);
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          client0.end(function(err) {

            assert.ifError(err);
            if (++doneCounter == 2) {
              assert.equal(doneCounter, 2);
              done();
            }
          });
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic1, topic0 ], function(err, topics) {

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

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.ifError(err);
              assert.equal(count, 1);
              assert.equal(publishCounter, 2);
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          client1.end(function(err) {

            assert.ifError(err);
            if (++doneCounter == 2) {
              assert.equal(doneCounter, 2);
              done();
            }
          });
        });
      });
      it('should receive (2/2) messages', function(done) {

        var counter0 = 0;
        var counter1 = 0;

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.equal(publishCounter, 2);
              assert.ifError(err);
              assert.equal(count, 1);

              broker.publish(channel0, message, function(err, count) {

                assert.equal(publishCounter, 2);
                assert.ifError(err);
                assert.equal(count, 1);
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          ++counter0;

          assert.ok(counter0 < 3);
          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          if (counter0 == 2) {
            client0.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
          }
        });

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic1, topic0 ], function(err, topics) {

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

            if (++publishCounter == 2) {
              return;
            }
            broker.publish(channel0, message, function(err, count) {

              assert.equal(publishCounter, 2);
              assert.ifError(err);
              assert.equal(count, 1);

              broker.publish(channel0, message, function(err, count) {

                assert.equal(publishCounter, 2);
                assert.ifError(err);
                assert.equal(count, 1);
              });
            });
          });
        }).on('error', function(err) {

          done(new Error('shouldn\'t emit error event'));
        }).on('message', function(topic, message, packet) {

          ++counter1;

          assert.ok(counter1 < 3);
          assert.equal(topic, topic0);
          assert.equal(message.toString(), message);
          assert.equal(packet.cmd, 'publish');

          if (counter1 == 2) {
            client1.end(function(err) {

              assert.ifError(err);
              if (++doneCounter == 2) {
                assert.equal(doneCounter, 2);
                done();
              }
            });
          }
        });
      });
    });
  });

  describe('unsubscription', function() {

    var statement = 'server is still subscribed to ';
    var client0;
    var client1;

    describe('single topic', function() {

      it('should receive (0/1) message', function(done) {

        client0 = mqtt.connect('mqtt://127.0.0.1', {
          reconnectPeriod: 0,
          username: userToken0
        });
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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
                assert.equal(count, 1, statement + 0);

                client0.end(function(err) {

                  assert.ifError(err);
                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 0);
                    if (++doneCounter == 2) {
                      assert.equal(doneCounter, 2);
                      done();
                    }
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

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            client1.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, statement + 0);

                client1.end(function(err) {

                  assert.ifError(err);
                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 0);
                    if (++doneCounter == 2) {
                      assert.equal(doneCounter, 2);
                      done();
                    }
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
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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
                assert.equal(count, 1, statement + 0);

                broker.publish(channel0, message, function(err, count) {

                  assert.ifError(err);
                  assert.equal(count, 1, statement + 0);

                  client0.end(function(err) {

                    assert.ifError(err);
                    broker.publish(channel0, message, function(err, count) {

                      assert.ifError(err);
                      assert.equal(count, 0);
                      if (++doneCounter == 2) {
                        assert.equal(doneCounter, 2);
                        done();
                      }
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

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic0 ], function(err, topics) {

            assert.ifError(err);
            for (var i = 0, ii = topics.length; i < ii; ++i) {
              assert.equal(topics[i].topic, topic0);
              assert.equal(topics[i].qos, 0);
            }
            assert.equal(ii, 1);

            client1.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, statement + 0);

                broker.publish(channel0, message, function(err, count) {

                  assert.ifError(err);
                  assert.equal(count, 1, statement + 0);

                  client1.end(function(err) {

                    assert.ifError(err);
                    broker.publish(channel0, message, function(err, count) {

                      assert.ifError(err);
                      assert.equal(count, 0);
                      if (++doneCounter == 2) {
                        assert.equal(doneCounter, 2);
                        done();
                      }
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
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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
                assert.equal(count, 1, statement + 0);

                client0.end(function(err) {

                  assert.ifError(err);
                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 1, statement + 1);
                    if (++doneCounter == 2) {
                      assert.equal(doneCounter, 2);
                      done();
                    }
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

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic1, topic0 ], function(err, topics) {

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

            client1.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, statement + 0);

                client1.end(function(err) {

                  assert.ifError(err);
                  broker.publish(channel0, message, function(err, count) {

                    assert.ifError(err);
                    assert.equal(count, 1, statement + 1);
                    if (++doneCounter == 2) {
                      assert.equal(doneCounter, 2);
                      done();
                    }
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
        client1 = mqtt.connect('mqtt://127.0.0.1', {
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
                assert.equal(count, 1, statement + 0);

                broker.publish(channel0, message, function(err, count) {

                  assert.ifError(err);
                  assert.equal(count, 1, statement + 0);

                  client0.end(function(err) {

                    assert.ifError(err);
                    broker.publish(channel0, message, function(err, count) {

                      assert.ifError(err);
                      assert.ok(count <= 1, statement + 1);
                      if (++doneCounter == 2) {
                        assert.equal(doneCounter, 2);
                        done();
                      }
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

        client1.on('connect', function(packet) {

          assert.ok(client1.connected);
          assert.ifError(client1.reconnecting);
          assert.equal(packet.cmd, 'connack');

          client1.subscribe([ topic1, topic0 ], function(err, topics) {

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

            client1.unsubscribe([ topic0 ], function(err, topics) {

              assert.ifError(err);

              broker.publish(channel0, message, function(err, count) {

                assert.ifError(err);
                assert.equal(count, 1, statement + 0);

                broker.publish(channel0, message, function(err, count) {

                  assert.ifError(err);
                  assert.equal(count, 1, statement + 0);

                  client1.end(function(err) {

                    assert.ifError(err);
                    broker.publish(channel0, message, function(err, count) {

                      assert.ifError(err);
                      assert.ok(count <= 1, statement + 1);
                      if (++doneCounter == 2) {
                        assert.equal(doneCounter, 2);
                        done();
                      }
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
