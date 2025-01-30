module.exports = function(RED) {

	function GdiNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		// Store the configuration (e.g., name and class fields)
		node.name = config.name;

		// Handle incoming messages
		node.on('input', function(msg) {
			// Use the dynamically configured values from the frontend
			const name = node.name || "No name set";
			const className = node.class || "No class set";

			if (Array.isArray(msg.payload)) {
				msg.payload = []
			}
			if (!name) {
				node.status({ fill: "red", shape: "dot", text: `no name` });
				return;
			}
			msg.payload.push({
				type: "dataset",
				name: name,
			})
			node.send(msg);
			node.status({ fill: "green", shape: "dot", text: `successfully published` });
		});
	}

	// Register the node with Node-RED
	RED.nodes.registerType("gdi-node", GdiNode);
};
