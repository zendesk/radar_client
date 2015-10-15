#!/bin/bash

./node_modules/gluejs/bin/gluejs --include ./lib \
  --npm microee,sfsm \
  --replace engine.io-client=eio,minilog=Minilog \
  --global RadarClient \
  --main lib/index.js \
  --out dist/radar_client.js
