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
		let nodes_payload = []
		let depends = []

		// Handle incoming messages
		node.on('input', function(msg) {

			const name = node.name
			const align = config.align.toLowerCase()

			if (align !== "true" && align !== "false" && align != "none") {
				node.status({ fill: "red", shape: "dot", text: `align values can be true false and none` });
				return;
			}
			/*
			else {
				node.status({ text: "" });
			}
			*/
			if (!name) {
				node.status({ fill: "red", shape: "dot", text: `no name` });
				return;
			}
			if (!isValidString(name)) {
				node.status({ fill: "red", shape: "dot", text: `node name only contain a-z, A-Z, 0-9, - and _` });
				return;
			}
			if (!Array.isArray(msg.payload)) {
				node.status({ fill: "red", shape: "dot", text: `unsupported` });
				return;
			}

			//check if there is duplicate names



			//TODO: check name from both stream

			if (nodes_payload.length == 0) {
				nodes_payload.push(msg.payload)
				depends.push(msg.payload[msg.payload.length - 1].name)
				node.status({ fill: "blue", shape: "dot", text: `waiting for other` });
				return;
			} else if (nodes_payload.length == 1) {
				nodes_payload.push(msg.payload)
				depends.push(msg.payload[msg.payload.length - 1].name)
			} else if (nodes_payload.length >= 2) {
				node.status({ fill: "blue", shape: "dot", text: `this node can only get intersection of 2 nodes (if you have put 2 nodes try to redploy it)` });
				return;
			}

			let total_length = nodes_payload[0].length + nodes_payload[1].length
			let names = new Set();

			for (let i = 0; i < nodes_payload[0].length; i++) {
				names.add(nodes_payload[0][i].name)
			}
			for (let i = 0; i < nodes_payload[1].length; i++) {
				names.add(nodes_payload[1][i].name)
			}
			if (names.size != total_length) {
				node.status({ fill: "red", shape: "dot", text: `there is same name between 2 parallel nodes` });
				return
			}
			for (let nm in names) {
				if (name === nm) {
					node.status({ fill: "red", shape: "dot", text: `node with this name already present` });
					nodes_payload = []
					depends = []
					return;
				}

			}
			msg.payload = [...nodes_payload[0], ...nodes_payload[1], {
				type: "intersection",
				name: name,
				depends,
				args: [{ key: "align", value: align }]
			}]
			node.send(msg);
			node.status({ fill: "green", shape: "dot", text: `successfully published` });
		});
	}

	// Register the node with Node-RED
	RED.nodes.registerType("intersection", GdiNode);
};
