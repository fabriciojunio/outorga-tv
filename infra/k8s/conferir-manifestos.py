# -*- coding: utf-8 -*-
"""Confere os manifestos do Kubernetes antes de alguém aplicar.

Mesmo conferidor da Vitrine Bauru, adaptado: o YAML pode ser válido e ainda
assim estar quebrado, com um Service que não acha pod, uma chave de Secret
que não existe ou um volume que ninguém declarou. Nenhuma ferramenta de
esquema pega isso. Roda sem cluster e sem kubectl, então vale no CI.
"""
import glob
import os
import sys

try:
    import yaml
except ImportError:
    print('pyyaml não está instalado: pip install pyyaml')
    sys.exit(2)

PASTA = os.path.dirname(os.path.abspath(__file__))

documentos = []
for caminho in sorted(glob.glob(os.path.join(PASTA, '*.yaml'))):
    with open(caminho, encoding='utf-8') as arquivo:
        for doc in yaml.safe_load_all(arquivo):
            if doc:
                documentos.append((os.path.basename(caminho), doc))

erros = []


def de(tipo):
    return [(a, d) for a, d in documentos if d.get('kind') == tipo]


rotulos = {
    d['spec']['selector']['matchLabels'].get('app.kubernetes.io/name'): d['metadata']['name']
    for _, d in de('Deployment')
}

for arq, d in de('Service'):
    rotulo = d['spec']['selector'].get('app.kubernetes.io/name')
    if rotulo not in rotulos:
        erros.append('%s: o Service %s aponta para %s, que nenhum Deployment tem'
                     % (arq, d['metadata']['name'], rotulo))

for arq, d in de('NetworkPolicy'):
    rotulo = d['spec']['podSelector']['matchLabels'].get('app.kubernetes.io/name')
    if rotulo not in rotulos:
        erros.append('%s: a NetworkPolicy %s protege %s, que não existe' % (arq, d['metadata']['name'], rotulo))

chaves = {d['metadata']['name']: set((d.get('stringData') or {})) for _, d in de('Secret')}
pvcs = {d['metadata']['name'] for _, d in de('PersistentVolumeClaim')}

for arq, d in de('Deployment'):
    nome = d['metadata']['name']
    pod = d['spec']['template']['spec']
    volumes = {v['name']: v for v in pod.get('volumes', [])}

    for v in volumes.values():
        pvc = (v.get('persistentVolumeClaim') or {}).get('claimName')
        if pvc and pvc not in pvcs:
            erros.append('%s: o volume %s pede o PVC %s, que não está declarado' % (arq, v['name'], pvc))

    if (pod.get('securityContext') or {}).get('runAsNonRoot') is not True:
        erros.append('%s: %s pode rodar como root' % (arq, nome))

    for c in pod['containers']:
        for var in c.get('env', []):
            ref = (var.get('valueFrom') or {}).get('secretKeyRef')
            if not ref:
                continue
            if ref['name'] not in chaves:
                erros.append('%s: %s pede o Secret %s, que não está declarado' % (arq, var['name'], ref['name']))
            elif ref['key'] not in chaves[ref['name']]:
                erros.append('%s: %s pede a chave %s do Secret %s' % (arq, var['name'], ref['key'], ref['name']))
        for montagem in c.get('volumeMounts', []):
            if montagem['name'] not in volumes:
                erros.append('%s: %s monta o volume %s, que não existe' % (arq, nome, montagem['name']))
        if 'livenessProbe' not in c or 'readinessProbe' not in c:
            erros.append('%s: %s sem liveness ou readiness' % (arq, nome))
        if not (c.get('resources', {}).get('limits', {}) or {}).get('memory'):
            erros.append('%s: %s sem teto de memória' % (arq, nome))
        seguranca = c.get('securityContext', {})
        if seguranca.get('readOnlyRootFilesystem') is not True:
            erros.append('%s: %s com raiz gravável' % (arq, nome))
        if seguranca.get('allowPrivilegeEscalation') is not False:
            erros.append('%s: %s permite escalar privilégio' % (arq, nome))
        if ':latest' in c.get('image', '') or ':' not in c.get('image', ''):
            erros.append('%s: %s sem versão fixa de imagem, que não dá para reverter' % (arq, nome))

    # SQLite é de um processo só: mais de uma réplica corromperia o acervo.
    if d['spec'].get('replicas', 1) != 1:
        erros.append('%s: %s com mais de uma réplica, e o SQLite do acervo não aguenta' % (arq, nome))

if erros:
    print('manifestos com problema:\n')
    for e in erros:
        print(' -', e)
    sys.exit(1)

print('manifestos conferidos: %d documentos, %d Deployments, nada solto' % (len(documentos), len(rotulos)))
