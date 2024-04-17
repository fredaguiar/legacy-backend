# Legacy Backend

A **React Native** Legacy mobile app

## Run in dev

- npm run dev
- npm run watch

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
