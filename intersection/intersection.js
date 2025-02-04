const { z } = require("zod")
const isValidString = (str) => {
	const pattern = /^[a-zA-Z0-9_-]+$/;
	return pattern.test(str);
}

const schema = z.object({
	name: z.string().default(''),
	config: z.string(),
	'client-id': z.string(),
	'store-artifact': z.string(),
});
module.exports = function(RED) {
	function GdiNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		node.name = config.name;
		let nodes_payload = []
		let depends = []
		const name = node.name;

		if (!name) {
			node.status({ fill: "red", shape: "dot", text: `no name` });
			return;
		}
		if (!isValidString(name)) {
			node.status({ fill: "red", shape: "dot", text: `node name only contain a-z, A-Z, 0-9, - and _` });
			return;
		}
		node.on('input', function(msg) {
			if (!Array.isArray(msg.payload)) {
				node.status({ fill: "red", shape: "dot", text: `unsupported` });
				return;
			}

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

			// Check for duplicate names
			let total_length = nodes_payload[0].length + nodes_payload[1].length;
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
			for (let nm of names) {
				if (name === nm) {
					node.status({ fill: "red", shape: "dot", text: `node with this name already present` });
					return;
				}
			}

			const result = schema.safeParse(config);

			if (!result.success) {
				console.log(result.error.format());
				node.status({ fill: "red", shape: "dot", text: `fields are missing` });
				return;
			}
			const args = Object.entries(result.data)
				.map(([name, value]) => ({ name, value }));

			// Map parameters to args
			msg.payload = [...nodes_payload[0], ...nodes_payload[1], {
				type: "intersection",
				name: name,
				depends,
				args
			}];

			node.send(msg);
			node.status({ fill: "green", shape: "dot", text: `successfully published` });
		});
	}

	// Register the node with Node-RED
	RED.nodes.registerType("intersection", GdiNode);
};
