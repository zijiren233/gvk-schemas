// utils.js
const k8s = require("@kubernetes/client-node");
const request = require("request");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const cluster = kc.getCurrentCluster();
if (!cluster) {
  throw new Error("No currently active cluster");
}

const fetchOpenApiSpec = async () => {
  const requestOptions = {
    method: "GET",
    uri: `${cluster.server}/openapi/v3`,
  };
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

const fetchApiResource = async (path) => {
  const requestOptions = {
    method: "GET",
    uri: `${cluster.server}${path}`,
  };
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

const getSchemaKey = (schemas, version, kind) => {
  const indexKey = Object.keys(schemas).find((key) => {
    const parts = key.split(".");
    return parts[parts.length - 2] === version && parts[parts.length - 1] === kind;
  });

  if (!indexKey) {
    throw new Error(`错误：无效的版本和种类：${version}.${kind}`);
  }
  return indexKey;
};

module.exports = {
  fetchOpenApiSpec,
  fetchApiResource,
  getSchemaKey,
};
