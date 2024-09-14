const k8s = require("@kubernetes/client-node");
const { writeFileSync } = require("fs");
const request = require("request");
const _ = require("lodash");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const cluster = kc.getCurrentCluster();
if (!cluster) {
  throw new Error("No currently active cluster");
}

const resolveRef = (schemas, ref) => {
  const refPath = ref.replace("#/components/schemas/", "").split("/");
  let currentSchema = schemas;
  for (const path of refPath) {
    if (currentSchema && currentSchema[path]) {
      currentSchema = currentSchema[path];
    } else {
      throw new Error(`错误：找不到 schema：${ref}`);
    }
  }
  return currentSchema;
};

const traverseSchema = (schemas, schema) => {
  if (schema.allOf) {
    schema.allOf = schema.allOf.map((item) =>
      item.$ref ? traverseSchema(schemas, resolveRef(schemas, item.$ref)) : traverseSchema(schemas, item)
    );
    schema = Object.assign({}, ...schema.allOf);
    delete schema.allOf;
  } else if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map((item) =>
      item.$ref ? traverseSchema(schemas, resolveRef(schemas, item.$ref)) : traverseSchema(schemas, item)
    );
  } else if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map((item) =>
      item.$ref ? traverseSchema(schemas, resolveRef(schemas, item.$ref)) : traverseSchema(schemas, item)
    );
  } else if (schema.not) {
    schema.not = schema.not.$ref ? traverseSchema(schemas, resolveRef(schemas, schema.not.$ref)) : traverseSchema(schemas, schema.not);
  }

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propName, prop]) => {
      if (prop.$ref) {
        schema.properties[propName] = traverseSchema(schemas, resolveRef(schemas, prop.$ref));
      } else if (prop.items) {
        schema.properties[propName].items = prop.items.$ref
          ? traverseSchema(schemas, resolveRef(schemas, prop.items.$ref))
          : traverseSchema(schemas, prop.items);
      } else {
        schema.properties[propName] = traverseSchema(schemas, prop);
      }
    });
  }

  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'object') {
      schema.additionalProperties = schema.additionalProperties.$ref
        ? traverseSchema(schemas, resolveRef(schemas, schema.additionalProperties.$ref))
        : traverseSchema(schemas, schema.additionalProperties);
    }
  }

  return schema;
};

// https://openapi.apifox.cn/#schema-%E5%AF%B9%E8%B1%A1
const expandSchema = (schemas, schema) => {
  return traverseSchema(schemas, _.cloneDeep(schema));
};

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

const getSchemaForKey = (schemas, version, kind) => {
  const entrypoint = getSchemaKey(schemas, version, kind);
  return schemas[entrypoint];
};

const expand = async (apiVersion, kind) => {
  const [group, version] = apiVersion.includes("/")
    ? apiVersion.split("/")
    : ["", apiVersion];
  const path = group ? `apis/${group}/${version}` : `api/${version}`;

  try {
    const openApiSpec = await fetchOpenApiSpec();
    const apiResourcePath = openApiSpec.paths[path].serverRelativeURL;
    if (!apiResourcePath) {
      throw new Error(`错误：找不到 API 资源路径: ${path}`);
    }
    const apiResource = await fetchApiResource(apiResourcePath);

    writeFileSync("./resoult/schemas.json", JSON.stringify(apiResource.components.schemas, null, 2));

    const schema = getSchemaForKey(apiResource.components.schemas, version, kind);
    const expandedSchema = expandSchema(apiResource.components.schemas, schema);
    writeFileSync(
      `./resoult/${version}-${kind}.json`,
      JSON.stringify(expandedSchema, null, 2)
    );

  } catch (error) {
    console.error("发生错误:", error);
  }
};

// expand('app.sealos.io/v1', 'App');
expand('networking.k8s.io/v1', 'Ingress');
// expand('account.sealos.io/v1', 'Transfer');
// expand('apps/v1', 'Deployment');
// expand("v1", "Pod");
