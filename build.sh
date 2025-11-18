#!/bin/bash
set -euo pipefail
YARN_CMD="yarn"

# Optimize build performance
export NODE_OPTIONS="--max-old-space-size=16384"
PARENT_DIR="$(pwd)"

cd ansible-backstage-plugins

$YARN_CMD install --immutable || {
    echo "Yarn install failed, but continuing with available packages..."
    echo "This may be due to native package build failures in hermetic environment"
}

echo "Running tsc"
$YARN_CMD tsc
echo "tsc completed successfully"

# Build all plugins
echo "Building all plugins"
$YARN_CMD build

# Handle different build types based on environment variables
if [ "${BUILD_TYPE:-}" = "portal" ]; then
  echo "Building for Portal automation - excluding backstage-rhaap plugin"

  # Remove backstage-rhaap plugin for portal builds
  if [ -d "plugins/backstage-rhaap" ]; then
    rm -rf plugins/backstage-rhaap
  fi

  # Export dynamic plugins for Portal automation
  $YARN_CMD janus-cli package package-dynamic-plugins --export-to "${PARENT_DIR}/dynamic-plugins"

elif [ "${BUILD_TYPE:-}" = "rhdh" ]; then
  echo "Building for RHDH - including only backstage-rhaap and scaffolder-backend-module-backstage-rhaap"

  # Remove all plugins except the RHDH ones
  for plugin_dir in plugins/*/; do
    plugin_name=$(basename "$plugin_dir")
    if [ "$plugin_name" != "backstage-rhaap" ] && [ "$plugin_name" != "scaffolder-backend-module-backstage-rhaap" ]; then
      if [ -d "$plugin_dir" ]; then
        rm -rf "$plugin_dir"
      fi
    fi
  done

  # Export only RHDH plugins
  $YARN_CMD janus-cli package package-dynamic-plugins --export-to "${PARENT_DIR}/dynamic-plugins"

else
  echo "Building all plugins (default behavior)"
  # Export all plugins (default behavior)
  $YARN_CMD janus-cli package package-dynamic-plugins --export-to "${PARENT_DIR}/dynamic-plugins"
fi

echo "Dynamic plugins built successfully"
