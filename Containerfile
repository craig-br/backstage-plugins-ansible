FROM scratch
COPY . .
LABEL \
  description="Build packaging ansible-backstage-plugins on Konflux" \
  io.k8s.description="Build packaging ansible-backstage-plugins on Konflux" \
  summary="Konflux ansible-backstage-plugins" \
  io.k8s.display-name="Konflux Ansible Backstage plugins" \
  io.openshift.tags="konflux build ansible-backstage-plugins" \
  name="Konflux ansible-backstage-plugins" \
  com.redhat.component="ansible-backstage-plugins" \
  version="0.1" \
  distribution-scope="private" \
  url="https://github.com/ansible/ansible-backstage-plugins/" \
  vendor="Red Hat, Inc."