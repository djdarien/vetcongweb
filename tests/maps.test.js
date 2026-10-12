// Basic tests for map functionality
// Run: node tests/maps.test.js

const fs = require('fs');
const path = require('path');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('PASS:', msg);
}

const mainJs = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// Map selector present
assert(indexHtml.includes('id="mapSelect"'), 'mapSelect dropdown exists');
assert(indexHtml.includes('value="stream"'), 'Stream option present');
assert(indexHtml.includes('value="halong"'), 'Halong Port option present');

// Map builders exist
assert(mainJs.includes('function buildStream'), 'buildStream function defined');
assert(mainJs.includes('function buildHalong'), 'buildHalong function defined');
assert(mainJs.includes('function initMap'), 'initMap function defined');

// Stream map elements
assert(mainJs.includes('buildStream()'), 'Stream is default or selectable');
assert(/water\s*=\s*new THREE\.Mesh/.test(mainJs), 'Water mesh created in maps');

// Halong elements
assert(mainJs.includes('pier'), 'Piers created for Halong');
assert(mainJs.includes('warehouse'), 'Warehouses created for Halong');

// Map switch logic
assert(mainJs.includes('initMap(e.target.value)'), 'Map change handler wired');
assert(mainJs.includes('currentMap'), 'currentMap state tracked');

// Multiplayer still present
assert(mainJs.includes('new WebSocket'), 'WebSocket multiplayer client present');
assert(mainJs.includes('type: \'update\''), 'Position update message sent');

console.log('\nAll map tests passed.');
