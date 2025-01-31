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
		let msg = {
			payload: []
		}
		let depends = []
		msg.payload.push({
			type: "dataset",
			name: name,
			depends,
			args: []
		})
		// nodes are taking time to registry there event so waiting for 1s to send event
		setTimeout(() => {
			node.send(msg);
		}, 1000)
		node.status({ fill: "green", shape: "dot", text: `successfully published` });
	}
	// Register the node with Node-RED
	RED.nodes.registerType("dataset", GdiNode);
};
