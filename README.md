# Legacy Backend

...

A **React Native** Legacy mobile app

## Install Node 20 lts

```
nvm install 20 --lts
nvm list (copy the 20 lts)
nvm use 20.x.x
```

## Run in dev

- sudo systemctl start mongod
- npm run dev
- npm run watch

## Copy files to the emulator

adb push myfile.txt /sdcard/Download/

## Config an run debugger

- add to tsconfig "sourceMap": true
- Select Run/Add Configuration/NodeJS Launch Program
- Open launch.json and add the following lines:
  "outFiles": ["${workspaceFolder}/**/*.js"],
  "preLaunchTask": "tsc: build - tsconfig.json"
- npm run watch

## Docker command for developers

Portainer (Docker container management UI)
https://{PORTAINER_IP}:9443

Build and run

```
docker-compose build --no-cache
docker-compose up -d

```

Remove all containers and Images

```

docker-compose stop
docker-compose rm -f
docker rmi -f $(docker images -q 'nodejs-client') $(docker images -q 'nginx-client')

```

## Mongo DB Server:

- Instalar MongoDB communitty server
- sudo systemctl start mongod

## Mongo DB UI client:

- Install MongoDB Compass
- MongoDB Compass connection string: mongodb://{USERNAME}:{PASSWORD}@localhost:27017/

- Prod: mongodb://root:example@216.238.104.200:27017/legacy?authSource=admin
- root:example estão no docker-compose: MONGO_INITDB_ROOT_USERNAME:MONGO_INITDB_ROOT_PASSWORD

## SSH

Criar usuário admin no servidor

- Conectar no servidor legacy-backend como root
- adduser admin
- usermod -aG sudo admin (adicionar admin pro sudo)
- mkdir -m 700 ~/.ssh

Criar RSA no cliente

- ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
- copie a chave rsa publica para authorized_keys do servidor

## Troubleshooting

- to recognize typings.d.ts, add this header to index.ts
- /// <reference path="./types/typing.d.ts" />

```

```
