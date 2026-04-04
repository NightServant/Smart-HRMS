#!/bin/sh
export PATH="$HOME/Library/Application Support/Herd/bin:/usr/local/bin:$PATH"
exec node node_modules/.bin/vite --host
