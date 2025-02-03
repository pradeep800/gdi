const { z } = require("zod")

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    config: z.string().min(1, "Config is required"),
    "client-id": z.string().min(1, "Client ID is required"),
    "save-as": z.string().min(1, "Save As is required"),
});
const isValidString = (str) => {
    const pattern = /^[a-zA-Z0-9-]+$/;
    return pattern.test(str);
}



module.exports = function(RED) {
    function GdiNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Store the configuration (e.g., name and class fields)
        node.name = config.name;

        const result = schema.safeParse(config);

        if (!result.success) {
            console.log(result.error.format()); // Gives detailed field-wise errors
            node.status({ fill: "red", shape: "dot", text: `fields are missing` });
            return;
        }
        // Use the dynamically configured values from the frontend
        const name = node.name

        if (!isValidString(name)) {
            node.status({ fill: "red", shape: "dot", text: `node name only contain a-z, A-Z, 0-9, - and _` });
            return;
        }
        const args = Object.entries(result.data)
            .map(([name, value]) => ({ name, value }));


        // nodes are taking time to registry there event so waiting for 1s to send event
        node.on("input", (msg) => {
            msg.payload.push({
                type: "download-artifact",
                name: name,
                depends: [msg.payload[msg.payload.length - 1].name],
                args: args
            })
            node.send(msg);
        })

        node.status({ fill: "green", shape: "dot", text: `successfully published` });
    }
    // Register the node with Node-RED
    RED.nodes.registerType("download-artifact", GdiNode);
}
