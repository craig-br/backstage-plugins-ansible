#!/bin/bash

set -e
set -u

# Variables
pluginsDir="plugins"
packDestination="dynamic-plugins-archives"
finalPackDir="ansible-plugins-pack"
sourcePackDir="ansible-backstage-plugins-source-code"

OCI_REGISTRY_NAMESPACE=${OCI_REGISTRY_NAMESPACE:-quay.io/ansible/ansible-backstage-plugins}
OCI_IMAGE_PUSH=${OCI_IMAGE_PUSH:-false}
echo OCI_IMAGE_PUSH="$OCI_IMAGE_PUSH"
echo OCI_REGISTRY_NAMESPACE="$OCI_REGISTRY_NAMESPACE"

if [ -z "${GITHUB_REF:-}" ]; then
    VERSION=$(git rev-parse --short HEAD)
else
    VERSION="$GITHUB_REF"
    VERSION=${VERSION##*/v}  # for tags
    VERSION=${VERSION##*/}  # for branches/PRs/local-testing
fi

# Check if the plugins directory exists
if [ ! -d "$pluginsDir" ]; then
  echo "The directory $pluginsDir does not exist."
  exit 1
fi

# Create a tarball named pack.tar.gz
echo "Creating a tarball of the current directory as pack.tar.gz..."
git archive HEAD -o pack.tar.gz
echo "Tarball pack.tar.gz created."

# Extract the tarball into a directory called ansible-backstage-plugins-source-code-$VERSION
echo "Creating directory $sourcePackDir-$VERSION and extracting pack.tar.gz into it..."
mkdir $sourcePackDir-$VERSION && tar -xzf pack.tar.gz -C $sourcePackDir-$VERSION/
echo "Extraction complete. Contents now in $sourcePackDir-$VERSION."

# Repack the directory with the desired name ansible-backstage-plugins-source-code-$VERSION.tar.gz
echo "Repacking the directory $sourcePackDir-$VERSION into a new tarball ${sourcePackDir}-$VERSION.tar.gz..."
tar -czvf $sourcePackDir-$VERSION.tar.gz -C $(dirname $sourcePackDir-$VERSION) $(basename $sourcePackDir-$VERSION)
echo "Tarball ${sourcePackDir}-$VERSION.tar.gz created."

# Clean up the original pack.tar.gz and the extracted directory
echo "Cleaning up: Removing pack.tar.gz and the directory $sourcePackDir-$VERSION..."
rm -rf pack.tar.gz $sourcePackDir-$VERSION
echo "Cleanup complete."

# End processing source tar

# Create the pack destination directory
mkdir -p "$packDestination"

# Move source code tar to the pack destination directory
mv $sourcePackDir-$VERSION.tar.gz "$packDestination"

# Loop through each subdirectory in the ./plugins directory
for pluginDir in "$pluginsDir"/*; do
  if [ -d "$pluginDir" ]; then
    pluginName=$(basename "$pluginDir")
    if [ "$pluginName" == "backstage-rhaap-common" ]; then
      continue
    fi
    .github/actions/pack/pack_one.sh "$pluginDir"
  fi
done

echo "Completed processing all plugin directories."

# Create the final pack directory if it doesn't exist
mkdir -p "$finalPackDir"

# Create a tarball of the dynamic-plugins-archives directory
tarballName="ansible-backstage-rhaap-bundle-$VERSION.tar.gz"
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
