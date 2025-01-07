#!/bin/bash
git status
read -p "Check status, Ctrl+C to stop, Enter to continue..." blabla
echo -e '\n\n\n========================================= catalog-backend-module-rhaap'
./.github/actions/pack/pack_one.sh plugins/catalog-backend-module-rhaap
echo -e '\n\n\n========================================= scaffolder-backend-module-backstage-rhaap'
./.github/actions/pack/pack_one.sh plugins/scaffolder-backend-module-backstage-rhaap
echo -e '\n\n\n========================================= wizard-catalog'
./.github/actions/pack/pack_one.sh plugins/wizard-catalog
