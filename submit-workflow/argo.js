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
                        "gdi fetch-resource --client-id {{inputs.parameters.client-id}} --client-secret {{inputs.parameters.client-secret}} --role {{inputs.parameters.role}} --resource-id {{inputs.parameters.resource-id}} --save-object {{inputs.parameters.save-object}} --config-path {{inputs.parameters.config-path}} |  tee /result.txt; ( exit ${PIPESTATUS[0]} )"
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
                name: "create-buffer",
                inputs: {
                    parameters: [
                        { name: "client-id" },
                        { name: "artifact-url" },
                        { name: "buffer-distance" },
                        { name: "store-artifact" },
                        { name: "config" },
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
                        "gdi create-buffer --config {{inputs.parameters.config}} --client-id {{inputs.parameters.client-id}} --artifact-url {{inputs.parameters.artifact-url}} --buffer-d {{inputs.parameters.buffer-distance}} --store-artifact  {{inputs.parameters.store-artifact}} |  tee /result.txt; ( exit ${PIPESTATUS[0]} )"
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
                name: "create-intersection",
                inputs: {
                    parameters: [
                        { name: "config" },
                        { name: "client-id" },
                        { name: "artifact-url1" },
                        { name: "artifact-url2" },
                        { name: "store-artifact" },
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
                        "gdi create-intersection --config {{inputs.parameters.config}} --client-id {{inputs.parameters.client-id}} --artifact-url-1 {{inputs.parameters.artifact-url1}} --artifact-url-2 {{inputs.parameters.artifact-url2}} --store-artifact  {{inputs.parameters.store-artifact}} |  tee /result.txt; ( exit ${PIPESTATUS[0]} )"
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
function bufferJob(node, templateName) {
    return {
        name: node.name,
        template: templateName,
        dependencies: node.depends,
        arguments: {
            parameters: [...node.args, { name: "artifact-url", value: `{{tasks.${node.depends[0]}.outputs.result}}` }]
        }
    };

}
function intersectionJob(node, templateName) {
    return {
        name: node.name,
        template: templateName,
        dependencies: node.depends,
        arguments: {
            parameters: [...node.args, { name: "artifact-url1", value: `{{tasks.${node.depends[0]}.outputs.result}}` }, { name: "artifact-url2", value: `{{tasks.${node.depends[1]}.outputs.result}}` }]
        }
    };

}
const nameToCommand = {
    dataset: "fetch-resource",
    buffer: "create-buffer",
    'download-artifact': 'download-artifact',
    intersection: 'create-intersection'
}
export function generate_argo_workflow(name, nodes_payload) {
    argo_workflow.metadata.name = name;

    const dagTasks = nodes_payload.map(node => {
        const templateName = nameToCommand[node.type]
        console.log(templateName)


        if (node.type === "dataset") {
            return datasetJob(node, templateName)
        } else if (node.type === "download-artifact") {
            return downloadArtifactJob(node, templateName)
        } else if (node.type === "buffer") {
            return bufferJob(node, templateName)
        } else if (node.type === "intersection") {
            return intersectionJob(node, templateName)
        } else {
            throw new Error("Not supported type")
        }
    });

    const dagTemplate = argo_workflow.spec.templates.find(t => t.name === 'main-dag');
    dagTemplate.dag.tasks = dagTasks;

    return argo_workflow;
}
