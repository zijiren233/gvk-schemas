const { collect } = require("./collect");
const { expand } = require("./expand");
const { fetchAllResources } = require("./utils");
const { writeFileSync } = require("fs");

const blackApiVersion = ["acme.yourcompany.com/v1alpha1"];

const main = async () => {
  const resources = await fetchAllResources();
  for (const resource of resources) {
    if (blackApiVersion.includes(resource.APIVERSION)) {
      continue;
    }
    console.log(resource);
    const cpllectData = await collect(resource.APIVERSION, resource.KIND);
    writeFileSync(
      `./collect/${resource.APIVERSION.replace("/", "-")}-${
        resource.KIND
      }.json`,
      JSON.stringify(cpllectData, null, 2)
    );

    // Warning: It may cause circular references and is not recommended.
    // const expandData = await expand(resource.APIVERSION, resource.KIND);
    // writeFileSync(
    //   `./expand/${resource.APIVERSION.replace("/", "-")}-${resource.KIND}.json`,
    //   JSON.stringify(expandData, null, 2)
    // );
  }
};

main();
