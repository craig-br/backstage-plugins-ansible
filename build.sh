#!/bin/bash
set -euo pipefail
pluginsDir="plugins"

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
npm install --global corepack

# Optimize yarn install performance
export YARN_CACHE_FOLDER=/tmp/yarn-cache
export YARN_ENABLE_GLOBAL_CACHE=true
export NODE_OPTIONS="--max-old-space-size=8192"

# install deps with optimizations
yarn install --immutable --inline-builds

echo "Running tsc"
yarn tsc
echo "tsc completed successfully"

# Build all plugins
echo "Building all plugins"
yarn build

# Handle different build types based on environment variables
if [ "${BUILD_TYPE:-}" = "portal" ]; then
  echo "Building for Portal automation - excluding backstage-rhaap plugin"

  # Create temporary backup
  mkdir -p /tmp/excluded-plugins
  if [ -d "plugins/backstage-rhaap" ]; then
    mv plugins/backstage-rhaap /tmp/excluded-plugins/
  fi

  # Export dynamic plugins for Portal automation
  yarn export-local

  # Restore excluded plugin
  if [ -d "/tmp/excluded-plugins/backstage-rhaap" ]; then
    mv /tmp/excluded-plugins/backstage-rhaap plugins/
  fi
  rm -rf /tmp/excluded-plugins

elif [ "${BUILD_TYPE:-}" = "rhdh" ]; then
  echo "Building for RHDH - including only backstage-rhaap and scaffolder-backend-module-backstage-rhaap"

  # Create temporary backup for non-RHDH plugins
  mkdir -p /tmp/excluded-plugins

  # Move all plugins except the RHDH ones to backup
  for plugin_dir in plugins/*/; do
    plugin_name=$(basename "$plugin_dir")
    if [ "$plugin_name" != "backstage-rhaap" ] && [ "$plugin_name" != "scaffolder-backend-module-backstage-rhaap" ]; then
      if [ -d "$plugin_dir" ]; then
        mv "$plugin_dir" /tmp/excluded-plugins/
      fi
    fi
  done

  # Export only RHDH plugins
  yarn export-local

  # Restore all excluded plugins
  if [ -d "/tmp/excluded-plugins" ]; then
    mv /tmp/excluded-plugins/* plugins/ 2>/dev/null || true
  fi
  rm -rf /tmp/excluded-plugins

else
  echo "Building all plugins (default behavior)"
  # Export all plugins (default behavior)
  yarn export-local
fi

echo "Dynamic plugins built successfully"
