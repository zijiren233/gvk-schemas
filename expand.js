const _ = require("lodash");
const {
  fetchOpenApiV3,
  applyRequestOptions,
  getSchemaKey,
  splitGroupVersion,
  getApiPathWithGroupVersion,
  fetchApiResource,
} = require("./utils");
const $RefParser = require("@apidevtools/json-schema-ref-parser");
const {
  openapiSchemaToJsonSchema: toJsonSchema,
} = require("@openapi-contrib/openapi-schema-to-json-schema");
const { writeFileSync } = require("fs");

const refToRelativePath = (schema) => {
  const traverse = (obj) => {
    if (typeof obj !== "object" || obj === null) {
      return;
    }

    if (obj.$ref && typeof obj.$ref === "string") {
      obj.$ref = obj.$ref.replace("#/components/schemas/", "./") + ".json";
    }

    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        traverse(obj[key]);
      }
    }
  };

  traverse(schema);
  return schema;
};

const writeSchemas = (schemas) => {
  for (const [key, value] of Object.entries(schemas)) {
    writeFileSync(
      `./schemas/${key}.json`,
      JSON.stringify(refToRelativePath(value), null, 2)
    );
  }
};

// const removeXKubernetesFields = (schema) => {
//   const traverse = (obj) => {
//     if (typeof obj !== "object" || obj === null) {
//       return;
//     }

//     for (let key in obj) {
//       if (Object.prototype.hasOwnProperty.call(obj, key)) {
//         if (key.startsWith("x-kubernetes-")) {
//           delete obj[key];
//         } else {
//           traverse(obj[key]);
//         }
//       }
//     }
//   };

//   traverse(schema);
//   return schema;
// };

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

  writeSchemas(apiResource.components.schemas);

  const entrypoint = getSchemaKey(
    apiResource.components.schemas,
    version,
    kind
  );

  const schema = await $RefParser.dereference(`./schemas/${entrypoint}.json`, {
    dereference: {
      circular: "ignore",
    },
  });

  // return toJsonSchema(schema, { dateToDateTime: true });
  return schema;
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
  expand("networking.k8s.io/v1", "Ingress");
  console.log(data);
};

if (require.main === module) {
  main();
}
