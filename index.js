const { collect } = require("./collect");
const { expand } = require("./expand");
const { fetchAllResources } = require("./utils");

const main = async () => {
    const resources = await fetchAllResources();
    resources.forEach(resource => {
        console.log(resource);
        collect(resource.APIVERSION, resource.KIND);
        expand(resource.APIVERSION, resource.KIND);
    });
};

main();