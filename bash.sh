curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/openapi/v2" >openapiv2.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/openapi/v3" >openapiv3.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/api" >api.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    -H "Accept: application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/apis" >apis.json
