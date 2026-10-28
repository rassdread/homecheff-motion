# Certificate configuration

`mkcert` is not installed, and `mkcert -install` needs an interactive password. Next was given an existing key and certificate, so it did not generate one and did not modify `.gitignore`.

The files are outside the repository:

- `/tmp/homecheff-v2732-certs/127.0.0.1-key.pem` (mode 600)
- `/tmp/homecheff-v2732-certs/127.0.0.1.pem`

They were created with OpenSSL as a two-day self-signed certificate.

- Subject: `CN=127.0.0.1`
- Subject Alternative Name: `IP Address:127.0.0.1`, `DNS:localhost`
- SHA-256 fingerprint: `88:02:B2:66:E3:2B:FE:D3:CC:47:D6:BF:0D:D8:D6:EF:61:C6:EE:A0:DE:D6:74:27:8D:F7:F6:E9:5E:9E:7D:25`

`openssl s_client` to `127.0.0.1:3456` presented that same fingerprint.

Node TLS with the system trust store failed: `DEPTH_ZERO_SELF_SIGNED_CERT`. The same handshake succeeded when this certificate was passed as the trust anchor. The certificate is not installed in the system trust store.

The original browser script already sets `ignoreHTTPSErrors: true` on its Playwright context. That exception is limited to that local Chromium process. It is not a global browser or production TLS change. The certificate identity was checked separately, as above. This is not a publicly trusted HTTPS deployment.

The private key was not committed and is not served by the application.
