#!/bin/bash

pluginDir="$1"

mkdir -p dynamic-plugins-archives

echo "Processing $pluginDir..."

# Change to the plugin directory
pushd "$pluginDir" > /dev/null

# Run the build/export/pack commands
echo "Running yarn install in $pluginDir"
yarn install
if [ $? -ne 0 ]; then
  echo "yarn install failed in $pluginDir"
  popd > /dev/null
  exit 1
fi

# Run the set of commands
echo "Running yarn tsc in $pluginDir"
yarn tsc
if [ $? -ne 0 ]; then
  echo "yarn tsc failed in $pluginDir"
  popd > /dev/null
  exit 1
fi

echo "Running yarn build in $pluginDir"
yarn build
if [ $? -ne 0 ]; then
  echo "yarn build failed in $pluginDir"
  popd > /dev/null
  exit 1
fi

echo "Running yarn export-dynamic in $pluginDir"
yarn export-dynamic
if [ $? -ne 0 ]; then
  echo "yarn export-dynamic failed in $pluginDir"
  popd > /dev/null
  exit 1
fi

echo "Running npm pack in $pluginDir"
pack_json=$(npm pack --pack-destination ../../dynamic-plugins-archives --json)
echo "Integrity Hash: $pack_json"
if [ $? -ne 0 ]; then
  echo "npm pack failed in $pluginDir"
  popd > /dev/null
  exit 1
fi

echo "Creating package.integrity file"
filename=$(echo "$pack_json" | jq -r '.[0].filename')
integrity=$(echo "$pack_json" | jq -r '.[0].integrity')
echo "$integrity" > ../../dynamic-plugins-archives/${filename}.integrity

# Return to the original directory
popd > /dev/null
