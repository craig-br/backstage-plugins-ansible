#!/bin/bash
set -euo pipefail

# Optimize build performance
export NODE_OPTIONS="--max-old-space-size=8192"

# Run yarn install using Cachi2's pre-built dependencies
echo "Setting up node_modules from Cachi2 pre-built dependencies..."
# Install with graceful handling of build failures
node .yarn/releases/yarn-4.9.2.cjs install --immutable || {
    echo "Yarn install failed, but continuing with available packages..."
    echo "This may be due to native package build failures in hermetic environment"
}

echo "Running tsc"
node .yarn/releases/yarn-4.9.2.cjs tsc
echo "tsc completed successfully"

# Build all plugins
echo "Building all plugins"
node .yarn/releases/yarn-4.9.2.cjs build

# Handle different build types based on environment variables
if [ "${BUILD_TYPE:-}" = "portal" ]; then
  echo "Building for Portal automation - excluding backstage-rhaap plugin"

  # Remove backstage-rhaap plugin for portal builds
  if [ -d "plugins/backstage-rhaap" ]; then
    rm -rf plugins/backstage-rhaap
  fi

  # Export dynamic plugins for Portal automation
  node .yarn/releases/yarn-4.9.2.cjs export-local

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
  node .yarn/releases/yarn-4.9.2.cjs export-local

else
  echo "Building all plugins (default behavior)"
  # Export all plugins (default behavior)
  node .yarn/releases/yarn-4.9.2.cjs export-local
fi

echo "Dynamic plugins built successfully"
