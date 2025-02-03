const argo_workflow = {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Workflow',
    metadata: {
        namespace: "argo",
        name: ""
    },
    spec: {
        entrypoint: "main-dag",
        templates: [
            {
                name: "fetch-resource",
                inputs: {
                    parameters: [
                        { name: "client-id" },
                        { name: "client-secret" },
                        { name: "role" },
                        { name: "resource-id" },
                        { name: "save-object" },
                        { name: "config-path" },
                        { name: "file-path" }
                    ]
                },
                outputs: {
                    parameters: [
                        {
                            name: "result",
                            valueFrom: {
                                path: "/result.txt"
                            }
                        }
                    ]
                },
                container: {
                    image: "gdi-cli:latest",
                    command: ["bash", "-c"],
                    imagePullPolicy: "Never",
                    args: [
                        "gdi fetch-resource --client-id {{inputs.parameters.client-id}} --client-secret {{inputs.parameters.client-secret}} --role {{inputs.parameters.role}} --resource-id {{inputs.parameters.resource-id}} --save-object {{inputs.parameters.save-object}} --config-path {{inputs.parameters.config-path}} --file-path {{inputs.parameters.file-path}} |  tee /result.txt; ( exit ${PIPESTATUS[0]} )"
                    ],
                    resources: {
                        limits: {
                            memory: "2Gi",
                            cpu: "2"
                        },
                    }
                }
            },
            {
                name: "download-artifact",
                inputs: {
                    parameters: [
                        { name: "config" },
                        { name: "client-id" },
                        { name: "artifact-url" },
                        { name: "save-as" }
                    ]
                },
                container: {
                    image: "gdi-cli:latest",
                    command: ["gdi", "download-artifact"],
                    imagePullPolicy: "Never",
                    args: [
                        "--config", "{{inputs.parameters.config}}",
                        "--client-id", "{{inputs.parameters.client-id}}",
                        "--artifact-url", "{{inputs.parameters.artifact-url}}",
                        "--save-as", "{{inputs.parameters.save-as}}"
                    ],
                    resources: {
                        limits: {
                            memory: "2Gi",
                            cpu: "2"
                        }
                    }
                }
            },
            {
                name: "main-dag",
                dag: {
                    tasks: []
                }
            }
        ]
    }
};

function datasetJob(node, templateName) {
    return {
        name: node.name,
        template: templateName,
        arguments: {
            parameters: node.args,
        }
    };

}
function downloadArtifactJob(node, templateName) {
    return {
        name: node.name,
        template: templateName,
        dependencies: node.depends,
        arguments: {
            parameters: [...node.args, { name: "artifact-url", value: `{{tasks.${node.depends[0]}.outputs.result}}` }]
        }
    };


}
export function generate_argo_workflow(name, nodes_payload) {
    argo_workflow.metadata.name = name;

    const dagTasks = nodes_payload.map(node => {
        const templateName = node.type === 'dataset' ?
            'fetch-resource' :
            'download-artifact';

        node.args = node.args.map(arg => ({
            name: arg.name,
            value: typeof arg.value === "boolean" ? String(arg.value) : arg.value
        }));
        if (node.depends.length === 0 && node.name === "download-artifact") {
            throw new Error("download artifact should be depended some node to download the artifact")
        }
        if (node.type === "dataset") {
            return datasetJob(node, templateName)
        } else if (node.type == "download-artifact") {
            return downloadArtifactJob(node, templateName)
        } else {
            throw new Error("Not supported type")
        }
    });

    // Update DAG template with tasks
    const dagTemplate = argo_workflow.spec.templates.find(t => t.name === 'main-dag');
    dagTemplate.dag.tasks = dagTasks;

    return argo_workflow;
}


