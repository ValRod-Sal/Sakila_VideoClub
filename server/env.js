'use strict';
const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch { }
