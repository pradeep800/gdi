const isValidString = (str) => {
	const pattern = /^[a-zA-Z0-9_-]+$/;
	return pattern.test(str);
}
module.exports = function(RED) {

	function GdiNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		// Store the configuration (e.g., name and class fields)
		node.name = config.name;

		// Handle incoming messages
		node.on('input', function(msg) {
			// Use the dynamically configured values from the frontend
			const name = node.name

			if (!name) {
				node.status({ fill: "red", shape: "dot", text: `no name` });
				return;
			}
			if (!isValidString(name)) {
				node.status({ fill: "red", shape: "dot", text: `node name only contain a-z, A-Z, 0-9, - and _` });
				return;
			}
			if (!Array.isArray(msg.payload)) {
				msg.payload = []
			}
			let n = msg.payload.length;
			for (let i = 0; i < n; i++) {
				if (name === msg.payload[i].name) {
					node.status({ fill: "red", shape: "dot", text: `node with this name already present` });
					return;
				}

			}

			let depends = []
			if (n !== 0) {
				depends.push(msg.payload[n - 1].name)
			}
			msg.payload.push({
				type: "dataset",
				name: name,
				depends,
				args: []
			})
			node.send(msg);
			node.status({ fill: "green", shape: "dot", text: `successfully published` });
		});
	}

	// Register the node with Node-RED
	RED.nodes.registerType("dataset", GdiNode);
};
