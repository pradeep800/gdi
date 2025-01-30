condition
loop
dependency



condition ---> condition 1 
          |
          ---> condition 2 
          |
           ---> condition 3 
          .....

Type of nodes
## sdk node
it will give output gdi as data
### fields 
- client_id 
- client_password 

## spec
it for specifying any initial parameters 

## conditional node
#### fields
- when
- docker-image-name

## loop
#### fields
there will be 2 things to toggle from `withSequence` and `withParams` 
- docker-image-name


loop can iterate with counts and items
1. count
```
        withSequence:
          count: "5"
```

2. item
- using params
```
arguments:
    parameters:
    - name: os-list                                     # a list of items
      value: |
        [
          { "image": "debian", "tag": "9.1" },
          { "image": "debian", "tag": "8.9" },
          { "image": "alpine", "tag": "3.6" },
          { "image": "ubuntu", "tag": "17.10" }
        ]
withParam: "{{inputs.parameters.os-list}}"

```

- use individual  
```
 withItems:
        - { image: 'debian', tag: '9.1' }       #item set 1
        - { image: 'debian', tag: '8.9' }       #item set 2
        - { image: 'alpine', tag: '3.6' }       #item set 3
        - { image: 'ubuntu', tag: '17.10' }     #item set 4
```

- use from another step
```
  withParam: "{{steps.generate.outputs.result}}"
```

