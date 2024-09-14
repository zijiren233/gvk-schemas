const _ = require("lodash");
const {
  fetchOpenApiV3,
  fetchApiResource,
  getSchemaKey,
  splitGroupVersion,
  getApiPathWithGroupVersion,
} = require("./utils");

const resolveRefName = (name) => {
  return name.replace("#/components/schemas/", "");
};

const traverseSchema = (schemas, prop, refSchemas) => {
  if (prop.allOf) {
    prop.allOf.forEach((ref) => {
      if (ref.$ref) {
        ref.$ref = resolveRefName(ref.$ref);
        collectSchema(schemas, ref.$ref, refSchemas);
      } else {
        traverseSchema(schemas, ref, refSchemas);
      }
    });
  } else if (prop.oneOf) {
    prop.oneOf.forEach((ref) => {
      if (ref.$ref) {
        ref.$ref = resolveRefName(ref.$ref);
        collectSchema(schemas, ref.$ref, refSchemas);
      } else {
        traverseSchema(schemas, ref, refSchemas);
      }
    });
  } else if (prop.anyOf) {
    prop.anyOf.forEach((ref) => {
      if (ref.$ref) {
        ref.$ref = resolveRefName(ref.$ref);
        collectSchema(schemas, ref.$ref, refSchemas);
      } else {
        traverseSchema(schemas, ref, refSchemas);
      }
    });
  } else if (prop.not) {
    if (prop.not.$ref) {
      prop.not.$ref = resolveRefName(prop.not.$ref);
      collectSchema(schemas, prop.not.$ref, refSchemas);
    } else {
      traverseSchema(schemas, prop.not, refSchemas);
    }
  } else if (prop.items) {
    if (prop.items.$ref) {
      prop.items.$ref = resolveRefName(prop.items.$ref);
      collectSchema(schemas, prop.items.$ref, refSchemas);
    } else {
      traverseSchema(schemas, prop.items, refSchemas);
    }
  } else if (prop.$ref) {
    prop.$ref = resolveRefName(prop.$ref);
    collectSchema(schemas, prop.$ref, refSchemas);
  } else if (prop.properties) {
    Object.entries(prop.properties).forEach(([propName, subProp]) => {
      traverseSchema(schemas, subProp, refSchemas);
    });
  } else if (prop.additionalProperties) {
    // TODO: additionalProperties ref
    // if (prop.additionalProperties.type === "object") {
    //   traverseSchema(schemas, prop.additionalProperties, refSchemas);
    // }
  }
};

// https://openapi.apifox.cn/#schema-%E5%AF%B9%E8%B1%A1
const collectSchema = (schemas, schemaName, refSchemas = {}) => {
  if (refSchemas[schemaName]) {
    return refSchemas;
  }
  if (!schemas[schemaName]) {
    console.error(`错误：找不到 schema：${schemaName}`);
    return refSchemas;
  }
  const schema = _.cloneDeep(schemas[schemaName]);
  refSchemas[schemaName] = schema;

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propName, prop]) => {
      traverseSchema(schemas, prop, refSchemas);
    });
  }

  return refSchemas;
};

const collect = async (apiVersion, kind) => {
  const { group, version } = splitGroupVersion(apiVersion);
  const apiPath = getApiPathWithGroupVersion(group, version);

  const openApiSpec = await fetchOpenApiV3();
  const path = openApiSpec.paths[apiPath];
  if (!path) {
    throw new Error(
      `错误：找不到 ${apiVersion}/${kind} API 资源路径: ${apiPath}`
    );
  }
  const apiResourcePath = path.serverRelativeURL;
  if (!apiResourcePath) {
    throw new Error(
      `错误：找不到 ${apiVersion}/${kind} API serverRelativeURL 资源路径: ${path}`
    );
  }
  const apiResource = await fetchApiResource(apiResourcePath);

  const entrypoint = getSchemaKey(
    apiResource.components.schemas,
    version,
    kind
  );
  const expandedSchema = collectSchema(
    apiResource.components.schemas,
    entrypoint
  );
  return {
    entrypoint,
    schemas: expandedSchema,
  };
};

module.exports = {
  collect,
};

// collect('app.sealos.io/v1', 'App');
// collect("networking.k8s.io/v1", "Ingress");
// collect('account.sealos.io/v1', 'Transfer');
// collect('apps/v1', 'Deployment');
// collect("v1", "Pod");

const main = async () => {
  const data = await collect("networking.k8s.io/v1", "Ingress");
  console.log(data);
};

if (require.main === module) {
  main();
}
