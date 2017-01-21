'use strict';
/**
 * @file supermercato24 dev
 * @subpackage smIoT
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2017
 * @license GPLv3
 */

/*
 * initialize module
 */
var smIoT = require('..'); // require('smIoT')

smIoT({
  broker: {
    host: 'sm.supermercato24.dev'
  }
});
