/**
 * Encrypts a plaintext string using an RSA-OAEP public key (SHA-1, matching PHP's
 * OPENSSL_PKCS1_OAEP_PADDING default). Returns a base64-encoded ciphertext.
 */
export async function encryptRSA(publicKeyPem: string, plaintext: string): Promise<string> {
    const pemBody = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s+/g, '');

    const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const key = await window.crypto.subtle.importKey(
        'spki',
        binaryDer.buffer,
        { name: 'RSA-OAEP', hash: 'SHA-1' },
        false,
        ['encrypt'],
    );

    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);

    const bytes = new Uint8Array(encrypted);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}
