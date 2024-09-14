const _ = require("lodash");
const {
  fetchOpenApiV3,
  fetchApiResource,
  getSchemaKey,
  splitGroupVersion,
  getApiPathWithGroupVersion,
} = require("./utils");

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
  return _.cloneDeep(currentSchema);
};

const traverseSchema = (schemas, schema) => {
  if (schema.allOf) {
    schema.allOf = schema.allOf.map((item) =>
      item.$ref
        ? traverseSchema(schemas, resolveRef(schemas, item.$ref))
        : traverseSchema(schemas, item)
    );
  } else if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map((item) =>
      item.$ref
        ? traverseSchema(schemas, resolveRef(schemas, item.$ref))
        : traverseSchema(schemas, item)
    );
  } else if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map((item) =>
      item.$ref
        ? traverseSchema(schemas, resolveRef(schemas, item.$ref))
        : traverseSchema(schemas, item)
    );
  } else if (schema.not) {
    schema.not = schema.not.$ref
      ? traverseSchema(schemas, resolveRef(schemas, schema.not.$ref))
      : traverseSchema(schemas, schema.not);
  }

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propName, prop]) => {
      if (prop.$ref) {
        schema.properties[propName] = traverseSchema(
          schemas,
          resolveRef(schemas, prop.$ref)
        );
      } else if (prop.items) {
        schema.properties[propName].items = prop.items.$ref
          ? traverseSchema(schemas, resolveRef(schemas, prop.items.$ref))
          : traverseSchema(schemas, prop.items);
      } else {
        schema.properties[propName] = traverseSchema(schemas, prop);
      }
    });
  }

  // TODO: additionalProperties ref
  // if (schema.additionalProperties) {
  //   if (schema.additionalProperties.type === "object") {
  //     schema.additionalProperties = schema.additionalProperties.$ref
  //       ? traverseSchema(
  //           schemas,
  //           resolveRef(schemas, schema.additionalProperties.$ref)
  //         )
  //       : traverseSchema(schemas, schema.additionalProperties);
  //   }
  // }

  return schema;
};

// https://openapi.apifox.cn/#schema-%E5%AF%B9%E8%B1%A1
const expandSchema = (schemas, schema) => {
  return traverseSchema(schemas, _.cloneDeep(schema));
};

const getSchemaForKey = (schemas, version, kind) => {
  const entrypoint = getSchemaKey(schemas, version, kind);
  return schemas[entrypoint];
};

const expand = async (apiVersion, kind) => {
  const { group, version } = splitGroupVersion(apiVersion);
  const apiPath = getApiPathWithGroupVersion(group, version);

  const openApiSpec = await fetchOpenApiV3();
  const path = openApiSpec.paths[apiPath];
  if (!path) {
    throw new Error(
      `错误：找不到 ${apiVersion}/${kind}API 资源路径: ${apiPath}`
    );
  }
  const apiResourcePath = path.serverRelativeURL;
  if (!apiResourcePath) {
    throw new Error(
      `错误：找不到 ${apiVersion}/${kind} API serverRelativeURL 资源路径: ${path}`
    );
  }
  const apiResource = await fetchApiResource(apiResourcePath);

  const schema = getSchemaForKey(apiResource.components.schemas, version, kind);
  return await expandSchema(apiResource.components.schemas, schema);
};

module.exports = {
  expand,
};

// expand('app.sealos.io/v1', 'App');
// expand("networking.k8s.io/v1", "Ingress");
// expand('account.sealos.io/v1', 'Transfer');
// expand('apps/v1', 'Deployment');
// expand("v1", "Pod");

const main = async () => {
  const data = await expand("networking.k8s.io/v1", "Ingress");
  console.log(data);
};

if (require.main === module) {
  main();
}
