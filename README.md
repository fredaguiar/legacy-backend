# Legacy Backend

A **React Native** Legacy mobile app

## Run in dev

- npm run dev
- npm run watch

## Docker command for developers

Portainer (Docker container management UI)
https://{PORTAINER_IP}:9443

Build and run

```
docker-compose build --no-cache & docker-compose up -d
```

Remove all containers and Images

```
docker-compose stop
docker-compose rm -f
docker rmi -f $(docker images -q 'nodejs-client') $(docker images -q 'nginx-client')
```

## Mongo DB UI client:

- Install MongoDB Compass
- MongoDB Compass connection string: mongodb://{USERNAME}:{PASSWORD}@localhost:27017/

## Tech stach

- NodeJS, Typescript, MongoDB

## RSA

(not working though)

- Open **PuTTY Key Generator**
- Select RSA
- Number of bits should be 3072 bits or higher
- Save Public and Private Key (rsa.pub/rsa.ppk)
- The public key is ready to be used (it is already in pem format)
- pem format: -----BEGIN key ----- (key) -----END key-----
- The private key has to be converted to pem format
- In **PuTTY Key Generator**, click on _Conversion_ and _Export OpenSSH key_
- overwrite the private key. The key should be in pem format

## Troubleshooting

- to recognize typings.d.ts, add this header to index.ts
- /// <reference path="./types/typing.d.ts" />
