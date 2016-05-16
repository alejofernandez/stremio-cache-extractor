#!/usr/bin/env node
const path = require('path');
const extractFilesFromCache = require('../src').extractFilesFromCache;

extractFilesFromCache()
  .then(files => files.forEach(file =>
    console.log(`${file.skipped ? 'Skipped' : 'Successfully extracted'} => ${path.basename(file.destination)}`)
  ))
;
