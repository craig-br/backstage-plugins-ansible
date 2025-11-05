=============================
Ansible Portal Setup Changelog
=============================

.. contents:: Topics

v1.0.0
======

Release Summary
---------------

Initial release of the Self-Service Automation Portal installer collection.

Major Changes
-------------

- Initial release of ansible.portal_setup collection
- Build bootable container (bootc) images for RHEL 9.6+
- Convert bootc images to multiple disk formats (QCOW2, VMDK, RAW, ISO)
- Integrated with Ansible Automation Platform 2.5 and 2.6
- Automated synchronization of AAP job templates, users, teams, and organizations
- Comprehensive preflight validation checks
- Day 2 operations support (upgrade, backup, restore, rollback)
- Offline/disconnected installation support
- Runtime configuration override capability

New Roles
---------

- ansible.portal_setup.preflight - System prerequisites validation
- ansible.portal_setup.common - Shared utilities and configuration generation
- ansible.portal_setup.bootc_build - Build bootc container images
- ansible.portal_setup.image_convert - Convert bootc to disk formats
- ansible.portal_setup.backup - Database backup operations
- ansible.portal_setup.restore - Database restore operations
- ansible.portal_setup.upgrade - Portal upgrade with rollback capability

New Playbooks
-------------

- install.yml - Full installation workflow
- build_bootc.yml - Build bootc container image only
- create_image.yml - Convert existing bootc image to disk formats
- upgrade.yml - Upgrade portal to new version
- backup.yml - Backup portal database
- restore.yml - Restore portal database from backup
- rollback.yml - Rollback to previous portal version
- bundle.yml - Create offline installation bundle

Known Issues
------------

- SSL/TLS termination must be handled at infrastructure layer (load balancer, reverse proxy)
- Collection requires Red Hat subscription for registry access
- Bootc image builder requires privileged container execution

