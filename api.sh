curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/openapi/v2" >resp/openapiv2.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/openapi/v3" >resp/openapiv3.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/api" >resp/api.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    -H "Accept: application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/apis" >resp/apis.json

curl -k -H "Authorization: Bearer $(yq e '.users[0].user.token' ~/.kube/config)" \
    -H "Accept: application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json" \
    "$(yq e '.clusters[0].cluster.server' ~/.kube/config)/openapi/v3/apis/apiextensions.k8s.io/v1?hash=5C54327473517BF525613FAD569F7A0AB999E68C101369CD50DBCCB39DB98DE9FCAF0B0DB26E41690F96E4CE63B7D7B45CC3FDE89DD7A30478B8E3CECF67434E" >resp/apiextensions.k8s.io.v1.json