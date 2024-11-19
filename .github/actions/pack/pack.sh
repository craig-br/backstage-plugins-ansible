#!/bin/bash

# Variables
pluginsDir="plugins"
packDestination="dynamic-plugins-archives"
finalPackDir="ansible-plugins-pack"
sourcePackDir="ansible-backstage-plugins-source-code"

# Check if the plugins directory exists
if [ ! -d "$pluginsDir" ]; then
  echo "The directory $pluginsDir does not exist."
  exit 1
fi

# Create source tar

# Create a tarball named pack.tar.gz
echo "Creating a tarball of the current directory as pack.tar.gz..."
tar -czf pack.tar.gz --exclude-vcs --exclude node_modules .
echo "Tarball pack.tar.gz created."

# Extract the tarball into a directory called ansible-backstage-plugins-source-code-${GITHUB_REF##*/v}
echo "Creating directory $sourcePackDir-${GITHUB_REF##*/v} and extracting pack.tar.gz into it..."
mkdir $sourcePackDir-${GITHUB_REF##*/v} && tar -xzf pack.tar.gz -C $sourcePackDir-${GITHUB_REF##*/v}/
echo "Extraction complete. Contents now in $sourcePackDir-${GITHUB_REF##*/v}."

# Repack the directory with the desired name ansible-backstage-plugins-source-code-${GITHUB_REF##*/v}.tar.gz
echo "Repacking the directory $sourcePackDir-${GITHUB_REF##*/v} into a new tarball ${sourcePackDir}-${GITHUB_REF##*/v}.tar.gz..."
tar -czvf $sourcePackDir-${GITHUB_REF##*/v}.tar.gz -C $(dirname $sourcePackDir-${GITHUB_REF##*/v}) $(basename $sourcePackDir-${GITHUB_REF##*/v})
echo "Tarball ${sourcePackDir}-${GITHUB_REF##*/v}.tar.gz created."

# Clean up the original pack.tar.gz and the extracted directory
echo "Cleaning up: Removing pack.tar.gz and the directory $sourcePackDir-${GITHUB_REF##*/v}..."
rm -rf pack.tar.gz $sourcePackDir-${GITHUB_REF##*/v}
echo "Cleanup complete."

# End processing source tar

# Create the pack destination directory
mkdir -p "$packDestination"

# Move source code tar to the pack destination directory
mv $sourcePackDir-${GITHUB_REF##*/v}.tar.gz "$packDestination"

# Loop through each subdirectory in the ./plugins directory
for pluginDir in "$pluginsDir"/*; do
  if [ -d "$pluginDir" ]; then
    .github/actions/pack/pack_one.sh "$pluginDir"
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
