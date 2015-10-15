var Glue = require('gluejs'),
    fs = require('fs'),
    base = process.cwd(), 
    out = './dist/radar_client.js';

if (!fs.existsSync(base + '/dist')) {
  fs.mkdirSync(base + '/dist');
}

new Glue()
  .set('verbose', true)
  .basepath('./lib')
  .include('.')
  .main('index.js')
  .exclude('test')
  .include('../node_modules/sfsm')
  .include('../node_modules/microee')
  .include('../node_modules/radar_message')
  .replace({ 
    minilog: 'Minilog',
    'engine.io-client' : 'eio'
  })
  .export('RadarClient')
  .render(function(err, text) {
    fs.writeFile(base + '/dist/radar_client.js', text);
  });

