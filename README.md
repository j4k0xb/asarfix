# asarfix

Fixes/Decrypts asar archives protected by [asarmor](https://github.com/sleeyax/asarmor) and [asarbreak](https://github.com/relative/asarbreak).

```sh
npx asarfix app.asar -o out.asar
npx asar extract out.asar out
```

## Decryption

Asarmor uses AES-128-CBC to encrypt `.js` files in the asar archive.
The encryption key is stored in one of these binaries:

- electron-forge: `resources/app.asar.unpacked/.vite/build/main.node`
- electron-builder: `resources/app.asar.unpacked/dist/main.node`

```sh
npx asarfix app.asar -o out.asar -b <path to main.node>
```

The key may also be available in plaintext: `node_modules/asarmor/src/encryption/key.txt`.

## Bypass Debugging Protection

<https://github.com/sleeyax/asarmor/blob/2c91d08ba0a00d379d26e7dfb89aa0f1d3b8e05c/src/encryption/main.cpp#L172-L173>

It checks process.argv, but we can also debug by using the `NODE_OPTIONS=--inspect` environment variable.
