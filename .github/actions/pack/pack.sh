#!/bin/bash

# Variables
pluginsDir="plugins"
packDestination="dynamic-plugins-archives"
finalPackDir="ansible-plugins-pack"

# Check if the plugins directory exists
if [ ! -d "$pluginsDir" ]; then
  echo "The directory $pluginsDir does not exist."
  exit 1
fi

# Create the pack destination directory
mkdir -p "$packDestination"

# Loop through each subdirectory in the ./plugins directory
for pluginDir in "$pluginsDir"/*; do
  if [ -d "$pluginDir" ]; then
    echo "Processing $pluginDir..."

    # Change to the plugin directory
    pushd "$pluginDir" > /dev/null

    # Run the build/export/pack commands
    echo "Running yarn install in $pluginDir"
    yarn install
    if [ $? -ne 0 ]; then
      echo "yarn install failed in $pluginDir"
      popd > /dev/null
      continue
    fi

    # Run the set of commands
    echo "Running yarn tsc in $pluginDir"
    yarn tsc
    if [ $? -ne 0 ]; then
      echo "yarn tsc failed in $pluginDir"
      popd > /dev/null
      continue
    fi

    echo "Running yarn build in $pluginDir"
    yarn build
    if [ $? -ne 0 ]; then
      echo "yarn build failed in $pluginDir"
      popd > /dev/null
      continue
    fi

    echo "Running yarn export-dynamic in $pluginDir"
    yarn export-dynamic
    if [ $? -ne 0 ]; then
      echo "yarn export-dynamic failed in $pluginDir"
      popd > /dev/null
      continue
    fi

    echo "Running npm pack in $pluginDir"
    INTEGRITY_HASH=$(npm pack --pack-destination ../../dynamic-plugins-archives --json | jq -r '.[0].integrity')
    echo "Integrity Hash: $INTEGRITY_HASH"
    if [ $? -ne 0 ]; then
      echo "npm pack failed in $pluginDir"
      popd > /dev/null
      continue
    fi

    # Return to the original directory
    popd > /dev/null
  fi
done

echo "Completed processing all plugin directories."

# Create the final pack directory if it doesn't exist
mkdir -p "$finalPackDir"

# Create a tarball of the dynamic-plugins-archives directory
tarballName="ansible-backstage-rhaap-bundle-${GITHUB_REF##*/v}.tar.gz"
tar -czvf "$tarballName" -C "$packDestination" .

# Move the tarball to the final pack directory
mv "$tarballName" "$finalPackDir"

# Copy the content of dynamic-plugins-archives to ansible-plugins-pack
cp -r "$packDestination/." "$finalPackDir/"

# Delete the dynamic-plugins-archives directory
rm -rf "$packDestination"

echo "Tarball created and moved to $finalPackDir"
echo "Contents of dynamic-plugins-archives copied to $finalPackDir"
echo "Deleted dynamic-plugins-archives directory"
