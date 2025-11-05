# Red Hat Portal Installer Collection

## Description

This Ansible collection provides roles and playbooks for building and deploying Red Hat Self-Service Automation Portal using bootc container images.

## Requirements

- ansible-core >= 2.15.0
- Red Hat Enterprise Linux 9.6 or later
- Podman and container-tools
- Active Red Hat subscription
- Ansible Automation Platform 2.5 or later

## Installation

This collection is distributed as part of the portal installer bundle and does not require separate installation.

## Roles

### ansible.portal_setup.preflight

Validates system prerequisites before building portal images.

### ansible.portal_setup.common

Provides shared utilities and generates configuration files from inventory variables.

### ansible.portal_setup.bootc_build

Builds the bootc container image using Podman.

### ansible.portal_setup.image_convert

Converts bootc container images to bootable disk formats (QCOW2, RAW, ISO, VMDK).

## Playbooks

### install.yml

Main orchestrator playbook that runs preflight checks, builds the bootc image, and converts it to specified disk formats.

### build_bootc.yml

Builds only the bootc container image.

### create_image.yml

Converts an existing bootc image to disk formats.

## Usage

See the root README.md in the installer bundle for complete usage instructions.

## License

Apache-2.0

## Author

Red Hat, Inc.


