const k8s = require("@kubernetes/client-node");
const request = require("request");
const _ = require("lodash");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const cluster = kc.getCurrentCluster();
if (!cluster) {
  throw new Error("No currently active cluster");
}

const fetchApiResource = async (path, options = {}) => {
  const requestOptions = {
    method: "GET",
    uri: `${cluster.server}${path}`,
  };
  _.merge(requestOptions, options);
  await kc.applyToRequest(requestOptions);
  return new Promise((resolve, reject) => {
    request(requestOptions, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
};

const fetchOpenApiV3 = async () => {
  return fetchApiResource("/openapi/v3");
};

const fetchApis = async () => {
  return fetchApiResource("/apis", {
    headers: {
      Accept:
        "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json",
    },
  });
};

const fetchAllResources = async () => {
  const apis = await fetchApis();
  return apis.items.flatMap((group) => {
    return group.versions.flatMap((version) => {
      return version.resources.map((resource) => ({
        NAME: resource.resource,
        SHORTNAMES: resource.shortNames ? resource.shortNames.join(",") : "",
        APIVERSION: `${group.metadata.name}/${version.version}`,
        NAMESPACED: resource.scope === "Namespaced",
        KIND: resource.responseKind.kind,
      }));
    });
  });
};

const getSchemaKey = (schemas, version, kind) => {
  const indexKey = Object.keys(schemas).find((key) => {
    const parts = key.split(".");
    return (
      parts[parts.length - 2] === version && parts[parts.length - 1] === kind
    );
  });

  if (!indexKey) {
    throw new Error(`错误：无效的版本和种类：${version}.${kind}`);
  }
  return indexKey;
};

module.exports = {
  fetchApiResource,
  fetchOpenApiV3,
  fetchApis,
  fetchAllResources,
  getSchemaKey,
};
