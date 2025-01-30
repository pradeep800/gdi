module.exports = function(RED) {
	function GdiNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		// Store the configuration (e.g., name and class fields)
		node.name = config.name;
		node.class = config.class;

		// Handle incoming messages
		node.on('input', function(msg) {
			// Use the dynamically configured values from the frontend
			const name = node.name || "No name set";
			const className = node.class || "No class set";

			// Send the values to the next node
			msg.payload = {
				name: name,
				class: className
			};
			node.send(msg);

			// Update the node status
			node.status({ fill: "green", shape: "dot", text: `Sent: ${name}, ${className}` });
		});
	}

	// Register the node with Node-RED
	RED.nodes.registerType("gdi-node", GdiNode);
};
